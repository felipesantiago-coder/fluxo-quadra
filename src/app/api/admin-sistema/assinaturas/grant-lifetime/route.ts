import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminSistema } from '@/lib/admin-auth';

// Regex UUID v4 — rejeita anything que não seja UUID válido
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Mínimo de caracteres para o motivo (auditoria)
const MIN_MOTIVO_LENGTH = 15;

/**
 * POST /api/admin-sistema/assinaturas/grant-lifetime
 *
 * Concede plano vitalício a um usuário.
 * Apenas admin_sistema pode executar.
 *
 * SEGURANÇA (defense-in-depth):
 *   1. requireAdminSistema() — verifica sessão + role + email hardcoded
 *   2. Validação de entrada (UUID, motivo obrigatório)
 *   3. Impede conceder lifetime a outro admin
 *   4. Impede duplicidade: partial unique index (DB) + check (API)
 *   5. Auditoria completa: quem, quando, por quê
 *   6. Atualiza profile.subscription_status = 'lifetime'
 *
 * Body: { userId: string, motivo: string }
 */
export async function POST(request: NextRequest) {
  try {
    // ── 1. Autorização: dupla verificação de admin ──
    const isAllowed = await requireAdminSistema();
    if (!isAllowed) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    // Identificar o admin para auditoria
    const authClient = await createClient();
    const { data: { user: adminUser } } = await authClient.auth.getUser();
    const adminEmail = adminUser?.email || 'desconhecido';
    const adminId = adminUser?.id || '';

    // ── 2. Parse e validação de entrada ──
    const body = await request.json();
    const { userId, motivo } = body as { userId?: string; motivo?: string };

    if (!userId || typeof userId !== 'string' || !UUID_RE.test(userId)) {
      return NextResponse.json(
        { error: 'userId inválido.' },
        { status: 400 }
      );
    }

    if (!motivo || typeof motivo !== 'string' || motivo.trim().length < MIN_MOTIVO_LENGTH) {
      return NextResponse.json(
        { error: `Forneça um motivo justificando a concessão do plano vitalício (mínimo ${MIN_MOTIVO_LENGTH} caracteres).` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // ── 3. Verificar se o alvo é admin_sistema ──
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, role, email')
      .eq('id', userId)
      .maybeSingle();

    if (!targetProfile) {
      return NextResponse.json(
        { error: 'Usuário não encontrado.' },
        { status: 404 }
      );
    }

    if (targetProfile.role === 'admin_sistema') {
      return NextResponse.json(
        { error: 'Não é possível conceder plano vitalício a um administrador do sistema.' },
        { status: 403 }
      );
    }

    // ── 4. Verificar se já tem assinatura active/pending/lifetime ──
    const { data: existingSub } = await supabase
      .from('assinaturas')
      .select('id, status, plano:planos(nome)')
      .eq('user_id', userId)
      .in('status', ['active', 'pending', 'lifetime'])
      .maybeSingle();

    if (existingSub) {
      const statusLabels: Record<string, string> = {
        active: 'ativa',
        pending: 'pendente',
        lifetime: 'vitalícia',
      };
      return NextResponse.json(
        {
          error: `Este usuário já possui uma assinatura ${statusLabels[existingSub.status] || existingSub.status}. Altere o status pela aba de assinaturas se necessário.`,
        },
        { status: 409 }
      );
    }

    // ── 5. Criar assinatura lifetime ──
    const now = new Date();
    const auditoria = `PLANO VITALÍCIO concedido por admin (${adminEmail}, id: ${adminId}) em ${now.toISOString()}. Motivo: ${motivo.trim()}`;

    const { data: novaAssinatura, error: insertErr } = await supabase
      .from('assinaturas')
      .insert({
        user_id: userId,
        plano_id: null, // lifetime não está vinculado a um plano específico
        status: 'lifetime',
        metodo_pagamento: 'lifetime_admin',
        data_inicio: now.toISOString(),
        data_fim: null, // NUNCA expira
        proximo_ciclo_em: null, // sem ciclos de pagamento
        motivo_cancelamento: auditoria,
      })
      .select('id, status, data_inicio')
      .single();

    if (insertErr) {
      console.error('[POST /grant-lifetime] Erro ao criar assinatura:', insertErr);

      // Se erro de constraint (unique), informar de forma clara
      if (insertErr.code === '23505') {
        return NextResponse.json(
          { error: 'Este usuário já possui uma assinatura ativa ou pendente.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Erro ao criar assinatura vitalícia.' },
        { status: 500 }
      );
    }

    // ── 6. Atualizar profile.subscription_status = 'lifetime' ──
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ subscription_status: 'lifetime' })
      .eq('id', userId);

    if (profileErr) {
      console.error('[POST /grant-lifetime] Erro ao atualizar profile:', profileErr);
      // Não falhar — a assinatura foi criada
    }

    return NextResponse.json({
      success: true,
      message: `Plano vitalício concedido ao usuário ${targetProfile.email || userId}.`,
      assinatura: novaAssinatura,
    }, { status: 201 });

  } catch (err) {
    console.error('[POST /api/admin-sistema/assinaturas/grant-lifetime] Erro:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
