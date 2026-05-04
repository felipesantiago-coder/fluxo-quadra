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
      .from("moment_units")
      .select("*")
      .order("andar", { ascending: true })
      .order("unidade", { ascending: true });

    if (error) {
      console.error("Erro ao buscar unidades Moment:", error.message);
      return NextResponse.json({ error: "Erro ao buscar unidades" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    const { momentUnits } = await import("@/lib/moment-data");
    return NextResponse.json(momentUnits);
  }
}

// PATCH: Atualiza status E/OU preço de forma independente
// - Body: { unidade, status }          → atualiza apenas status
// - Body: { unidade, valor_venda }     → atualiza apenas preço (null para remover preço)
// - Body: { unidade, status, valor_venda } → atualiza ambos
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    if (!(await isAdmin(supabase))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { unidade, status, valor_venda } = body;

    if (!unidade) {
      return NextResponse.json({ error: "Campo 'unidade' é obrigatório" }, { status: 400 });
    }

    // Montar objeto de atualização apenas com campos fornecidos
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
      .from("moment_units")
      .update(updates)
      .eq("unidade", unidade)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar:", error.message);
      return NextResponse.json({ error: "Erro ao atualizar unidade" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Erro no PATCH /api/moment-units:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST: Atualização em lote (status e/ou preço de forma independente)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    if (!(await isAdmin(supabase))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: "Campo 'updates' deve ser um array" }, { status: 400 });
    }

    const validStatuses = ["disponivel", "reservado", "vendido"];
    const results = [];

    for (const update of updates) {
      if (!update.unidade) {
        return NextResponse.json({ error: "Campo 'unidade' é obrigatório" }, { status: 400 });
      }

      const rowUpdates: Record<string, unknown> = {};

      if (update.status !== undefined) {
        if (!validStatuses.includes(update.status)) {
          return NextResponse.json({ error: `Status inválido para unidade ${update.unidade}` }, { status: 400 });
        }
        rowUpdates.status = update.status;
      }

      if (update.valor_venda !== undefined) {
        rowUpdates.valor_venda = update.valor_venda === null ? null : Number(update.valor_venda);
      }

      if (Object.keys(rowUpdates).length === 0) continue;

      const { data, error } = await supabase
        .from("moment_units")
        .update(rowUpdates)
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
    console.error("Erro no POST /api/moment-units:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
