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
 * SEGURANÇA: Verifica assinatura HMAC-SHA256 do x-signature.
 */
export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    let body: Record<string, unknown>;

    try {
      body = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
    }

    // 1. Verificar assinatura do webhook
    const xSignature = request.headers.get('x-signature');
    const isValid = await verifyWebhookSignature(xSignature, bodyText);

    // Em modo de desenvolvimento, permitir sem verificação (quando não há secret configurado)
    const isDev = !process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!isValid && !isDev) {
      console.warn('[Webhook MP] Assinatura inválida.');
      return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 });
    }

    const action = body.action as string | undefined;
    const type = body.type as string | undefined;
    const data = body.data as Record<string, string> | undefined;

    if (!data?.id) {
      console.warn('[Webhook MP] Evento sem data.id:', body);
      return NextResponse.json({ received: true });
    }

    console.log(`[Webhook MP] Evento: type=${type}, action=${action}, id=${data.id}`);

    const supabase = createAdminClient();

    // ── Processar por tipo de evento ──
    if (type === 'payment') {
      await handlePaymentEvent(supabase, data.id);
    } else if (type === 'preapproval') {
      await handlePreapprovalEvent(supabase, data.id, action);
    } else {
      console.log(`[Webhook MP] Tipo não tratado: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Webhook MP] Erro geral:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

// ── Handler: Pagamentos ──────────────────────────────────────

async function handlePaymentEvent(
  supabase: ReturnType<typeof createAdminClient>,
  paymentId: string
) {
  try {
    // Buscar detalhes do pagamento no MP
    const payment = await getMpPayment(paymentId);
    const paymentData = payment as Record<string, unknown>;

    const status = paymentData.status as string;
    const valor = Number(paymentData.transaction_amount) || 0;
    const metodo = paymentData.payment_method_id as string || '';
    const dateApproved = paymentData.date_approved as string | null;
    const preapprovalId = paymentData.metadata?.preapproval_id as string | undefined;

    if (!status) {
      console.warn(`[Webhook MP] Pagamento ${paymentId} sem status.`);
      return;
    }

    // Mapear método de pagamento
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

    // Se não achou por preapproval, buscar por mercadopago_payment_id
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
      console.warn(`[Webhook MP] Pagamento ${paymentId}: não foi possível encontrar o usuário.`);
      return;
    }

    // Validar status do pagamento
    const validStatuses = ['pending', 'approved', 'rejected', 'refunded', 'cancelled', 'in_process'];
    const normalizedStatus = validStatuses.includes(status) ? status : 'pending';

    // Upsert pagamento
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
            payer: paymentData.payer
              ? { email: (paymentData.payer as Record<string, unknown>).email, id: (paymentData.payer as Record<string, unknown>).id }
              : null,
          },
        },
        { onConflict: 'mercadopago_payment_id' }
      );

    if (upsertErr) {
      console.error(`[Webhook MP] Erro ao upsert pagamento ${paymentId}:`, upsertErr);
    }

    // Se pagamento aprovado, atualizar assinatura como ativa
    if (normalizedStatus === 'approved' && assinaturaId) {
      const agora = new Date().toISOString();

      // Buscar plano para calcular data fim
      const { data: assinatura } = await supabase
        .from('assinaturas')
        .select('plano_id, plano:planos(periodo_meses)')
        .eq('id', assinaturaId)
        .single();

      let dataFim: string | null = null;
      if (assinatura?.plano) {
        const plano = assinatura.plano as Record<string, number>;
        const meses = plano.periodo_meses || 1;
        dataFim = new Date(Date.now() + meses * 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      await supabase
        .from('assinaturas')
        .update({
          status: 'active',
          data_inicio: dataFim && !assinatura?.data_inicio ? agora : undefined,
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
    const subData = subscription as Record<string, unknown>;

    const mpStatus = subData.status as string;
    const payerId = (subData.payer_id as string) || null;

    // Buscar assinatura local
    const { data: assinatura, error: assErr } = await supabase
      .from('assinaturas')
      .select('id, user_id, plano_id')
      .eq('mercadopago_subscription_id', subscriptionId)
      .maybeSingle();

    if (assErr || !assinatura) {
      console.warn(`[Webhook MP] Assinatura ${subscriptionId} não encontrada localmente.`);
      return;
    }

    // Mapear status MP → nosso status
    const statusMap: Record<string, string> = {
      authorized: 'active',
      active: 'active',
      pending: 'pending',
      cancelled: 'cancelled',
      paused: 'paused',
    };

    const ourStatus = statusMap[mpStatus] || assinatura.status;

    // Atualizar no banco
    const updateData: Record<string, unknown> = {
      status: ourStatus,
    };

    if (payerId) {
      updateData.mercadopago_payer_id = payerId;
    }

    // Se cancelada
    if (mpStatus === 'cancelled') {
      updateData.cancelado_em = new Date().toISOString();
      updateData.motivo_cancelamento = `Cancelada via Mercado Pago (action: ${action || 'unknown'})`;
      // Limpar próxima cobrança
      updateData.proximo_ciclo_em = null;
    }

    // Se pausada
    if (mpStatus === 'paused') {
      updateData.proximo_ciclo_em = null;
    }

    await supabase
      .from('assinaturas')
      .update(updateData)
      .eq('id', assinatura.id);

    console.log(
      `[Webhook MP] Assinatura ${subscriptionId} → ${ourStatus} (MP: ${mpStatus})`
    );
  } catch (err) {
    console.error(`[Webhook MP] Erro ao processar assinatura ${subscriptionId}:`, err);
  }
}
