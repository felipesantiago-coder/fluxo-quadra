import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyWebhookSignature, getMpPayment, getMpSubscription } from '@/lib/mercadopago';

/**
 * POST /api/webhooks/mercadopago
 *
 * Webhook receiver para eventos do Mercado Pago.
 * Processa automaticamente:
 *  - Pagamentos aprovados/rejeitados
 *  - Assinaturas ativadas/canceladas/pausadas
 *
 * SEGURANCA: Verifica assinatura HMAC-SHA256 do x-signature.
 * NUNCA desabilita verificacao de assinatura, mesmo em dev.
 */
export async function POST(request: NextRequest) {
  try {
    // 0. Verificar se webhook secret esta configurado
    if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
      console.error('[Webhook MP] MERCADOPAGO_WEBHOOK_SECRET nao configurado. Webhook desabilitado.');
      return NextResponse.json(
        { error: 'Webhook nao configurado. Configure MERCADOPAGO_WEBHOOK_SECRET.' },
        { status: 503 }
      );
    }

    const bodyText = await request.text();
    let body: Record<string, unknown>;

    try {
      body = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ error: 'JSON invalido.' }, { status: 400 });
    }

    // 1. Verificar assinatura do webhook — OBRIGATORIO, sem bypass
    const xSignature = request.headers.get('x-signature');
    const isValid = await verifyWebhookSignature(xSignature, bodyText);

    if (!isValid) {
      console.warn('[Webhook MP] Assinatura HMAC invalida. Requisicao rejeitada.');
      return NextResponse.json({ error: 'Assinatura invalida.' }, { status: 401 });
    }

    const action = body.action as string | undefined;
    const type = body.type as string | undefined;
    const data = body.data as Record<string, string> | undefined;

    if (!data?.id) {
      return NextResponse.json({ received: true });
    }

    // Montar event_id para idempotencia
    const eventId = `${type || 'unknown'}:${data.id}`;

    const supabase = createAdminClient();

    // 2. Idempotencia: verificar se este evento ja foi processado
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existingEvent) {
      // Evento ja processado — retornar 200 silenciosamente
      return NextResponse.json({ received: true, idempotent: true });
    }

    // 3. Processar por tipo de evento
    if (type === 'payment') {
      await handlePaymentEvent(supabase, data.id);
    } else if (type === 'preapproval') {
      await handlePreapprovalEvent(supabase, data.id, action);
    } else {
      // Tipo nao tratado — registrar e ignorar
    }

    // 4. Registrar evento como processado
    await supabase
      .from('webhook_events')
      .insert({
        event_id: eventId,
        event_type: type || 'unknown',
        action: action || null,
        mp_resource_id: data.id,
        processed_at: new Date().toISOString(),
      });

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Webhook MP] Erro geral:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

// ── Maquina de Estados: transicoes validas para assinaturas ──
const VALID_TRANSITIONS: Record<string, Set<string>> = {
  pending: new Set(['pending', 'active', 'cancelled', 'rejected', 'expired']),
  active: new Set(['active', 'cancelled', 'paused', 'expired', 'cancelled_by_user']),
  paused: new Set(['paused', 'active', 'cancelled', 'expired', 'cancelled_by_user']),
  cancelled: new Set(['cancelled']),
  cancelled_by_user: new Set(['cancelled_by_user']),
  expired: new Set(['expired']),
};

function isTransitionValid(currentStatus: string, newStatus: string): boolean {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.has(newStatus);
}

// ── Handler: Pagamentos ──────────────────────────────────────

async function handlePaymentEvent(
  supabase: ReturnType<typeof createAdminClient>,
  paymentId: string
) {
  try {
    // Buscar detalhes do pagamento no MP
    const payment = await getMpPayment(paymentId);
    const paymentData = payment as unknown as Record<string, unknown>;

    const status = paymentData.status as string;
    const valor = Number(paymentData.transaction_amount) || 0;
    const metodo = paymentData.payment_method_id as string || '';
    const dateApproved = paymentData.date_approved as string | null;
    const preapprovalId = (paymentData.metadata as Record<string, unknown> | undefined)?.preapproval_id as string | undefined;

    if (!status) {
      return;
    }

    // Mapear metodo de pagamento
    let metodoNorm = 'pix';
    if (metodo.includes('credit_card')) metodoNorm = 'credit_card';
    else if (metodo.includes('debit_card')) metodoNorm = 'debit_card';
    else if (metodo.includes('bolbradesco')) metodoNorm = 'boleto';

    // Buscar a assinatura pelo preapproval_id (se vier no metadata)
    let assinaturaId: string | null = null;
    let userId: string | null = null;

    if (preapprovalId) {
      const { data: ass } = await supabase
        .from('assinaturas')
        .select('id, user_id')
        .eq('mercadopago_subscription_id', preapprovalId)
        .maybeSingle();

      if (ass) {
        assinaturaId = ass.id;
        userId = ass.user_id;
      }
    }

    // Se nao achou por preapproval, buscar por mercadopago_payment_id
    if (!userId) {
      const { data: existingPayment } = await supabase
        .from('pagamentos')
        .select('user_id, assinatura_id')
        .eq('mercadopago_payment_id', paymentId)
        .maybeSingle();

      if (existingPayment) {
        userId = existingPayment.user_id;
        assinaturaId = existingPayment.assinatura_id;
      }
    }

    if (!userId) {
      return;
    }

    // Validar status do pagamento
    const validStatuses = ['pending', 'approved', 'rejected', 'refunded', 'cancelled', 'in_process'];
    const normalizedStatus = validStatuses.includes(status) ? status : 'pending';

    // Upsert pagamento (sem dados pessoais do payer)
    const { error: upsertErr } = await supabase
      .from('pagamentos')
      .upsert(
        {
          user_id: userId,
          assinatura_id: assinaturaId,
          mercadopago_payment_id: paymentId,
          mercadopago_preapproval_id: preapprovalId || null,
          valor,
          metodo_pagamento: metodoNorm,
          status: normalizedStatus,
          data_pagamento: dateApproved || null,
          detalhes: {
            mp_status: status,
            payment_method_id: metodo,
            date_created: paymentData.date_created,
          },
        },
        { onConflict: 'mercadopago_payment_id' }
      );

    if (upsertErr) {
      console.error(`[Webhook MP] Erro ao upsert pagamento ${paymentId}:`, upsertErr);
    }

    // Se pagamento aprovado, atualizar assinatura como ativa
    if (normalizedStatus === 'approved' && assinaturaId) {
      // Buscar assinatura com status atual e plano (uma unica query)
      const { data: assinatura } = await supabase
        .from('assinaturas')
        .select('id, status, data_inicio, plano_id, plano:planos(preco, periodo_meses)')
        .eq('id', assinaturaId)
        .single();

      if (!assinatura) return;

      // Validar transicao de estado: so ativar se esta em pending ou paused
      if (!isTransitionValid(assinatura.status, 'active')) {
        console.warn(
          `[Webhook MP] Transicao invalida: ${assinatura.status} -> active. Assinatura ${assinaturaId}. Ignorando.`
        );
        return;
      }

      // Validar valor cobrado vs preco do plano (tolerancia de 5%)
      const plano = assinatura.plano as unknown as Record<string, unknown> | null;
      if (plano) {
        const precoPlano = Number(plano.preco) || 0;
        if (precoPlano > 0) {
          const diff = Math.abs(valor - precoPlano) / precoPlano;
          if (diff > 0.05) {
            console.error(
              `[Webhook MP] ALERTA: Valor pago (R$${valor}) diverge do plano (R$${precoPlano}) em ${Math.round(diff * 100)}%. ` +
              `Assinatura ${assinaturaId}, Pagamento ${paymentId}. Requerer intervencao manual.`
            );
            // Nao ativar automaticamente — requerer confirmacao do admin
            return;
          }
        }
      }

      const agora = new Date().toISOString();

      // Calcular data fim com meses calendario reais
      let dataFim: string | null = null;
      if (plano) {
        const meses = Number(plano.periodo_meses) || 1;
        const fim = new Date();
        fim.setMonth(fim.getMonth() + meses);
        dataFim = fim.toISOString();
      }

      await supabase
        .from('assinaturas')
        .update({
          status: 'active',
          data_inicio: dataFim && !assinatura.data_inicio ? agora : undefined,
          data_fim: dataFim,
          ultimo_pagamento_em: agora,
          proximo_ciclo_em: dataFim,
          metodo_pagamento: metodoNorm,
        })
        .eq('id', assinaturaId);
    }
  } catch (err) {
    console.error(`[Webhook MP] Erro ao processar pagamento ${paymentId}:`, err);
  }
}

// ── Handler: Assinaturas (Preapproval) ──────────────────────

async function handlePreapprovalEvent(
  supabase: ReturnType<typeof createAdminClient>,
  subscriptionId: string,
  action: string | undefined
) {
  try {
    // Buscar detalhes da assinatura no MP
    const subscription = await getMpSubscription(subscriptionId);
    const subData = subscription as unknown as Record<string, unknown>;

    const mpStatus = subData.status as string;
    const payerId = (subData.payer_id as string) || null;

    // Mapear status MP -> nosso status
    const statusMap: Record<string, string> = {
      authorized: 'active',
      active: 'active',
      pending: 'pending',
      cancelled: 'cancelled',
      paused: 'paused',
    };

    const ourStatus = statusMap[mpStatus];
    if (!ourStatus) {
      console.warn(`[Webhook MP] Status MP nao mapeado: ${mpStatus} para assinatura ${subscriptionId}`);
      return;
    }

    // Buscar assinatura local com status atual
    const { data: assinatura, error: assErr } = await supabase
      .from('assinaturas')
      .select('id, user_id, plano_id, status')
      .eq('mercadopago_subscription_id', subscriptionId)
      .maybeSingle();

    if (assErr || !assinatura) {
      console.warn(`[Webhook MP] Assinatura ${subscriptionId} nao encontrada localmente.`);
      return;
    }

    // Validar transicao de estado
    if (!isTransitionValid(assinatura.status, ourStatus)) {
      console.warn(
        `[Webhook MP] Transicao invalida: ${assinatura.status} -> ${ourStatus}. Assinatura ${assinatura.id}. Ignorando.`
      );
      return;
    }

    // Montar dados de atualizacao
    const updateData: Record<string, unknown> = {
      status: ourStatus,
    };

    if (payerId) {
      updateData.mercadopago_payer_id = payerId;
    }

    if (mpStatus === 'cancelled') {
      updateData.cancelado_em = new Date().toISOString();
      updateData.motivo_cancelamento = `Cancelada via Mercado Pago (action: ${action || 'unknown'})`;
      updateData.proximo_ciclo_em = null;
    }

    if (mpStatus === 'paused') {
      updateData.proximo_ciclo_em = null;
    }

    await supabase
      .from('assinaturas')
      .update(updateData)
      .eq('id', assinatura.id);
  } catch (err) {
    console.error(`[Webhook MP] Erro ao processar assinatura ${subscriptionId}:`, err);
  }
}
