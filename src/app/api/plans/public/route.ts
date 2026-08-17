import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/plans/public
 * Retorna planos ativos SEM exigir autenticação.
 * Usado na página pública de planos (abordagem B).
 *
 * Colunas selecionadas correspondem ao tipo PlanoDB definido em mercadopago.ts.
 * mercadopago_plan_id é necessário para o fluxo de checkout no frontend.
 */
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('planos')
      .select('id, nome, descricao, preco, periodo_meses, features, ativo, ordem, popular, maior_economia, mercadopago_plan_id')
      .eq('ativo', true)
      .order('ordem', { ascending: true });

    if (error) {
      console.error('[GET /api/plans/public] Erro Supabase:', error);
      return NextResponse.json({ error: 'Erro ao buscar planos.' }, { status: 500 });
    }

    const planos = (data || []).map((p) => ({
      ...p,
      features: Array.isArray(p.features) ? p.features : [],
    }));

    return NextResponse.json({ planos });
  } catch (err) {
    console.error('[GET /api/plans/public] Erro inesperado:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
