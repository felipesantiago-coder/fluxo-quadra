import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Limpar flag must_setup_mfa e habilitar MFA no perfil
    const { error } = await supabase
      .from("profiles")
      .update({
        must_setup_mfa: false,
        mfa_enabled: true,
      })
      .eq("id", user.id);

    if (error) {
      console.error("Erro ao completar MFA onboarding:", error.message);
      return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }

    // Limpar cookie de primeiro acesso
    const cookieStore = await cookies();
    cookieStore.delete("first_login_step");

    return NextResponse.json({
      success: true,
      message: "Configuração de segurança concluída",
    });
  } catch (err) {
    console.error("Erro ao completar MFA onboarding:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
