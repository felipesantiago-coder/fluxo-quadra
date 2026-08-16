import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/subscription-refresh
 *
 * Atualiza o cookie subscription_status com o status real do banco.
 * Chamado periodicamente pelo cliente (a cada 5 min) ou após login.
 *
 * Retorna o status real e configura o cookie com TTL curto (5 min).
 * O cookie curto garante que o middleware sempre tera dados relativamente
 * recentes sem precisar chamar o banco a cada request.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const response = NextResponse.json({ authenticated: false });
      // Limpar cookie se deslogado
      response.cookies.set('subscription_status', '', {
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
      });
      return response;
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, subscription_status')
      .eq('id', user.id)
      .maybeSingle();

    const profileData = profile as Record<string, unknown> | null;
    const isAdmin = profileData?.role === 'admin_sistema';

    if (isAdmin) {
      const response = NextResponse.json({
        authenticated: true,
        status: 'active',
        isAdmin: true,
      });
      response.cookies.set('subscription_status', 'active', {
        path: '/',
        maxAge: 300, // 5 minutos
        sameSite: 'lax',
      });
      return response;
    }

    // Verificar assinatura real no banco (incluindo data_fim)
    const admin = createAdminClient();
    const { data: assinatura } = await admin
      .from('assinaturas')
      .select('id, status, data_fim')
      .eq('user_id', user.id)
      .in('status', ['active', 'lifetime'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let realStatus = 'none';

    if (assinatura) {
      if (assinatura.status === 'lifetime') {
        realStatus = 'lifetime';
      } else if (assinatura.data_fim && new Date(assinatura.data_fim) <= new Date()) {
        realStatus = 'none'; // Expirada
      } else {
        realStatus = 'active';
      }
    }

    // Sincronizar perfil se inconsistente
    if (profileData && profileData.subscription_status !== realStatus && realStatus === 'none') {
      await admin
        .from('profiles')
        .update({ subscription_status: 'none' })
        .eq('id', user.id);
    }

    const response = NextResponse.json({
      authenticated: true,
      status: realStatus,
      isAdmin: false,
    });

    // Definir cookie com TTL curto (5 min)
    response.cookies.set('subscription_status', realStatus, {
      path: '/',
      maxAge: 300, // 5 minutos
      sameSite: 'lax',
    });

    return response;
  } catch (err) {
    console.error('[GET /api/subscription-refresh] Erro:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
