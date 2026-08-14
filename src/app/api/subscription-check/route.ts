import { NextResponse } from 'next/server';  import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/subscription-check
 * Verifica se o usuário logado tem assinatura ativa.
 * Usado pela página /aguardando-pagamento para poll.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Verificar assinatura ativa
    const { data: assinatura } = await supabase
      .from('assinaturas')
      .select('id, status, plano:planos(nome)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    // Verificar perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, display_name')
      .eq('id', user.id)
      .maybeSingle();

    if (assinatura) {
      return NextResponse.json({
        authenticated: true,
        subscriptionActive: true,
        subscription: {
          id: assinatura.id,
          status: assinatura.status,
          planoNome: (assinatura.plano as Record<string, unknown>)?.nome || 'Plano',
        },
        profile: {
          displayName: profile?.display_name || '',
          subscriptionStatus: profile?.subscription_status || 'none',
        },
      });
    }

    // Verificar se há assinatura pendente
    const { data: pendingSub } = await supabase
      .from('assinaturas')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'paused'])
      .maybeSingle();

    return NextResponse.json({
      authenticated: true,
      subscriptionActive: false,
      hasPendingSubscription: !!pendingSub,
      profile: {
        displayName: profile?.display_name || '',
        subscriptionStatus: profile?.subscription_status || 'none',
      },
    });
  } catch (err) {
    console.error('[GET /api/subscription-check] Erro:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
