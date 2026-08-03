import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { verifyTOTP } from "@/lib/mfa/totp";
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

    // Parse request body
    let body: { token?: string; isSetup?: boolean; redirectUrl?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corpo da requisição inválido" },
        { status: 400 }
      );
    }

    if (!body.token || typeof body.token !== "string") {
      return NextResponse.json(
        { error: "Token é obrigatório" },
        { status: 400 }
      );
    }

    // Fetch TOTP record for this user
    const { data: record, error: fetchError } = await supabase
      .from("user_totp")
      .select("secret, verified")
      .eq("user_id", user.id)
      .single();

    if (fetchError || !record) {
      return NextResponse.json(
        { error: "TOTP não configurado" },
        { status: 404 }
      );
    }

    // Verify the TOTP token
    const isValid = verifyTOTP(record.secret, body.token);

    if (!isValid) {
      return NextResponse.json(
        { error: "Código inválido" },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();

    // Setup flow — activate TOTP
    if (body.isSetup === true) {
      const { error: updateTotpError } = await supabase
        .from("user_totp")
        .update({ verified: true })
        .eq("user_id", user.id);

      if (updateTotpError) {
        console.error("Erro ao ativar TOTP:", updateTotpError.message);
        return NextResponse.json(
          { error: "Erro ao ativar TOTP" },
          { status: 500 }
        );
      }

      // Atualizar perfil (pode falhar por RLS, mas TOTP já está ativo)
      const { error: updateProfileError } = await supabase
        .from("profiles")
        .update({ mfa_enabled: true })
        .eq("id", user.id);

      if (updateProfileError) {
        // RLS pode bloquear o update, mas o TOTP já foi ativado
        // A API de status detecta a inconsistência e corrige
        console.warn("Não conseguiu atualizar mfa_enabled no perfil (RLS?):", updateProfileError.message);
      }

      return NextResponse.json({
        success: true,
        message: "TOTP ativado com sucesso",
      });
    }

    // Login verification flow
    cookieStore.set("mfa_verified", "true", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });
    // Limpar cookie de pendência MFA
    cookieStore.delete("mfa_pending");

    // Update mfa_enabled in profiles
    await supabase
      .from("profiles")
      .update({ mfa_enabled: true })
      .eq("id", user.id);

    // Record login event (fire-and-forget style, but we await since it's fine)
    await recordLoginEvent({
      userId: user.id,
      userAgent: request.headers.get("user-agent"),
      ip:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown",
    });

    return NextResponse.json({
      success: true,
      redirect: body.redirectUrl || "/projetos",
    });
  } catch (err) {
    console.error("Erro na verificação TOTP:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Erro interno: ${msg}` },
      { status: 500 }
    );
  }
}
