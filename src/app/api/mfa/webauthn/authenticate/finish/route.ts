import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  verifyAuthentication,
  consumeChallenge,
  getRPConfigFromRequest,
} from "@/lib/mfa/webauthn";
import { recordLoginEvent } from "@/lib/mfa/email";

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
    const { response, redirectUrl } = body as {
      response: {
        id: string;
        rawId: string;
        response: {
          authenticatorData: string;
          clientDataJSON: string;
          signature: string;
        };
        type: string;
      };
      redirectUrl?: string;
    };

    // Consume the stored challenge — one-time use
    const challenge = consumeChallenge(`webauthn_auth_${user.id}`);
    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge expirada ou inválida" },
        { status: 400 }
      );
    }

    // Find the matching credential from the database
    const { data: cred, error: credError } = await supabase
      .from("user_passkeys")
      .select("credential_id, public_key, counter")
      .eq("user_id", user.id)
      .eq("credential_id", response.id)
      .single();

    if (credError || !cred) {
      return NextResponse.json(
        { error: "Credencial não encontrada" },
        { status: 400 }
      );
    }

    // v13 espera publicKey como Uint8Array.
    // Novos registros: base64 → Uint8Array.
    // Registros antigos (JSON.stringify de Uint8Array): detectar e converter.
    let publicKey: Uint8Array;
    if (typeof cred.public_key === "string") {
      // Tentar JSON.parse — se resultar em objeto com chaves numéricas, é Uint8Array serializado
      try {
        const parsed = JSON.parse(cred.public_key);
        if (parsed && typeof parsed === "object" && !ArrayBuffer.isView(parsed)) {
          // Objeto com chaves numéricas = Uint8Array antigo (JSON.stringify)
          const bytes = new Uint8Array(Object.keys(parsed).length);
          for (const k of Object.keys(parsed)) {
            bytes[Number(k)] = parsed[k];
          }
          publicKey = bytes;
        } else {
          // É base64 puro
          publicKey = new Uint8Array(Buffer.from(cred.public_key, "base64"));
        }
      } catch {
        // Não é JSON — tratar como base64
        publicKey = new Uint8Array(Buffer.from(cred.public_key, "base64"));
      }
    } else {
      // Já é Uint8Array (improvável vir do banco, mas cobertura defensiva)
      publicKey = cred.public_key;
    }

    const rpConfig = getRPConfigFromRequest(request);

    // v13: verifyAuthentication é async
    const verification = await verifyAuthentication(response, challenge, {
      credentialID: cred.credential_id,
      publicKey,
      counter: cred.counter,
    }, rpConfig);

    if (!verification.authenticationInfo) {
      return NextResponse.json(
        { error: "Falha na verificação da autenticação" },
        { status: 400 }
      );
    }

    // Update the counter to prevent replay attacks
    const { error: updateError } = await supabase
      .from("user_passkeys")
      .update({ counter: verification.authenticationInfo.newCounter })
      .eq("user_id", user.id)
      .eq("credential_id", response.id);

    if (updateError) {
      console.error("Erro ao atualizar counter:", updateError.message);
    }

    // Set the MFA verified cookie
    const cookieStore = await cookies();
    cookieStore.set("mfa_verified", "true", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });
    cookieStore.delete("mfa_pending");

    // Record the login event
    const userAgent = request.headers.get("user-agent");
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    recordLoginEvent({ userId: user.id, userAgent, ip }).catch(() => {});

    return NextResponse.json({
      success: true,
      redirect: redirectUrl || "/projetos",
    });
  } catch (err) {
    console.error("Erro ao finalizar autenticação WebAuthn:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Erro interno: ${msg}` },
      { status: 500 }
    );
  }
}
