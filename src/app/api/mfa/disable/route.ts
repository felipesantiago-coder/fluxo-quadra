import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const passkeyId = body.passkeyId as string | undefined;

    if (passkeyId) {
      // Remover uma passkey específica
      const { error } = await supabase
        .from("user_passkeys")
        .delete()
        .eq("id", passkeyId)
        .eq("user_id", user.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Verificar se ainda tem algum MFA
      const { data: totp } = await supabase
        .from("user_totp")
        .select("id")
        .eq("user_id", user.id)
        .eq("verified", true)
        .maybeSingle();
      const { data: remainingPasskeys } = await supabase
        .from("user_passkeys")
        .select("id")
        .eq("user_id", user.id);

      const stillHasMfa = !!totp || !!(remainingPasskeys && remainingPasskeys.length > 0);
      if (!stillHasMfa) {
        await supabase.from("profiles").update({ mfa_enabled: false }).eq("id", user.id);
      }

      return NextResponse.json({ success: true, mfa_enabled: stillHasMfa });
    }

    // Desativar MFA completo: remover TOTP + todas passkeys
    await supabase.from("user_totp").delete().eq("user_id", user.id);
    await supabase.from("user_passkeys").delete().eq("user_id", user.id);
    await supabase.from("profiles").update({ mfa_enabled: false }).eq("id", user.id);

    return NextResponse.json({ success: true, mfa_enabled: false });
  } catch (err) {
    console.error("Erro ao desativar MFA:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
