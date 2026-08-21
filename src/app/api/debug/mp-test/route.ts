import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPreApprovalPlanClient, getMpConfig } from '@/lib/mercadopago';

/**
 * GET /api/debug/mp-test
 *
 * Endpoint temporário de diagnóstico para verificar:
 *  1. Se o token do Mercado Pago é válido
 *  2. Se os planos cadastrados no banco existem no MP
 *
 * REMOVER após diagnosticar o problema.
 */
export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    token_configured: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
    token_prefix: process.env.MERCADOPAGO_ACCESS_TOKEN?.substring(0, 10) || '(vazio)',
    token_suffix: process.env.MERCADOPAGO_ACCESS_TOKEN?.slice(-4) || '(vazio)',
  };

  // 1. Testar se o token é válido listando planos do MP
  try {
    const planClient = getPreApprovalPlanClient();
    try {
      const listResponse = await planClient.search({ limit: 5 });
      results.mp_connection = 'ok';
      results.mp_plan_count = listResponse.results?.length ?? 0;
      results.mp_plans_list = (listResponse.results || []).map((p: { id?: string; reason?: string; status?: string }) => ({
        id: p.id,
        reason: p.reason,
        status: p.status,
      }));
    } catch (listErr: unknown) {
      results.mp_connection = 'failed';
      const err = listErr as { message?: string; response?: { status?: number; data?: { message?: string } } };
      results.mp_list_error = {
        status: err?.response?.status || 'unknown',
        message: err?.response?.data?.message || err?.message || 'unknown',
      };
    }
  } catch (err: unknown) {
    results.mp_connection = 'config_error';
    results.mp_config_error = err instanceof Error ? err.message : String(err);
  }

  // 2. Buscar planos do banco e verificar se existem no MP
  try {
    const adminClient = createAdminClient();
    const { data: planos, error } = await adminClient
      .from('planos')
      .select('id, nome, periodo_meses, preco, ativo, mercadopago_plan_id, ordem')
      .eq('ativo', true)
      .order('ordem');

    if (error) {
      results.db_error = error.message;
    } else {
      results.db_planos = planos;

      // 3. Verificar cada plano no MP individualmente
      const planClient = getPreApprovalPlanClient();
      const mpVerification: Array<Record<string, unknown>> = [];

      for (const plano of planos || []) {
        const verification: Record<string, unknown> = {
          db_nome: plano.nome,
          db_id: plano.id,
          db_preco: plano.preco,
          db_periodo_meses: plano.periodo_meses,
          mp_plan_id: plano.mercadopago_plan_id || '(vazio)',
        };

        if (plano.mercadopago_plan_id) {
          try {
            const mpPlan = await planClient.get({ id: plano.mercadopago_plan_id });
            verification.mp_exists = true;
            verification.mp_status = mpPlan.status;
            verification.mp_reason = mpPlan.reason;
            verification.mp_recurring = mpPlan.auto_recurring
              ? {
                  frequency: mpPlan.auto_recurring.frequency,
                  frequency_type: mpPlan.auto_recurring.frequency_type,
                  transaction_amount: mpPlan.auto_recurring.transaction_amount,
                  currency_id: mpPlan.auto_recurring.currency_id,
                }
              : null;
          } catch (mpErr: unknown) {
            verification.mp_exists = false;
            const err = mpErr as { message?: string; response?: { status?: number; data?: { message?: string; error?: string; cause?: Array<{ description?: string }> } } };
            verification.mp_error = {
              status: err?.response?.status || 'unknown',
              message:
                err?.response?.data?.cause?.map(c => c.description).filter(Boolean).join('; ') ||
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                'unknown',
            };
          }
        } else {
          verification.mp_exists = false;
          verification.mp_error = 'Campo mercadopago_plan_id está vazio no banco';
        }

        mpVerification.push(verification);
      }

      results.mp_plan_verification = mpVerification;
    }
  } catch (err: unknown) {
    results.db_check_error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(results, { status: 200 });
}