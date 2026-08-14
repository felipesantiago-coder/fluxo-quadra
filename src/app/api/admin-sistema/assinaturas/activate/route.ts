import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminSistema } from '@/lib/admin-auth';

/**
 * POST /api/admin-sistema/assinaturas/activate
 * Permite ao admin ativar manualmente uma assinatura para um usuário existente,
 * sem depender do webhook do Mercado Pago.
 *
 * Body: { userId: string, planoId: string, motivo: string }
 *
 * Segurança:
 *   - requireAdminSistema() verifica autenticação + role
 *   - Exige motivo descritivo (mínimo 10 caracteres)
 *   - Registra auditoria no motivo_cancelamento da assinatura
 *   - Impede duplicação: se o usuário já tem assinatura active/pending, retorna 409
 */
export async function POST(request: NextRequest) {
  try {
    const isAllowed = await requireAdminSistema();
    if (!isAllowed) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    // Buscar dados do admin para auditoria
    const authClient = await createClient();
    const { data: { user: adminUser } } = await authClient.auth.getUser();
    const adminEmail = adminUser?.email || 'desconhecido';

    const body = await request.json();
    const { userId, planoId, motivo } = body as {
      userId?: string;
      planoId?: string;
      motivo?: string;
    };

    // Validações
    if (!userId || !planoId) {
      return NextResponse.json(
        { error: 'userId e planoId são obrigatórios.' },
        { status: 400 }
      );
    }

    if (!motivo || motivo.trim().length < 10) {
      return NextResponse.json(
        { error: 'Forneça um motivo detalhado (mínimo 10 caracteres) justificando a ativação manual.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verificar se o plano existe
    const { data: plano, error: planoErr } = await supabase
      .from('planos')
      .select('id, nome, preco, periodo_meses')
      .eq('id', planoId)
      .single();

    if (planoErr || !plano) {
      return NextResponse.json(
        { error: 'Plano não encontrado.' },
        { status: 404 }
      );
    }

    // Verificar se o usuário já possui assinatura ativa ou pendente
    const { data: existingSub } = await supabase
      .from('assinaturas')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['active', 'pending'])
      .maybeSingle();

    if (existingSub) {
      return NextResponse.json(
        {
          error: `Este usuário já possui uma assinatura ${existingSub.status === 'active' ? 'ativa' : 'pendente'} (ID: ${existingSub.id}). Altere o status pela aba de assinaturas se necessário.`,
        },
        { status: 409 }
      );
    }

    // Calcular datas da assinatura
    const now = new Date();
    const dataFim = new Date(now);
    dataFim.setMonth(dataFim.getMonth() + (plano.periodo_meses as number));

    // Próximo ciclo = mesmo dia do próximo mês
    const proximoCiclo = new Date(now);
    proximoCiclo.setMonth(proximoCiclo.getMonth() + 1);

    const auditoria = `Ativado manualmente por admin (${adminEmail}) em ${now.toISOString()}. Motivo: ${motivo.trim()}`;

    // Criar assinatura ativa
    const { data: novaAssinatura, error: insertErr } = await supabase
      .from('assinaturas')
      .insert({
        user_id: userId,
        plano_id: planoId,
        status: 'active',
        metodo_pagamento: 'manual_admin',
        data_inicio: now.toISOString(),
        data_fim: dataFim.toISOString(),
        proximo_ciclo_em: proximoCiclo.toISOString(),
        motivo_cancelamento: auditoria,
      })
      .select('id, status, data_inicio, data_fim')
      .single();

    if (insertErr || !novaAssinatura) {
      console.error('[POST /api/admin-sistema/assinaturas/activate] Erro ao criar:', insertErr);
      return NextResponse.json(
        { error: 'Erro ao criar assinatura. Verifique se as tabelas existem.' },
        { status: 500 }
      );
    }

    // Atualizar subscription_status no profile
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ subscription_status: 'active' })
      .eq('id', userId);

    if (profileErr) {
      console.error('[POST /api/admin-sistema/assinaturas/activate] Erro ao atualizar profile:', profileErr);
      // Não falhar — a assinatura foi criada, o profile pode ser atualizado depois
    }

    return NextResponse.json({
      success: true,
      message: `Assinatura ativada manualmente no plano "${plano.nome}".`,
      assinatura: novaAssinatura,
    }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/admin-sistema/assinaturas/activate] Erro:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
