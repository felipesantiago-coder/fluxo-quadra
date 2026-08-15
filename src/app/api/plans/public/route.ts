import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/plans/public
 * Retorna planos ativos SEM exigir autenticação.
 * Usado na página pública de planos (abordagem B).
 *
 * SEC-AUDIT FIX: Usa select explícito para não expor campos internos
 * como mercadopago_plan_id, created_at, updated_at.
 */
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('planos')
      .select('id, nome, descricao, preco, periodo, features, ativo, ordem, destaque')
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
