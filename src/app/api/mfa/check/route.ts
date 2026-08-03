import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    // Verificar se tem TOTP verificado
    const { data: totp } = await supabase
      .from("user_totp")
      .select("id")
      .eq("user_id", user.id)
      .eq("verified", true)
      .maybeSingle();

    // Verificar se tem passkeys
    const { data: passkeys } = await supabase
      .from("user_passkeys")
      .select("id")
      .eq("user_id", user.id);

    return NextResponse.json({
      hasTotp: !!totp,
      hasPasskey: !!(passkeys && passkeys.length > 0),
      mfaEnabled: !!totp || !!(passkeys && passkeys.length > 0),
    });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
