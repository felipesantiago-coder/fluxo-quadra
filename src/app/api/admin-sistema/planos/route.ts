import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdminSistema } from '@/lib/admin-auth';
import { createMpPlan } from '@/lib/mercadopago';

/**
 * GET /api/admin-sistema/planos
 * Admin lista todos os planos (incluindo inativos).
 */
export async function GET() {
  try {
    const isAllowed = await requireAdminSistema();
    if (!isAllowed) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('planos')
      .select('*')
      .order('ordem', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar planos.' }, { status: 500 });
    }

    return NextResponse.json({ planos: data || [] });
  } catch (err) {
    console.error('[GET /api/admin-sistema/planos] Erro:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

/**
 * POST /api/admin-sistema/planos
 * Admin cria ou sincroniza um plano com o Mercado Pago.
 * Body: { planoId?: string } — se passado, sincroniza o plano existente com o MP.
 */
export async function POST(request: NextRequest) {
  try {
    const isAllowed = await requireAdminSistema();
    if (!isAllowed) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const supabase = await createClient();
    const body = await request.json();
    const { planoId } = body as { planoId?: string };

    if (!planoId) {
      return NextResponse.json({ error: 'planoId é obrigatório.' }, { status: 400 });
    }

    // Buscar plano local
    const { data: plano, error: planoErr } = await supabase
      .from('planos')
      .select('*')
      .eq('id', planoId)
      .single();

    if (planoErr || !plano) {
      return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
    }

    // Se já tem MP plan ID, retornar
    if (plano.mercadopago_plan_id) {
      return NextResponse.json({
        message: 'Plano já sincronizado.',
        mercadopago_plan_id: plano.mercadopago_plan_id,
      });
    }

    // Criar plano no Mercado Pago
    const mpPlanId = await createMpPlan({
      planoId: plano.id,
      nome: plano.nome,
      periodoMeses: plano.periodo_meses,
      preco: Number(plano.preco),
    });

    // Salvar ID do MP no plano
    const { error: updateErr } = await supabase
      .from('planos')
      .update({ mercadopago_plan_id: mpPlanId, updated_at: new Date().toISOString() })
      .eq('id', planoId);

    if (updateErr) {
      console.error('[POST /api/admin-sistema/planos] Erro ao atualizar:', updateErr);
      return NextResponse.json({ error: 'Erro ao salvar ID do plano.' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Plano criado no Mercado Pago com sucesso.',
      mercadopago_plan_id: mpPlanId,
    });
  } catch (err) {
    console.error('[POST /api/admin-sistema/planos] Erro:', err);
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('MERCADOPAGO_ACCESS_TOKEN')) {
      return NextResponse.json(
        { error: 'Token do Mercado Pago não configurado.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Erro ao sincronizar plano.' }, { status: 500 });
  }
}
