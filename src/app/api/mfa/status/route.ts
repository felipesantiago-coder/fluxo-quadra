import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    // MFA status: verificar tanto profiles.mfa_enabled quanto a existência de credenciais
    // (profiles.mfa_enabled pode estar desatualizado se a RLS bloqueou o update)
    let profileMfa = false;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("mfa_enabled")
        .eq("id", user.id)
        .single();
      profileMfa = profile?.mfa_enabled ?? false;
    } catch {
      // Se falhar, determinar pelo estado real das credenciais
    }

    // TOTP
    const { data: totp } = await supabase
      .from("user_totp")
      .select("id, verified, created_at")
      .eq("user_id", user.id)
      .maybeSingle();

    // Passkeys
    const { data: passkeys } = await supabase
      .from("user_passkeys")
      .select("id, device_name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // MFA está ativo se o perfil diz OU se existem credenciais verificadas
    const hasVerifiedCredential = !!totp?.verified || (passkeys && passkeys.length > 0);
    const mfaEnabled = profileMfa || hasVerifiedCredential;

    // Se as credenciais existem mas o perfil não reflete, tentar corrigir
    if (hasVerifiedCredential && !profileMfa) {
      supabase
        .from("profiles")
        .update({ mfa_enabled: true })
        .eq("id", user.id)
        .then(({ error }) => {
          if (error) console.error("Não conseguiu atualizar mfa_enabled no perfil:", error.message);
        });
    }

    return NextResponse.json({
      mfa_enabled: mfaEnabled,
      hasTotp: !!totp?.verified,
      totp_configured: !!totp,
      totp_verified: !!totp?.verified,
      passkeys: passkeys || [],
    });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
