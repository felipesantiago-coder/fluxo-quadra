import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cancelMpSubscription } from '@/lib/mercadopago';

/**
 * POST /api/subscriptions/cancel
 * Cancela a assinatura ativa do usuário.
 * Também cancela no Mercado Pago se houver subscription_id.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // Buscar assinatura ativa
    const { data: assinatura, error: assErr } = await supabase
      .from('assinaturas')
      .select('id, mercadopago_subscription_id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (assErr || !assinatura) {
      return NextResponse.json(
        { error: 'Nenhuma assinatura ativa encontrada.' },
        { status: 404 }
      );
    }

    // Cancelar no Mercado Pago (se tiver ID)
    if (assinatura.mercadopago_subscription_id) {
      try {
        await cancelMpSubscription(assinatura.mercadopago_subscription_id);
      } catch (mpErr) {
        console.error(
          '[POST /api/subscriptions/cancel] Erro ao cancelar no MP:',
          mpErr
        );
        // Continuar mesmo se falhar no MP — o registro local será cancelado
      }
    }

    // Atualizar no banco
    const { error: updateErr } = await supabase
      .from('assinaturas')
      .update({
        status: 'cancelled_by_user',
        cancelado_em: new Date().toISOString(),
        motivo_cancelamento: 'Cancelado pelo usuário via painel',
      })
      .eq('id', assinatura.id);

    if (updateErr) {
      console.error('[POST /api/subscriptions/cancel] Erro ao atualizar:', updateErr);
      return NextResponse.json({ error: 'Erro ao cancelar assinatura.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Assinatura cancelada com sucesso.' });
  } catch (err) {
    console.error('[POST /api/subscriptions/cancel] Erro:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
