import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildRegistrationOptions,
  storeChallenge,
} from "@/lib/mfa/webauthn";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Fetch existing passkeys to exclude from registration
    const { data: existingPasskeys } = await supabase
      .from("user_passkeys")
      .select("credential_id")
      .eq("user_id", user.id);

    const options = buildRegistrationOptions(
      user.id,
      user.email!,
      (existingPasskeys ?? []).map((p) => ({
        credentialID: p.credential_id,
      }))
    );

    // Store the challenge for later verification
    storeChallenge(`webauthn_reg_${user.id}`, options.challenge);

    return NextResponse.json({ options });
  } catch (err) {
    console.error("Erro ao iniciar registro WebAuthn:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Erro interno: ${msg}` },
      { status: 500 }
    );
  }
}
