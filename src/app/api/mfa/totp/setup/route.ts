import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTOTP } from "@/lib/mfa/totp";

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

    // Check if TOTP already exists and is verified
    const { data: existingTOTP } = await supabase
      .from("user_totp")
      .select("verified")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingTOTP && existingTOTP.verified) {
      return NextResponse.json(
        { error: "TOTP já configurado" },
        { status: 409 }
      );
    }

    // Generate new TOTP secret and QR code
    const { secret, qrDataUrl } = await generateTOTP(user.email!);

    // Upsert the TOTP record (overwrite if unverified setup was in progress)
    const { error: upsertError } = await supabase
      .from("user_totp")
      .upsert(
        {
          user_id: user.id,
          secret,
          verified: false,
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("Erro ao salvar TOTP:", upsertError.message);
      return NextResponse.json(
        { error: "Erro ao salvar configuração TOTP" },
        { status: 500 }
      );
    }

    return NextResponse.json({ secret, qrDataUrl });
  } catch (err) {
    console.error("Erro na configuração TOTP:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Erro interno: ${msg}` },
      { status: 500 }
    );
  }
}
