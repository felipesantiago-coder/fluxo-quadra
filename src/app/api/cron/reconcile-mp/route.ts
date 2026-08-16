import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMpSubscription } from '@/lib/mercadopago';

/**
 * GET /api/cron/reconcile-mp
 *
 * Vercel Cron Job — executado a cada 6 horas.
 * Compara o status das assinaturas locais com o status no Mercado Pago.
 * Detecta:
 *  - Assinaturas locais 'active' mas canceladas/pausadas no MP
 *  - Assinaturas locais 'active' com preapproval que não existe mais no MP
 *
 * Segurança: apenas acessível via Vercel Cron (header Authorization) ou ?secret=.
 */
export async function GET(request: NextRequest) {
  // Verificação de autorização do cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const querySecret = request.nextUrl.searchParams.get('secret');
  const providedSecret = authHeader?.replace('Bearer ', '') || querySecret;

  if (!cronSecret || providedSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'MP not configured.' }, { status: 503 });
  }

  try {
    const supabase = createAdminClient();
    const agora = new Date().toISOString();
    const results = {
      checked: 0,
      synced_cancelled: 0,
      synced_paused: 0,
      synced_missing: 0,
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
      return NextResponse.json({ error: 'Erro ao buscar assinaturas.' }, { status: 500 });
    }

    if (!activeSubs || activeSubs.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'Nenhuma assinatura ativa com ID do MP para reconciliar.',
        ...results,
        checked_at: agora,
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
          const auditoria = `Reconciliado com Mercado Pago (status MP: ${mpStatus}) em ${agora}.`;

          const { count, error: updateErr } = await supabase
            .from('assinaturas')
            .update({
              status: newStatus,
              motivo_cancelamento: newStatus === 'cancelled' ? auditoria : undefined,
              cancelado_em: newStatus === 'cancelled' ? agora : undefined,
              proximo_ciclo_em: null,
              updated_at: agora,
            })
            .eq('id', sub.id)
            .eq('status', 'active'); // CAS

          if (updateErr) {
            results.errors.push(`Sub ${sub.id}: update error: ${updateErr.message}`);
          } else if (count && count > 0) {
            if (newStatus === 'cancelled') results.synced_cancelled++;
            if (newStatus === 'paused') results.synced_paused++;

            // Atualizar perfil
            await supabase
              .from('profiles')
              .update({ subscription_status: 'none' })
              .eq('id', sub.user_id);

            console.log(
              `[cron/reconcile-mp] Assinatura ${sub.id} atualizada: active -> ${newStatus} (MP: ${mpStatus})`
            );
          }
        }
      } catch (mpErr: unknown) {
        const errMsg = mpErr instanceof Error ? mpErr.message : String(mpErr);

        // Verificar se o erro é 404 (assinatura não existe mais no MP)
        if (errMsg.includes('404') || errMsg.includes('not_found') || errMsg.includes('not found')) {
          console.warn(`[cron/reconcile-mp] Assinatura ${mpId} nao existe mais no MP. Marcando como cancelled.`);

          const { count, error: updateErr } = await supabase
            .from('assinaturas')
            .update({
              status: 'cancelled',
              motivo_cancelamento: `Preapproval ${mpId} nao existe mais no Mercado Pago (reconciliacao em ${agora}).`,
              cancelado_em: agora,
              proximo_ciclo_em: null,
              updated_at: agora,
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
          results.errors.push(`Sub ${sub.id}: MP error: ${errMsg}`);
        }
      }

      // Rate limit: esperar 200ms entre chamadas ao MP
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log(
      `[cron/reconcile-mp] Concluido: ${results.checked} verificadas, ${results.synced_cancelled} canceladas, ${results.synced_paused} pausadas, ${results.synced_missing} removidas do MP.`
    );

    return NextResponse.json({
      ok: true,
      message: `Reconciliacao concluida: ${results.checked} verificadas.`,
      ...results,
      checked_at: agora,
    });
  } catch (err) {
    console.error('[cron/reconcile-mp] Erro geral:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
