import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPreApprovalPlanClient, getPreApprovalClient, getMpConfig } from '@/lib/mercadopago';

/**
 * GET /api/debug/mp-test
 *
 * Endpoint temporario de diagnostico para verificar:
 *  1. Se o token do Mercado Pago e valido
 *  2. Se os planos cadastrados no banco existem no MP
 *  3. Se a criacao de assinatura funciona (teste real)
 *
 * REMOVER apos diagnosticar o problema.
 */
export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    token_configured: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
    token_prefix: process.env.MERCADOPAGO_ACCESS_TOKEN?.substring(0, 10) || '(vazio)',
    token_suffix: process.env.MERCADOPAGO_ACCESS_TOKEN?.slice(-4) || '(vazio)',
  };

  // 1. Testar se o token e valido listando planos do MP
  try {
    const planClient = getPreApprovalPlanClient();
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
    results.mp_list_error = listErr instanceof Error ? listErr.message : String(listErr);
  }

  // 2. Buscar planos do banco
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

      // 3. Verificar cada plano no MP (corrigido: usar preApprovalPlanId)
      const planClient = getPreApprovalPlanClient();
      const mpVerification: Array<Record<string, unknown>> = [];

      for (const plano of planos || []) {
        const verification: Record<string, unknown> = {
          db_nome: plano.nome,
          db_preco: plano.preco,
          db_periodo_meses: plano.periodo_meses,
          mp_plan_id: plano.mercadopago_plan_id || '(vazio)',
        };

        if (plano.mercadopago_plan_id) {
          try {
            const mpPlan = await planClient.get({ preApprovalPlanId: plano.mercadopago_plan_id });
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
            // O SDK lanca MercadoPagoError com status, message, causes, error direto
            const err = mpErr as { status?: number; message?: string; error?: string; causes?: Array<{ description?: string }> };
            verification.mp_error = {
              status: err?.status || 'unknown',
              message: err?.message || 'unknown',
              error: err?.error || '',
              causes: err?.causes || [],
            };
          }
        } else {
          verification.mp_exists = false;
          verification.mp_error = 'Campo mercadopago_plan_id esta vazio no banco';
        }

        mpVerification.push(verification);
      }

      results.mp_plan_verification = mpVerification;

      // 4. TESTE REAL: tentar criar uma assinatura de teste no MP
      //    Usa o primeiro plano ativo com email ficticio
      const testPlano = (planos || [])[0];
      if (testPlano?.mercadopago_plan_id) {
        const client = getPreApprovalClient();
        const backUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}/assinatura`
          : process.env.NEXT_PUBLIC_APP_URL || '';

        const testBody = {
          preapproval_plan_id: testPlano.mercadopago_plan_id,
          payer_email: 'diagnostico@teste.com',
          reason: `Diagnostico - ${testPlano.nome}`,
          status: 'pending',
          back_url: backUrl || 'https://quadra-imob-sync.vercel.app/assinatura',
        };

        results.create_test = {
          plano_nome: testPlano.nome,
          mp_plan_id: testPlano.mercadopago_plan_id,
          back_url: testBody.back_url,
          body_sent: testBody,
        };

        try {
          const response = await client.create({ body: testBody });
          results.create_test.success = true;
          results.create_test.subscription_id = response.id;
          results.create_test.init_point = response.init_point;

          // Limpar assinatura de teste criada
          if (response.id) {
            try {
              await client.update({ id: response.id, body: { status: 'cancelled' } });
              results.create_test.cleaned_up = true;
            } catch {
              results.create_test.cleanup_failed = true;
            }
          }
        } catch (createErr: unknown) {
          results.create_test.success = false;
          // O SDK lanca subclasses de MercadoPagoError com status, message, causes
          const err = createErr as {
            name?: string;
            status?: number;
            message?: string;
            error?: string;
            causes?: Array<{ code?: string; description?: string }>;
          };
          results.create_test.error = {
            error_type: err?.name || 'Unknown',
            http_status: err?.status || 'unknown',
            message: err?.message || 'unknown',
            error_code: err?.error || '',
            causes: err?.causes || [],
          };
        }
      }
    }
  } catch (err: unknown) {
    results.db_check_error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(results, { status: 200 });
}
