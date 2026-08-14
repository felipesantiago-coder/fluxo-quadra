import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdminSistema } from '@/lib/admin-auth';

// Maquina de estados: transicoes validas
const VALID_TRANSITIONS: Record<string, Set<string>> = {
  pending: new Set(['pending', 'active', 'cancelled', 'expired', 'paused']),
  active: new Set(['active', 'cancelled', 'paused', 'expired', 'cancelled_by_user']),
  paused: new Set(['paused', 'active', 'cancelled', 'expired', 'cancelled_by_user']),
  cancelled: new Set(['cancelled']),
  cancelled_by_user: new Set(['cancelled_by_user']),
  expired: new Set(['expired']),
};

function isTransitionValid(current: string, target: string): boolean {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed) return false;
  return allowed.has(target);
}

/**
 * GET /api/admin-sistema/assinaturas
 * Admin lista todas as assinaturas com dados do usuario e plano.
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
 * Valida transicao de estado e requer justificativa para status 'active'.
 *
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
        { error: 'assinaturaId e status sao obrigatorios.' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'active', 'cancelled', 'paused', 'expired', 'cancelled_by_user'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status invalido.' }, { status: 400 });
    }

    // Se admin quer ativar, exigir motivo obrigatoria
    if (status === 'active' && (!motivo || motivo.trim().length < 10)) {
      return NextResponse.json(
        { error: 'Para ativar uma assinatura manualmente, forneca um motivo detalhado (minimo 10 caracteres) justificando a acao.' },
        { status: 400 }
      );
    }

    // Buscar status atual para validar transicao
    const { data: currentAss, error: fetchErr } = await supabase
      .from('assinaturas')
      .select('id, status')
      .eq('id', assinaturaId)
      .maybeSingle();

    if (fetchErr || !currentAss) {
      return NextResponse.json({ error: 'Assinatura nao encontrada.' }, { status: 404 });
    }

    // Validar transicao de estado
    if (!isTransitionValid(currentAss.status, status)) {
      return NextResponse.json(
        { error: `Transicao invalida: nao e possivel mudar de "${currentAss.status}" para "${status}".` },
        { status: 409 }
      );
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
