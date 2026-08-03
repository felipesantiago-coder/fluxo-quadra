import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildAuthenticationOptions,
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

    // Fetch all passkeys for this user
    const { data: passkeys } = await supabase
      .from("user_passkeys")
      .select("credential_id, transports")
      .eq("user_id", user.id);

    if (!passkeys || passkeys.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma passkey registrada" },
        { status: 404 }
      );
    }

    const options = buildAuthenticationOptions(
      passkeys.map((p) => ({
        credentialID: p.credential_id,
        transports: p.transports as string[] | undefined,
      }))
    );

    // Store the challenge for later verification
    storeChallenge(`webauthn_auth_${user.id}`, options.challenge);

    return NextResponse.json({ options });
  } catch (err) {
    console.error("Erro ao iniciar autenticação WebAuthn:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Erro interno: ${msg}` },
      { status: 500 }
    );
  }
}
