import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ADMIN_EMAIL = "prosperosdirecional@gmail.com";

/**
 * Verifica se o usuário autenticado é admin_sistema.
 * Retorna true se permitido, false caso contrário.
 *
 * SEGURANÇA: Usa double-check (profile.role + email hardcoded).
 * O email hardcoded é um fallback caso o profile não exista ainda.
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

  const isAdminRole = !profileError && profile?.role === "admin_sistema";
  const isAdminEmail = user.email?.toLowerCase() === ADMIN_EMAIL;

  return isAdminRole || isAdminEmail;
}
