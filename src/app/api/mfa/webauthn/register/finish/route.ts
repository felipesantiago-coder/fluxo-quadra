import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  verifyRegistration,
  consumeChallenge,
} from "@/lib/mfa/webauthn";

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

    const body = await request.json();
    const { response, deviceName } = body as {
      response: {
        id: string;
        rawId: string;
        response: {
          attestationObject: string;
          clientDataJSON: string;
        };
        type: string;
      };
      deviceName?: string;
    };

    // Consume the stored challenge — one-time use
    const challenge = consumeChallenge(`webauthn_reg_${user.id}`);
    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge expirada ou inválida" },
        { status: 400 }
      );
    }

    // Verify the registration response
    const verification = verifyRegistration(response, challenge);

    if (!verification.registrationInfo) {
      return NextResponse.json(
        { error: "Falha na verificação do registro" },
        { status: 400 }
      );
    }

    const regInfo = verification.registrationInfo;

    // Save the new passkey
    const { error: insertError } = await supabase.from("user_passkeys").insert({
      user_id: user.id,
      credential_id: regInfo.credentialID,
      public_key: Buffer.from(regInfo.credentialPublicKey).toString("base64"),
      counter: regInfo.counter,
      device_name: deviceName || "Dispositivo sem nome",
      transports: regInfo.credentialDeviceType
        ? [regInfo.credentialDeviceType]
        : [],
    });

    if (insertError) {
      console.error("Erro ao salvar passkey:", insertError.message);
      return NextResponse.json(
        { error: "Erro ao salvar passkey" },
        { status: 500 }
      );
    }

    // Enable MFA on the user profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ mfa_enabled: true })
      .eq("id", user.id);

    if (profileError) {
      console.error("Erro ao atualizar perfil:", profileError.message);
    }

    return NextResponse.json({
      success: true,
      message: "Passkey registrada com sucesso",
    });
  } catch (err) {
    console.error("Erro ao finalizar registro WebAuthn:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Erro interno: ${msg}` },
      { status: 500 }
    );
  }
}
