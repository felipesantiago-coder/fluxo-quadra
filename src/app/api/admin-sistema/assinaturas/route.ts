import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdminSistema } from '@/lib/admin-auth';

/**
 * GET /api/admin-sistema/assinaturas
 * Admin lista todas as assinaturas com dados do usuário e plano.
 */
export async function GET() {
  try {
    const isAllowed = await requireAdminSistema();
    if (!isAllowed) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
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
        mercadopago_subscription_id,
        user:profiles!inner(id, email, display_name, role),
        plano:planos(id, nome, periodo_meses, preco)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/admin-sistema/assinaturas] Erro:', error);
      return NextResponse.json({ error: 'Erro ao buscar assinaturas.' }, { status: 500 });
    }

    return NextResponse.json({ assinaturas: data || [] });
  } catch (err) {
    console.error('[GET /api/admin-sistema/assinaturas] Erro:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin-sistema/assinaturas
 * Admin pode alterar manualmente o status de uma assinatura.
 * Body: { assinaturaId: string, status: string, motivo?: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const isAllowed = await requireAdminSistema();
    if (!isAllowed) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const supabase = await createClient();
    const body = await request.json();
    const { assinaturaId, status, motivo } = body as {
      assinaturaId?: string;
      status?: string;
      motivo?: string;
    };

    if (!assinaturaId || !status) {
      return NextResponse.json(
        { error: 'assinaturaId e status são obrigatórios.' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'active', 'cancelled', 'paused', 'expired', 'cancelled_by_user'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'cancelled' || status === 'cancelled_by_user') {
      updateData.cancelado_em = new Date().toISOString();
      updateData.motivo_cancelamento = motivo || 'Cancelado manualmente pelo administrador';
      updateData.proximo_ciclo_em = null;
    }

    if (status === 'active') {
      updateData.cancelado_em = null;
    }

    if (status === 'paused') {
      updateData.proximo_ciclo_em = null;
    }

    const { error } = await supabase
      .from('assinaturas')
      .update(updateData)
      .eq('id', assinaturaId);

    if (error) {
      console.error('[PATCH /api/admin-sistema/assinaturas] Erro:', error);
      return NextResponse.json({ error: 'Erro ao atualizar assinatura.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Assinatura atualizada para "${status}".` });
  } catch (err) {
    console.error('[PATCH /api/admin-sistema/assinaturas] Erro:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
