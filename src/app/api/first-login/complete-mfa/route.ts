import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

    // SEC-AUDIT FIX: Verificar se o usuário REALMENTE configurou MFA
    // antes de marcar must_setup_mfa como concluído.
    // Impede bypass do onboarding de MFA via chamada direta à API.
    const adminClient = createAdminClient();

    const { data: totp } = await adminClient
      .from("user_totp")
      .select("id")
      .eq("user_id", user.id)
      .eq("verified", true)
      .maybeSingle();

    const { count: passkeyCount } = await adminClient
      .from("user_passkeys")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const hasMfa = !!(totp || (passkeyCount && passkeyCount > 0));

    if (!hasMfa) {
      return NextResponse.json(
        { error: "Configure pelo menos um fator de autenticação (TOTP ou Chave de Acesso) antes de continuar." },
        { status: 400 }
      );
    }

    // Limpar flag must_setup_mfa e habilitar MFA no perfil
    const { error } = await adminClient
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
