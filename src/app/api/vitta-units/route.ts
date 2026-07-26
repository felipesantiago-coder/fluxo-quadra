import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// E-mails autorizados como admin
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter((e) => e.length > 0);

async function isAdmin(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return false;
  if (ADMIN_EMAILS.length === 0) return true;
  return ADMIN_EMAILS.includes(user.email?.toLowerCase() || "");
}

export async function GET() {
  try {
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

    // Se tabela vazia, retornar fallback estático
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

// PATCH: Atualiza status e/ou preço de uma unidade Vitta
// - Body: { bloco, unidade, status }       → atualiza apenas status
// - Body: { bloco, unidade, valor_venda }  → atualiza apenas preço
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    if (!(await isAdmin(supabase))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { bloco, unidade, status, valor_venda } = body;

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

    const { data, error } = await supabase
      .from("vitta_units")
      .update(updates)
      .eq("bloco", bloco)
      .eq("unidade", unidade)
      .select()
      .single();

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
