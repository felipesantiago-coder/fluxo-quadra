import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ADMIN_EMAIL = "prosperosdirecional@gmail.com";

/**
 * Verifica se o usuário autenticado é admin_sistema.
 * Tenta buscar o profile; se falhar, usa fallback por email.
 * Retorna { supabase, error: null } ou { supabase, error: NextResponse }.
 */
export async function requireAdminSistema() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }

  // Verificar role pelo profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdminRole = !profileError && profile?.role === "admin_sistema";
  const isAdminEmail = user.email?.toLowerCase() === ADMIN_EMAIL;

  if (!isAdminRole && !isAdminEmail) {
    return {
      supabase,
      user,
      error: NextResponse.json(
        { error: "Acesso restrito ao administrador do sistema" },
        { status: 403 }
      ),
    };
  }

  return { supabase, user, error: null };
}
