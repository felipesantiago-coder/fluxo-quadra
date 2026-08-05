import { NextResponse } from "next/server";
import { requireAdminSistema } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { supabase, error } = await requireAdminSistema();
    if (error) return error;

    // Buscar todos os perfis (admin pode ver todos via RLS)
    // Query resiliente: tenta com colunas novas primeiro, fallback para colunas base
    let profiles;

    const { data: dataFull, error: errFull } = await supabase
      .from("profiles")
      .select("id, email, display_name, role, must_change_password, must_setup_mfa, mfa_enabled, created_at")
      .order("created_at", { ascending: false });

    if (!errFull) {
      profiles = dataFull;
    } else {
      // Colunas must_change_password / must_setup_mfa ainda não existem
      const { data: dataBase, error: errBase } = await supabase
        .from("profiles")
        .select("id, email, display_name, role, mfa_enabled, created_at")
        .order("created_at", { ascending: false });
      if (errBase) {
        return NextResponse.json({ error: errBase.message }, { status: 500 });
      }
      profiles = (dataBase || []).map((p: Record<string, unknown>) => ({
        ...p,
        must_change_password: false,
        must_setup_mfa: false,
      }));
    }

    return NextResponse.json({ users: profiles || [] });
  } catch (err) {
    console.error("Erro ao buscar usuários:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
