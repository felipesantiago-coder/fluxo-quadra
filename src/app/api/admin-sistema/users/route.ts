import { NextResponse } from "next/server";
import { requireAdminSistema } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { supabase, error } = await requireAdminSistema();
    if (error) return error;

    // Buscar todos os perfis (admin pode ver todos via RLS)
    // Query resiliente: 3 níveis de fallback conforme as colunas existam
    let profiles;

    // Nível 1: query completa (todas as migrations executadas)
    const { data: dataFull, error: errFull } = await supabase
      .from("profiles")
      .select("id, email, display_name, role, must_change_password, must_setup_mfa, mfa_enabled, created_at")
      .order("created_at", { ascending: false });

    if (!errFull) {
      profiles = dataFull;
    } else {
      // Nível 2: mfa_enabled existe mas must_change/must_setup não
      const { data: dataMid, error: errMid } = await supabase
        .from("profiles")
        .select("id, email, display_name, role, mfa_enabled, created_at")
        .order("created_at", { ascending: false });

      if (!errMid) {
        profiles = (dataMid || []).map((p: Record<string, unknown>) => ({
          ...p,
          must_change_password: false,
          must_setup_mfa: false,
        }));
      } else {
        // Nível 3: apenas colunas do schema base
        const { data: dataBase, error: errBase } = await supabase
          .from("profiles")
          .select("id, email, display_name, role, created_at")
          .order("created_at", { ascending: false });

        if (errBase) {
          return NextResponse.json({ error: errBase.message }, { status: 500 });
        }
        profiles = (dataBase || []).map((p: Record<string, unknown>) => ({
          ...p,
          mfa_enabled: false,
          must_change_password: false,
          must_setup_mfa: false,
        }));
      }
    }

    return NextResponse.json({ users: profiles || [] });
  } catch (err) {
    console.error("Erro ao buscar usuários:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
