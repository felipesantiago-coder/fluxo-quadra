import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPreApprovalPlanClient, getPreApprovalClient } from '@/lib/mercadopago';

/**
 * GET /api/debug/mp-test
 *
 * Diagnostico fase 3: busca detalhes completos dos planos,
 * tenta atualizar payment_methods_allowed, e testa abordagens
 * alternativas de criacao de assinatura.
 *
 * REMOVER apos confirmar que o signup-subscribe funciona.
 */
export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  // 1. Buscar planos do banco
  const adminClient = createAdminClient();
  const { data: planos, error } = await adminClient
    .from('planos')
    .select('id, nome, periodo_meses, preco, ativo, mercadopago_plan_id, ordem')
    .eq('ativo', true)
    .order('ordem');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const planClient = getPreApprovalPlanClient();
  const preApprovalClient = getPreApprovalClient();

  // 2. Buscar detalhes completos de cada plano no MP
  const planDetails: Array<Record<string, unknown>> = [];

  for (const plano of planos || []) {
    const detail: Record<string, unknown> = {
      db_nome: plano.nome,
      mp_plan_id: plano.mercadopago_plan_id,
    };

    if (!plano.mercadopago_plan_id) {
      detail.skipped = true;
      planDetails.push(detail);
      continue;
    }

    try {
      const mpPlan = await planClient.get({ preApprovalPlanId: plano.mercadopago_plan_id });
      detail.mp_reason = mpPlan.reason;
      detail.mp_status = mpPlan.status;
      detail.mp_auto_recurring = mpPlan.auto_recurring;
      detail.mp_payment_methods_allowed = mpPlan.payment_methods_allowed;
      detail.mp_init_point = mpPlan.init_point;
      detail.mp_back_url = mpPlan.back_url;
    } catch (err: unknown) {
      detail.get_error = err instanceof Error ? err.message : String(err);
    }

    planDetails.push(detail);
  }

  results.plan_details = planDetails;

  // 3. Tentar atualizar o primeiro plano com payment_methods_allowed + reason
  const firstPlan = (planos || [])[0];
  if (!firstPlan?.mercadopago_plan_id) {
    return NextResponse.json(results);
  }

  const paymentMethodsAllowed = {
    payment_types: [
      { id: 'credit_card' },
      { id: 'debit_card' },
      { id: 'ticket' },
      { id: 'bank_transfer' },
    ],
  };

  // Tentativa A: update com payment_methods_allowed + reason + auto_recurring
  const updateAttempts: Array<Record<string, unknown>> = [];

  const planDetail = planDetails[0];
  const currentReason = (planDetail?.mp_reason as string) || firstPlan.nome;

  // Attempt A: payment_methods_allowed + reason
  try {
    const updated = await planClient.update({
      id: firstPlan.mercadopago_plan_id,
      updatePreApprovalPlanRequest: {
        reason: currentReason,
        payment_methods_allowed: paymentMethodsAllowed,
      },
    });
    updateAttempts.push({
      attempt: 'A (reason + payment_methods_allowed)',
      success: true,
      mp_payment_methods: updated.payment_methods_allowed,
    });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    updateAttempts.push({
      attempt: 'A (reason + payment_methods_allowed)',
      success: false,
      http_status: e?.status,
      error: e?.message,
    });
  }

  // Attempt B: payment_methods_allowed + reason + auto_recurring
  const ar = planDetail?.mp_auto_recurring as Record<string, unknown> | undefined;
  try {
    const updated = await planClient.update({
      id: firstPlan.mercadopago_plan_id,
      updatePreApprovalPlanRequest: {
        reason: currentReason,
        payment_methods_allowed: paymentMethodsAllowed,
        auto_recurring: {
          frequency: typeof ar?.frequency === 'number' ? ar.frequency : firstPlan.periodo_meses,
          frequency_type: typeof ar?.frequency_type === 'string' ? ar.frequency_type : 'months',
          transaction_amount: typeof ar?.transaction_amount === 'number' ? ar.transaction_amount : firstPlan.preco,
          currency_id: typeof ar?.currency_id === 'string' ? ar.currency_id : 'BRL',
        },
      },
    });
    updateAttempts.push({
      attempt: 'B (reason + payment_methods + auto_recurring)',
      success: true,
      mp_payment_methods: updated.payment_methods_allowed,
    });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    updateAttempts.push({
      attempt: 'B (reason + payment_methods + auto_recurring)',
      success: false,
      http_status: e?.status,
      error: e?.message,
    });
  }

  results.update_attempts = updateAttempts;

  // 4. Testar criacao de assinatura com diferentes abordagens
  const backUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/assinatura`
    : process.env.NEXT_PUBLIC_APP_URL || 'https://quadra-imob-sync.vercel.app/assinatura';

  const createTests: Array<Record<string, unknown>> = [];

  // Test 1: plano-based, status explicito 'pending'
  const body1 = {
    preapproval_plan_id: firstPlan.mercadopago_plan_id,
    payer_email: 'diagnostico1@teste.com',
    reason: `Diag1 - ${firstPlan.nome}`,
    back_url: backUrl,
    status: 'pending',
  };

  try {
    const response = await preApprovalClient.create({ body: body1 });
    createTests.push({
      test: '1: plano + status=pending',
      success: true,
      subscription_id: response.id,
      init_point: response.init_point,
    });
    // Cleanup
    if (response.id) {
      try { await preApprovalClient.update({ id: response.id, body: { status: 'cancelled' } }); } catch { /* ignore */ }
    }
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; causes?: unknown[] };
    createTests.push({
      test: '1: plano + status=pending',
      success: false,
      http_status: e?.status,
      message: e?.message,
      causes: e?.causes || [],
    });
  }

  // Test 2: standalone (sem plano), com auto_recurring + status pending
  const body2 = {
    payer_email: 'diagnostico2@teste.com',
    reason: `Diag2 - ${firstPlan.nome}`,
    back_url: backUrl,
    status: 'pending',
    auto_recurring: {
      frequency: firstPlan.periodo_meses,
      frequency_type: 'months',
      transaction_amount: firstPlan.preco,
      currency_id: 'BRL',
    },
  };

  try {
    const response = await preApprovalClient.create({ body: body2 });
    createTests.push({
      test: '2: standalone + auto_recurring + status=pending',
      success: true,
      subscription_id: response.id,
      init_point: response.init_point,
    });
    if (response.id) {
      try { await preApprovalClient.update({ id: response.id, body: { status: 'cancelled' } }); } catch { /* ignore */ }
    }
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; causes?: unknown[] };
    createTests.push({
      test: '2: standalone + auto_recurring + status=pending',
      success: false,
      http_status: e?.status,
      message: e?.message,
      causes: e?.causes || [],
    });
  }

  // Test 3: plano-based, sem status (comportamento original)
  const body3 = {
    preapproval_plan_id: firstPlan.mercadopago_plan_id,
    payer_email: 'diagnostico3@teste.com',
    reason: `Diag3 - ${firstPlan.nome}`,
    back_url: backUrl,
  };

  try {
    const response = await preApprovalClient.create({ body: body3 });
    createTests.push({
      test: '3: plano + sem status (original)',
      success: true,
      subscription_id: response.id,
      init_point: response.init_point,
    });
    if (response.id) {
      try { await preApprovalClient.update({ id: response.id, body: { status: 'cancelled' } }); } catch { /* ignore */ }
    }
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; causes?: unknown[] };
    createTests.push({
      test: '3: plano + sem status (original)',
      success: false,
      http_status: e?.status,
      message: e?.message,
      causes: e?.causes || [],
    });
  }

  results.create_tests = createTests;

  return NextResponse.json(results);
}
