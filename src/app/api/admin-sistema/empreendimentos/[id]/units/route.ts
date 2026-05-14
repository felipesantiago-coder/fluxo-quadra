import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getUserAndRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }), user: null, role: null };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { supabase, error: null, user, role: profile?.role || null };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, error } = await getUserAndRole();
    if (error) return error;

    const { id } = await params;

    const { data, err } = await supabase
      .from("projeto_units")
      .select("*")
      .eq("empreendimento_id", id)
      .order("ordem", { ascending: true })
      .order("andar", { ascending: true })
      .order("unidade", { ascending: true });

    if (err) {
      console.error("Erro ao buscar unidades:", err.message);
      return NextResponse.json({ error: "Erro ao buscar unidades" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Erro no GET units:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, error, role } = await getUserAndRole();
    if (error) return error;

    // Coordenador ou admin_sistema podem alterar status
    if (!role || (role !== "coordenador" && role !== "admin_sistema")) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { unidade, status } = body;

    if (!unidade || !status) {
      return NextResponse.json({ error: "Campos 'unidade' e 'status' são obrigatórios" }, { status: 400 });
    }

    const validStatuses = ["disponivel", "reservado", "vendido"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Status inválido. Valores: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    const { data, err } = await supabase
      .from("projeto_units")
      .update({ status })
      .eq("empreendimento_id", id)
      .eq("unidade", unidade)
      .select()
      .single();

    if (err) {
      console.error("Erro ao atualizar status:", err.message);
      return NextResponse.json({ error: "Erro ao atualizar unidade" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Erro no PATCH units:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
