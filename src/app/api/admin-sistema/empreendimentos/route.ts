import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireAdminSistema() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }), user: null };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "admin_sistema") {
    return { supabase, error: NextResponse.json({ error: "Acesso restrito ao administrador do sistema" }, { status: 403 }), user: null };
  }
  return { supabase, error: null, user };
}

export async function GET() {
  try {
    const { supabase, error } = await requireAdminSistema();
    if (error) return error;

    const { data, err } = await supabase
      .from("empreendimentos")
      .select("*")
      .order("created_at", { ascending: true });

    if (err) {
      console.error("Erro ao buscar empreendimentos:", err.message);
      return NextResponse.json({ error: "Erro ao buscar empreendimentos" }, { status: 500 });
    }

    // Buscar contagem de unidades para cada empreendimento
    const enriched = await Promise.all(
      (data || []).map(async (emp) => {
        const { count } = await supabase
          .from("projeto_units")
          .select("*", { count: "exact", head: true })
          .eq("empreendimento_id", emp.id);
        return { ...emp, unit_count: count || 0 };
      })
    );

    return NextResponse.json({ empreendimentos: enriched, total: enriched.length });
  } catch (err) {
    console.error("Erro no GET /api/admin-sistema/empreendimentos:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

function generateSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, error } = await requireAdminSistema();
    if (error) return error;

    const body = await request.json();
    const { nome, regiao, descricao } = body;

    if (!nome || !regiao) {
      return NextResponse.json({ error: "Campos 'nome' e 'região' são obrigatórios" }, { status: 400 });
    }

    const slug = generateSlug(nome);

    const { data, err } = await supabase
      .from("empreendimentos")
      .insert({
        nome: nome.trim(),
        slug,
        regiao: regiao.trim(),
        descricao: descricao?.trim() || "",
        imagem_url: null,
      })
      .select()
      .single();

    if (err) {
      console.error("Erro ao criar empreendimento:", err.message);
      if (err.code === "23505") {
        return NextResponse.json({ error: "Já existe um empreendimento com esse nome" }, { status: 409 });
      }
      return NextResponse.json({ error: "Erro ao criar empreendimento" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Erro no POST /api/admin-sistema/empreendimentos:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, error } = await requireAdminSistema();
    if (error) return error;

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Campo 'id' é obrigatório" }, { status: 400 });
    }

    const { err } = await supabase.from("empreendimentos").delete().eq("id", id);

    if (err) {
      console.error("Erro ao remover empreendimento:", err.message);
      return NextResponse.json({ error: "Erro ao remover empreendimento" }, { status: 500 });
    }

    // Remover imagem se existir
    const fs = await import("fs/promises");
    const path = await import("path");
    const imagePath = path.join(process.cwd(), "public", "empreendimentos", `${id}.webp`);
    try {
      await fs.unlink(imagePath);
    } catch {
      // Arquivo pode não existir, ignorar
    }

    return NextResponse.json({ message: "Empreendimento removido com sucesso" });
  } catch (err) {
    console.error("Erro no DELETE /api/admin-sistema/empreendimentos:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
