import { NextResponse } from "next/server";
import { requireAdminSistema } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const VALID_ROLES = ["comum", "coordenador", "admin_sistema"] as const;

type ValidRole = (typeof VALID_ROLES)[number];

function isValidRole(r: string): r is ValidRole {
  return (VALID_ROLES as readonly string[]).includes(r);
}

// ─── GET: listar todos os usuários ─────────────────────────────────────────
export async function GET() {
  try {
    const isAllowed = await requireAdminSistema();
    if (!isAllowed) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

    const supabase = await createClient();

    let profiles;

    // Nível 1: query completa
    const { data: dataFull, error: errFull } = await supabase
      .from("profiles")
      .select("id, email, display_name, role, must_change_password, must_setup_mfa, mfa_enabled, created_at")
      .order("created_at", { ascending: false });

    if (!errFull) {
      profiles = dataFull;
    } else {
      // Nível 2
      const { data: dataMid, error: errMid } = await supabase
        .from("profiles")
        .select("id, email, display_name, role, mfa_enabled, created_at")
        .order("created_at", { ascending: false });

      if (!errMid) {
        profiles = (dataMid || []).map((p: Record<string, unknown>) => ({
          ...p,
          must_change_password: false,
          must_setup_mfa: false,
        }));
      } else {
        // Nível 3
        const { data: dataBase, error: errBase } = await supabase
          .from("profiles")
          .select("id, email, display_name, role, created_at")
          .order("created_at", { ascending: false });

        if (errBase) {
          return NextResponse.json({ error: errBase.message }, { status: 500 });
        }
        profiles = (dataBase || []).map((p: Record<string, unknown>) => ({
          ...p,
          mfa_enabled: false,
          must_change_password: false,
          must_setup_mfa: false,
        }));
      }
    }

    return NextResponse.json({ users: profiles || [] });
  } catch (err) {
    console.error("Erro ao buscar usuários:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ─── PATCH: alterar role de um usuário ──────────────────────────────────────
export async function PATCH(request: Request) {
  try {
    const isAllowed = await requireAdminSistema();
    if (!isAllowed) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    const body = await request.json();
    const { userId, role } = body as { userId?: string; role?: string };

    if (!userId || !role) {
      return NextResponse.json(
        { error: "userId e role são obrigatórios" },
        { status: 400 }
      );
    }

    if (!isValidRole(role)) {
      return NextResponse.json(
        { error: `Role inválido. Valores aceitos: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    // Impedir que o admin remova o próprio privilégio de admin
    if (adminUser && userId === adminUser.id && role !== "admin_sistema") {
      return NextResponse.json(
        { error: "Você não pode remover seu próprio acesso de administrador" },
        { status: 403 }
      );
    }

    // FIX: Usar adminClient (service_role) para bypassar o trigger
    // protect_profile_columns que reverte mudanças de role em requests com JWT.
    const adminClient = createAdminClient();

    // Buscar role atual para auditoria
    const { data: currentProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    const { data, error: updateError } = await adminClient
      .from("profiles")
      .update({ role })
      .eq("id", userId)
      .select("id, email, display_name, role")
      .single();

    if (updateError) {
      console.error("Erro ao atualizar role:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Registrar mudança na auditoria (best-effort)
    if (currentProfile && adminUser) {
      try {
        await adminClient.from("role_change_audit").insert({
          target_user_id: userId,
          actor_user_id: adminUser.id,
          old_role: currentProfile.role,
          new_role: role,
        });
      } catch {
        // Auditar é best-effort, não bloqueia a operação
      }
    }

    return NextResponse.json({ user: data });
  } catch (err) {
    console.error("Erro ao atualizar role:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ─── DELETE: excluir conta de usuário ──────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    const isAllowed = await requireAdminSistema();
    if (!isAllowed) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

    // Verificar quem é o admin para impedir auto-exclusão
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    const body = await request.json();
    const { userId } = body as { userId?: string };

    if (!userId) {
      return NextResponse.json(
        { error: "userId é obrigatório" },
        { status: 400 }
      );
    }

    // Impedir que o admin exclua a própria conta
    if (adminUser && userId === adminUser.id) {
      return NextResponse.json(
        { error: "Você não pode excluir sua própria conta de administrador" },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();

    // Buscar dados do usuário para resposta e verificação
    const { data: targetProfile, error: fetchErr } = await adminClient
      .from("profiles")
      .select("id, email, display_name, role")
      .eq("id", userId)
      .maybeSingle();

    if (fetchErr || !targetProfile) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se o alvo também é admin_sistema (proteção extra)
    if (targetProfile.role === "admin_sistema") {
      return NextResponse.json(
        { error: "Não é possível excluir outro administrador do sistema" },
        { status: 403 }
      );
    }

    // Excluir usuário via Admin API (remove de auth.users + profiles via CASCADE)
    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteErr) {
      console.error("Erro ao excluir usuário:", deleteErr);
      return NextResponse.json(
        { error: deleteErr.message || "Erro ao excluir usuário" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Usuário ${targetProfile.email} excluído permanentemente`,
      deletedUser: {
        id: targetProfile.id,
        email: targetProfile.email,
        display_name: targetProfile.display_name,
      },
    });
  } catch (err) {
    console.error("Erro ao excluir usuário:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
