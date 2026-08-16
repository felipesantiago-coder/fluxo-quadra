import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMpSubscription } from '@/lib/mercadopago';
import { timingSafeEqual } from 'crypto';

/**
 * GET /api/cron/reconcile-mp
 *
 * Vercel Cron Job — executado uma vez por dia (Hobby plan).
 * Compara o status das assinaturas locais com o status no Mercado Pago.
 * Detecta:
 *  - Assinaturas locais 'active' mas canceladas/pausadas no MP
 *  - Assinaturas locais 'active' com preapproval que não existe mais no MP
 *  - Assinaturas locais 'active' mas com data_fim ja passou
 *
 * Segurança: apenas acessível via Vercel Cron ou ?secret=.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const querySecret = request.nextUrl.searchParams.get('secret');
  const providedSecret = authHeader?.replace('Bearer ', '') || querySecret;

  if (!cronSecret || !safeEqual(providedSecret || '', cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'MP not configured.' }, { status: 503 });
  }

  try {
    const supabase = createAdminClient();
    const agora = new Date();
    const agoraISO = agora.toISOString();
    const results = {
      checked: 0,
      synced_cancelled: 0,
      synced_paused: 0,
      synced_missing: 0,
      synced_expired: 0,
      errors: [] as string[],
    };

    // Buscar todas as assinaturas locais ativas que tem ID no MP
    const { data: activeSubs, error: fetchErr } = await supabase
      .from('assinaturas')
      .select('id, user_id, mercadopago_subscription_id, status, data_fim')
      .eq('status', 'active')
      .not('mercadopago_subscription_id', 'is', null);

    if (fetchErr) {
      console.error('[cron/reconcile-mp] Erro ao buscar assinaturas:', fetchErr);
      return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }

    if (!activeSubs || activeSubs.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'Nenhuma assinatura ativa com ID do MP para reconciliar.',
        ...results,
        checked_at: agoraISO,
      });
    }

    for (const sub of activeSubs) {
      results.checked++;
      const mpId = sub.mercadopago_subscription_id as string;

      try {
        const mpSub = await getMpSubscription(mpId) as unknown as Record<string, unknown>;
        const mpStatus = mpSub?.status as string;

        // Mapear status MP -> nosso status
        const statusMap: Record<string, string> = {
          cancelled: 'cancelled',
          paused: 'paused',
          // authorized/active = consistente, não precisa mudar
        };

        const newStatus = statusMap[mpStatus];

        if (newStatus) {
          const auditoria = `Reconciliado com Mercado Pago (status MP: ${mpStatus}) em ${agoraISO}.`;

          const { count, error: updateErr } = await supabase
            .from('assinaturas')
            .update({
              status: newStatus,
              motivo_cancelamento: newStatus === 'cancelled' ? auditoria : undefined,
              cancelado_em: newStatus === 'cancelled' ? agoraISO : undefined,
              proximo_ciclo_em: null,
              updated_at: agoraISO,
            })
            .eq('id', sub.id)
            .eq('status', 'active'); // CAS

          if (updateErr) {
            results.errors.push(`Sub ${sub.id}: erro ao atualizar.`);
            console.error(`[cron/reconcile-mp] Erro ao atualizar assinatura ${sub.id}:`, updateErr);
          } else if (count && count > 0) {
            if (newStatus === 'cancelled') results.synced_cancelled++;
            if (newStatus === 'paused') results.synced_paused++;

            await supabase
              .from('profiles')
              .update({ subscription_status: 'none' })
              .eq('id', sub.user_id);

            console.log(
              `[cron/reconcile-mp] Assinatura ${sub.id} atualizada: active -> ${newStatus} (MP: ${mpStatus})`
            );
          }
        }

        // Verificar data_fim localmente mesmo se MP diz active
        // (caso o cron de expiração ainda não rodou)
        if (!newStatus && sub.data_fim && new Date(sub.data_fim) <= agora) {
          const auditoria = `Expirada durante reconciliacao MP em ${agoraISO}. data_fim=${sub.data_fim}.`;

          const { count, error: updateErr } = await supabase
            .from('assinaturas')
            .update({
              status: 'expired',
              motivo_cancelamento: auditoria,
              proximo_ciclo_em: null,
              updated_at: agoraISO,
            })
            .eq('id', sub.id)
            .eq('status', 'active');

          if (!updateErr && count && count > 0) {
            results.synced_expired++;
            await supabase
              .from('profiles')
              .update({ subscription_status: 'none' })
              .eq('id', sub.user_id);

            console.log(`[cron/reconcile-mp] Assinatura ${sub.id} expirada (data_fim passou).`);
          }
        }
      } catch (mpErr: unknown) {
        const errMsg = mpErr instanceof Error ? mpErr.message : String(mpErr);

        // Detectar 404 de forma mais confiavel: status HTTP no erro
        const is404 =
          errMsg.includes('404') ||
          errMsg.includes('not_found') ||
          errMsg.includes('Not found') ||
          errMsg.includes('NOT_FOUND');

        if (is404) {
          console.warn(`[cron/reconcile-mp] Assinatura ${mpId} nao existe mais no MP.`);

          const { count, error: updateErr } = await supabase
            .from('assinaturas')
            .update({
              status: 'cancelled',
              motivo_cancelamento: `Preapproval ${mpId} nao existe mais no Mercado Pago (reconciliacao em ${agoraISO}).`,
              cancelado_em: agoraISO,
              proximo_ciclo_em: null,
              updated_at: agoraISO,
            })
            .eq('id', sub.id)
            .eq('status', 'active');

          if (!updateErr && count && count > 0) {
            results.synced_missing++;
            await supabase
              .from('profiles')
              .update({ subscription_status: 'none' })
              .eq('id', sub.user_id);
          }
        } else {
          results.errors.push(`Sub ${sub.id}: erro ao verificar no MP.`);
          console.error(`[cron/reconcile-mp] Erro ao verificar assinatura ${sub.id} no MP:`, errMsg);
        }
      }

      // Rate limit: esperar 200ms entre chamadas ao MP
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log(
      `[cron/reconcile-mp] Concluido: ${results.checked} verificadas, ${results.synced_cancelled} canceladas, ${results.synced_paused} pausadas, ${results.synced_missing} removidas do MP, ${results.synced_expired} expiradas por data_fim.`
    );

    return NextResponse.json({
      ok: true,
      message: `Reconciliacao concluida: ${results.checked} verificadas.`,
      ...results,
      checked_at: agoraISO,
    });
  } catch (err) {
    console.error('[cron/reconcile-mp] Erro geral:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

/**
 * Timing-safe comparison para evitar timing attacks.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  try {
    return timingSafeEqual(encoder.encode(a), encoder.encode(b));
  } catch {
    return false;
  }
}
