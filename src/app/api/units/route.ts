import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { unidade, status } = body;

    if (!unidade || !status) {
      return NextResponse.json(
        { error: "Campos 'unidade' e 'status' são obrigatórios" },
        { status: 400 }
      );
    }

    const validStatuses = ["disponivel", "reservado", "vendido"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status inválido. Valores permitidos: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("units")
      .update({ status })
      .eq("unidade", unidade)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar unidade:", error.message);
      return NextResponse.json(
        { error: "Erro ao atualizar unidade" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Erro no PATCH /api/units:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Bulk update: atualizar múltiplas unidades de uma vez
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { updates } = body; // Array de { unidade, status }

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: "Campo 'updates' deve ser um array" },
        { status: 400 }
      );
    }

    const validStatuses = ["disponivel", "reservado", "vendido"];

    for (const update of updates) {
      if (!update.unidade || !update.status || !validStatuses.includes(update.status)) {
        return NextResponse.json(
          { error: `Atualização inválida para unidade ${update.unidade}` },
          { status: 400 }
        );
      }
    }

    const results = [];
    for (const update of updates) {
      const { data, error } = await supabase
        .from("units")
        .update({ status: update.status })
        .eq("unidade", update.unidade)
        .select()
        .single();

      if (error) {
        console.error(`Erro ao atualizar unidade ${update.unidade}:`, error.message);
      } else {
        results.push(data);
      }
    }

    return NextResponse.json({ updated: results });
  } catch (err) {
    console.error("Erro no POST /api/units:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
