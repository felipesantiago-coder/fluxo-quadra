import { NextResponse } from 'next/server';
import { requireAdminSistema } from '@/lib/admin-auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/admin-sistema/assinaturas/fix-legacy
 *
 * Corrige em massa usuarios legados que estao bloqueados por subscription_status
 * incorreto. Executa as seguintes acoes:
 *
 * 1. Usuarios com perfil subscription_status = 'pending' mas SEM assinatura
 *    na tabela assinaturas -> muda para 'none' (erro de consistencia)
 * 2. Usuarios com perfil subscription_status = 'pending' e assinatura 'pending'
 *    mas criados ha mais de 24h -> muda perfil para 'none' e assinatura para 'expired'
 *    (pagamento nunca confirmado)
 *
 * Retorna resumo das correcoes feitas.
 */
export async function POST() {
  try {
    const isAllowed = await requireAdminSistema();
    if (!isAllowed) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    // Buscar dados do admin para auditoria
    const authClient = await createClient();
    const { data: { user: adminUser } } = await authClient.auth.getUser();
    const adminEmail = adminUser?.email || 'desconhecido';

    const supabase = createAdminClient();
    const now = new Date();
    const results = {
      fixed_no_subscription: [] as string[],
      fixed_expired: [] as string[],
      already_ok: 0,
      errors: [] as string[],
    };

    // ── 1. Usuarios com subscription_status='pending' mas sem assinatura ──
    const { data: pendingProfiles } = await supabase
      .from('profiles')
      .select('id, email, subscription_status')
      .eq('subscription_status', 'pending');

    if (pendingProfiles && pendingProfiles.length > 0) {
      for (const profile of pendingProfiles) {
        try {
          // Verificar se tem assinatura ativa ou pendente
          const { data: assinatura } = await supabase
            .from('assinaturas')
            .select('id, status, created_at')
            .eq('user_id', profile.id)
            .in('status', ['active', 'pending'])
            .maybeSingle();

          if (!assinatura) {
            // Sem assinatura — correcao: mudar para 'none'
            const { error } = await supabase
              .from('profiles')
              .update({ subscription_status: 'none' })
              .eq('id', profile.id);

            if (!error) {
              results.fixed_no_subscription.push(profile.email || profile.id);
            } else {
              results.errors.push(`Perfil ${profile.id}: ${error.message}`);
            }
          } else if (
            assinatura.status === 'pending' &&
            new Date(assinatura.created_at) < new Date(now.getTime() - 24 * 60 * 60 * 1000)
          ) {
            // Assinatura pendente ha mais de 24h — expirar
            const auditoria = `Expirado automaticamente por fix-legacy (admin: ${adminEmail}) em ${now.toISOString()}. Pagamento nunca confirmado apos 24h.`;

            await supabase
              .from('assinaturas')
              .update({
                status: 'expired',
                motivo_cancelamento: auditoria,
                updated_at: now.toISOString(),
              })
              .eq('id', assinatura.id);

            await supabase
              .from('profiles')
              .update({ subscription_status: 'none' })
              .eq('id', profile.id);

            results.fixed_expired.push(profile.email || profile.id);
          } else {
            results.already_ok++;
          }
        } catch (err) {
          results.errors.push(`Perfil ${profile.id}: ${err instanceof Error ? err.message : 'erro desconhecido'}`);
        }
      }
    }

    // ── 2. Usuarios com subscription_status NULL (coluna existe mas sem default) ──
    const { data: nullProfiles } = await supabase
      .from('profiles')
      .select('id, email, subscription_status')
      .is('subscription_status', null);

    if (nullProfiles && nullProfiles.length > 0) {
      const ids = nullProfiles.map((p: Record<string, unknown>) => p.id);
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_status: 'none' })
        .in('id', ids);

      if (!error) {
        for (const p of nullProfiles) {
          results.fixed_no_subscription.push((p as Record<string, unknown>).email as string || (p as Record<string, unknown>).id as string);
        }
      } else {
        results.errors.push(`Null profiles update: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Verificacao de usuarios legados concluida.',
      ...results,
      total_fixed: results.fixed_no_subscription.length + results.fixed_expired.length,
    });
  } catch (err) {
    console.error('[POST /api/admin-sistema/assinaturas/fix-legacy] Erro:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
