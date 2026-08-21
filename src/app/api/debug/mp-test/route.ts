import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPreApprovalPlanClient, getPreApprovalClient } from '@/lib/mercadopago';

/**
 * GET /api/debug/mp-test
 *
 * Diagnostico + correcao: atualiza os planos no MP para incluir
 * payment_methods_allowed (antes ausente, causava "card_token_id is required").
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

  // 2. Atualizar cada plano no MP para incluir payment_methods_allowed
  const paymentMethodsAllowed = {
    payment_types: [
      { id: 'credit_card' },
      { id: 'debit_card' },
      { id: 'ticket' },
      { id: 'bank_transfer' },
    ],
  };

  const updateResults: Array<Record<string, unknown>> = [];

  for (const plano of planos || []) {
    const update: Record<string, unknown> = {
      db_nome: plano.nome,
      mp_plan_id: plano.mercadopago_plan_id,
    };

    if (!plano.mercadopago_plan_id) {
      update.skipped = true;
      update.reason = 'sem mercadopago_plan_id';
      updateResults.push(update);
      continue;
    }

    try {
      const updated = await planClient.update({
        id: plano.mercadopago_plan_id,
        updatePreApprovalPlanRequest: {
          payment_methods_allowed: paymentMethodsAllowed,
        },
      });
      update.updated = true;
      update.mp_payment_methods = updated.payment_methods_allowed;
    } catch (err: unknown) {
      update.updated = false;
      update.error = err instanceof Error ? err.message : String(err);
    }

    updateResults.push(update);
  }

  results.plan_updates = updateResults;

  // 3. Testar criacao de assinatura com o primeiro plano
  const testPlano = (planos || [])[0];
  if (!testPlano?.mercadopago_plan_id) {
    return NextResponse.json(results);
  }

  const backUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/assinatura`
    : process.env.NEXT_PUBLIC_APP_URL || 'https://quadra-imob-sync.vercel.app/assinatura';

  const testBody = {
    preapproval_plan_id: testPlano.mercadopago_plan_id,
    payer_email: 'diagnostico@teste.com',
    reason: `Diagnostico - ${testPlano.nome}`,
    back_url: backUrl,
  };

  results.create_test = {
    plano: testPlano.nome,
    mp_plan_id: testPlano.mercadopago_plan_id,
    body_sent: testBody,
  };

  try {
    const response = await preApprovalClient.create({ body: testBody });
    results.create_test.success = true;
    results.create_test.subscription_id = response.id;
    results.create_test.init_point = response.init_point;

    // Cancelar a assinatura de teste
    if (response.id) {
      try {
        await preApprovalClient.update({ id: response.id, body: { status: 'cancelled' } });
        results.create_test.cleaned_up = true;
      } catch {
        results.create_test.cleanup_error = true;
      }
    }
  } catch (createErr: unknown) {
    results.create_test.success = false;
    const err = createErr as { name?: string; status?: number; message?: string; causes?: Array<{ description?: string }> };
    results.create_test.error = {
      type: err?.name,
      http_status: err?.status,
      message: err?.message,
      causes: err?.causes || [],
    };
  }

  return NextResponse.json(results);
}
