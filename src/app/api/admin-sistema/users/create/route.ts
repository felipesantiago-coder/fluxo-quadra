import { NextRequest, NextResponse } from "next/server";
import { requireAdminSistema } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/password-validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const isAllowed = await requireAdminSistema();
    if (!isAllowed) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

    const body = await request.json();
    const { email, displayName, role } = body as {
      email: string;
      displayName?: string;
      role?: "comum" | "coordenador" | "admin_sistema";
    };

    // Validações
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "E-mail inválido" },
        { status: 400 }
      );
    }

    const userRole = role || "comum";
    if (!["comum", "coordenador", "admin_sistema"].includes(userRole)) {
      return NextResponse.json(
        { error: "Role inválido" },
        { status: 400 }
      );
    }

    // Gerar senha temporária
    const tempPassword = generateTempPassword();

    // Criar usuário via admin API
    const admin = createAdminClient();
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        display_name: displayName || email.split("@")[0],
        role: userRole,
        must_change_password: true,
        must_setup_mfa: true,
      },
    });

    if (createError) {
      if (createError.message.includes("already registered")) {
        return NextResponse.json(
          { error: "Este e-mail já está cadastrado" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Usuário criado com sucesso",
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        tempPassword,
      },
    });
  } catch (err) {
    console.error("Erro ao criar usuário:", err);
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
