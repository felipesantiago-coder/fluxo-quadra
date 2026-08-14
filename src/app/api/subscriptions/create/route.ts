import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createMpSubscription, type PlanoDB } from '@/lib/mercadopago';

/**
 * POST /api/subscriptions/create
 * Cria uma assinatura no Mercado Pago para o plano escolhido.
 * Retorna a URL de checkout (init_point) para redirecionar o usuário.
 *
 * Body: { planoId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // Parse body
    const body = await request.json();
    const { planoId } = body as { planoId?: string };

    if (!planoId) {
      return NextResponse.json({ error: 'planoId é obrigatório.' }, { status: 400 });
    }

    // 1. Buscar o plano no banco
    const { data: plano, error: planoErr } = await supabase
      .from('planos')
      .select('*')
      .eq('id', planoId)
      .eq('ativo', true)
      .single();

    if (planoErr || !plano) {
      return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
    }

    if (!plano.mercadopago_plan_id) {
      return NextResponse.json(
        { error: 'Plano ainda não sincronizado com o Mercado Pago. Contate o administrador.' },
        { status: 503 }
      );
    }

    // 2. Verificar se o usuário já tem assinatura ATIVA
    const { data: assinaturaAtiva } = await supabase
      .from('assinaturas')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (assinaturaAtiva) {
      return NextResponse.json(
        { error: 'Você já possui uma assinatura ativa.', subscriptionId: assinaturaAtiva.id },
        { status: 409 }
      );
    }

    // 3. Verificar se há assinatura pendente para este plano
    const { data: assinaturaPendente } = await supabase
      .from('assinaturas')
      .select('id, status, mercadopago_subscription_id')
      .eq('user_id', user.id)
      .eq('plano_id', planoId)
      .in('status', ['pending', 'paused'])
      .maybeSingle();

    // 4. Criar assinatura no Mercado Pago
    const mpResult = await createMpSubscription({
      planoId: plano.mercadopago_plan_id,
      userEmail: user.email || '',
      planoNome: plano.nome,
    });

    // 5. Registrar assinatura no banco
    const agora = new Date().toISOString();
    const dataFim = new Date(
      Date.now() + plano.periodo_meses * 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    if (assinaturaPendente) {
      // Atualizar a assinatura pendente existente
      await supabase
        .from('assinaturas')
        .update({
          mercadopago_subscription_id: mpResult.subscription_id,
          status: 'pending',
          updated_at: agora,
        })
        .eq('id', assinaturaPendente.id);
    } else {
      // Criar nova assinatura
      await supabase.from('assinaturas').insert({
        user_id: user.id,
        plano_id: planoId,
        mercadopago_subscription_id: mpResult.subscription_id,
        status: 'pending',
        data_inicio: null,
        data_fim: null,
      });
    }

    return NextResponse.json({
      checkoutUrl: mpResult.init_point,
      subscriptionId: mpResult.subscription_id,
    });
  } catch (err) {
    console.error('[POST /api/subscriptions/create] Erro:', err);

    // Se o erro for por falta de token do MP, retornar mensagem clara
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('MERCADOPAGO_ACCESS_TOKEN')) {
      return NextResponse.json(
        { error: 'Integração com pagamento não configurada. Contate o administrador.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: 'Erro ao criar assinatura.' }, { status: 500 });
  }
}
