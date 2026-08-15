import { createClient } from "@/lib/supabase/server";

/**
 * Verifica se o usuário autenticado é admin_sistema.
 * Retorna true se permitido, false caso contrário.
 *
 * SEGURANÇA: Verifica SOMENTE o profile.role no banco de dados.
 * O email hardcoded foi removido — a criação de admins
 * deve ser feita exclusivamente via seed-admin ou grant-lifetime.
 *
 * SEC-AUDIT: Removido fallback de email hardcoded para evitar
 * que um atacante que registre o email bypass a verificação de role.
 */
export async function requireAdminSistema(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // Verificar role pelo profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) return false;

  return profile.role === "admin_sistema";
}
