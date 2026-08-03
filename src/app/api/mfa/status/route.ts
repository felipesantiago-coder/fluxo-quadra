import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    // MFA status do perfil
    const { data: profile } = await supabase
      .from("profiles")
      .select("mfa_enabled")
      .eq("id", user.id)
      .single();

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

    return NextResponse.json({
      mfa_enabled: profile?.mfa_enabled ?? false,
      hasTotp: !!totp?.verified,
      totp_configured: !!totp,
      totp_verified: !!totp?.verified,
      passkeys: passkeys || [],
    });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
