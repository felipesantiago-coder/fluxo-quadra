import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireReadAccess, requireWriteAccess } from "@/lib/api-auth";

export async function GET() {
  try {
    const denied = await requireReadAccess();
    if (denied) return denied;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("vitta_units")
      .select("*")
      .order("andar_num", { ascending: true })
      .order("bloco", { ascending: true })
      .order("unidade", { ascending: true });

    if (error) {
      console.error("Erro ao buscar unidades Vitta:", error.message);
      return NextResponse.json({ error: "Erro ao buscar unidades" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      const { vittaUnits } = await import("@/lib/vitta-data");
      return NextResponse.json(vittaUnits);
    }

    return NextResponse.json(data);
  } catch {
    const { vittaUnits } = await import("@/lib/vitta-data");
    return NextResponse.json(vittaUnits);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const denied = await requireWriteAccess();
    if (denied) return denied;

    const supabase = await createClient();
    const body = await request.json();
    const { bloco, unidade, andar, status, valor_venda } = body;

    if (!bloco || unidade === undefined) {
      return NextResponse.json(
        { error: "Campos 'bloco' e 'unidade' são obrigatórios" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};

    if (status !== undefined) {
      const validStatuses = ["disponivel", "reservado", "vendido"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Status inválido. Valores: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      updates.status = status;
    }

    if (valor_venda !== undefined) {
      updates.valor_venda = valor_venda === null ? null : Number(valor_venda);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Informe pelo menos um campo para atualizar (status ou valor_venda)" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("vitta_units")
      .update(updates)
      .eq("bloco", bloco)
      .eq("unidade", unidade);

    if (andar) {
      query = query.eq("andar", andar) as any;
    }

    const { data, error } = await query.select().single();

    if (error) {
      console.error("Erro ao atualizar unidade Vitta:", error.message);
      return NextResponse.json({ error: "Erro ao atualizar unidade" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Erro no PATCH /api/vitta-units:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
