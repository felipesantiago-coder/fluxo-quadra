/**
 * api-auth.ts
 *
 * Helpers compartilhados para autenticação e autorização em API routes.
 * Evita duplicação de chamadas de autenticação.
 */

import { createClient } from '@/lib/supabase/server';
import { requireActiveSubscription, subscriptionDeniedResponse, SubscriptionGuardResult } from '@/lib/subscription-guard';
import { NextResponse } from 'next/server';

// E-mails autorizados como admin (fallback legado)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter((e) => e.length > 0);

/**
 * Verifica se o usuário pode LER dados protegidos.
 * Admin sempre pode. Usuários normais precisam de assinatura ativa.
 *
 * Usa requireActiveSubscription() internamente (que já verifica admin),
 * evitando chamadas duplicadas de autenticação.
 */
export async function requireReadAccess(): Promise<NextResponse | null> {
  const guard = await requireActiveSubscription();
  if (!guard.valid) {
    return subscriptionDeniedResponse(guard);
  }
  return null;
}

/**
 * Verifica se o usuário é admin para operações de ESCRITA.
 * Retorna null se autorizado, ou uma resposta de erro.
 */
export async function requireWriteAccess(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
  }

  // Verificar role do perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if ((profile as Record<string, unknown> | null)?.role === 'admin_sistema') {
    return null;
  }

  // Fallback para e-mail (legado)
  if (ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
    return null;
  }

  return NextResponse.json({ error: 'Nao autorizado.' }, { status: 403 });
}
