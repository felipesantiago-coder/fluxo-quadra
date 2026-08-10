import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    // Buscar profile, totp e passkeys em PARALELO
    const [profileRes, totpRes, passkeysRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("mfa_enabled")
        .eq("id", user.id)
        .single()
        .then(r => ({ data: r.data, error: r.error })),
      supabase
        .from("user_totp")
        .select("id, verified, created_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_passkeys")
        .select("id, device_name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    const profileMfa = profileRes.data?.mfa_enabled ?? false;
    const hasVerifiedCredential = !!totpRes.data?.verified || (passkeysRes.data && passkeysRes.data.length > 0);
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
      hasTotp: !!totpRes.data?.verified,
      totp_configured: !!totpRes.data,
      totp_verified: !!totpRes.data?.verified,
      passkeys: passkeysRes.data || [],
    });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
