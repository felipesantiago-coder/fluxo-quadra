/**
 * api-auth.ts
 *
 * Helpers compartilhados para autenticação e autorização em API routes.
 * Centraliza a lógica de verificação de admin usada por múltiplas APIs de units.
 */

import { createClient } from '@/lib/supabase/server';
import { requireActiveSubscription, subscriptionDeniedResponse } from '@/lib/subscription-guard';
import { NextResponse } from 'next/server';

// E-mails autorizados como admin
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter((e) => e.length > 0);

/**
 * Verifica se o usuário autenticado é admin.
 * Usa role do perfil (admin_sistema) como fonte primária.
 */
async function isAdminFromProfile(): Promise<{ isAdmin: boolean; userId: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { isAdmin: false, userId: '' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = (profile as Record<string, unknown> | null)?.role === 'admin_sistema';
  return { isAdmin, userId: user.id };
}

/**
 * Verifica se o usuário pode LER dados protegidos.
 * Admin sempre pode. Usuários normais precisam de assinatura ativa.
 */
export async function requireReadAccess(): Promise<NextResponse | null> {
  // Admin tem acesso total
  const { isAdmin } = await isAdminFromProfile();
  if (isAdmin) return null;

  // Usuário normal precisa de assinatura ativa
  const guard = await requireActiveSubscription();
  if (!guard.valid) {
    return subscriptionDeniedResponse(guard);
  }

  return null; // Acesso permitido
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
    return null; // Admin autorizado
  }

  // Fallback para e-mail (legado)
  if (ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
    return null;
  }

  console.warn(`[requireWriteAccess] Nao autorizado: ${user.email}`);
  return NextResponse.json({ error: 'Nao autorizado.' }, { status: 403 });
}
