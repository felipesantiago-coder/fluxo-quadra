import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/subscriptions/status
 * Retorna o status da assinatura do usuário logado + histórico de pagamentos.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // Buscar assinatura mais recente do usuário
    const { data: assinatura, error: assErr } = await supabase
      .from('assinaturas')
      .select(`
        id,
        status,
        metodo_pagamento,
        data_inicio,
        data_fim,
        ultimo_pagamento_em,
        proximo_ciclo_em,
        cancelado_em,
        motivo_cancelamento,
        created_at,
        plano:planos(id, nome, periodo_meses, preco, features)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assErr) {
      console.error('[GET /api/subscriptions/status] Erro:', assErr);
      return NextResponse.json({ error: 'Erro ao buscar assinatura.' }, { status: 500 });
    }

    // Buscar histórico de pagamentos
    const { data: pagamentos, error: pagErr } = await supabase
      .from('pagamentos')
      .select('id, valor, metodo_pagamento, status, data_pagamento, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      assinatura: assinatura || null,
      pagamentos: pagamentos || [],
    });
  } catch (err) {
    console.error('[GET /api/subscriptions/status] Erro:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
