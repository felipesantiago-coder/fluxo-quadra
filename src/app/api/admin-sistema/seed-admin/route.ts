import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "prosperosdirecional@gmail.com";
const ADMIN_PASSWORD = "@DminS1St3m@";

export async function POST() {
  try {
    const supabase = await createClient();

    // Verificar se admin já existe
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("email", ADMIN_EMAIL)
      .maybeSingle();

    if (existingProfile) {
      // Atualizar role se necessário
      if (existingProfile.role !== "admin_sistema") {
        await supabase
          .from("profiles")
          .update({ role: "admin_sistema" })
          .eq("id", existingProfile.id);
        return NextResponse.json({ message: "Perfil atualizado para admin_sistema" });
      }
      return NextResponse.json({ message: "Administrador do sistema já existe" });
    }

    // Criar usuário via signUp
    const { data, error } = await supabase.auth.signUp({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      options: {
        data: {
          display_name: "Administrador do Sistema",
        },
      },
    });

    if (error) {
      // Se o usuário já existe no auth mas não no profiles
      if (error.message.includes("already registered") || error.message.includes("already been registered")) {
        return NextResponse.json({
          message: "Usuário já existe no sistema de autenticação. Execute a query SQL manualmente para atualizar o perfil.",
          sql: `UPDATE public.profiles SET role = 'admin_sistema' WHERE email = '${ADMIN_EMAIL}';`,
        });
      }
      console.error("Erro ao criar admin:", error.message);
      return NextResponse.json({ error: "Erro ao criar administrador: " + error.message }, { status: 500 });
    }

    if (data.user) {
      // Atualizar role do perfil recém-criado
      await supabase
        .from("profiles")
        .update({ role: "admin_sistema" })
        .eq("id", data.user.id);
    }

    return NextResponse.json({
      message: "Administrador do sistema criado com sucesso",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
  } catch (err) {
    console.error("Erro no seed admin:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
