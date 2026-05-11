import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";
import { logger } from "@/lib/logger";

// E-mails autorizados como admin
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter((e) => e.length > 0);

async function isAdmin(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    logger.warn(`[isAdmin] Erro ao obter usuário: ${error?.message}`);
    return false;
  }
  if (ADMIN_EMAILS.length === 0) return true; // Sem restrição se não configurado
  const isAuthorized = ADMIN_EMAILS.includes(user.email?.toLowerCase() || "");
  if (!isAuthorized) {
    logger.warn(`[isAdmin] E-mail não autorizado: ${user.email}`);
  }
  return isAuthorized;
}

// Cache para dados de unidades (revalida a cada 60 segundos)
const getCachedUnits = unstable_cache(
  async () => {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("units")
      .select("*")
      .order("andar", { ascending: true })
      .order("unidade", { ascending: true });

    if (error) {
      logger.error(`Erro ao buscar unidades: ${error.message}`);
      throw error;
    }

    return data;
  },
  ["units-data"],
  { revalidate: 60, tags: ["units"] }
);

export async function GET() {
  try {
    const data = await getCachedUnits();
    return NextResponse.json(data);
  } catch {
    // Fallback para dados estáticos em caso de falha
    const { units } = await import("@/lib/units-data");
    logger.warn("Fallback para dados estáticos de unidades");
    return NextResponse.json(units);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    if (!(await isAdmin(supabase))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { unidade, status } = body;

    if (!unidade || !status) {
      return NextResponse.json({ error: "Campos 'unidade' e 'status' são obrigatórios" }, { status: 400 });
    }

    const validStatuses = ["disponivel", "reservado", "vendido"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Status inválido. Valores: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("units")
      .update({ status })
      .eq("unidade", unidade)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar:", error.message);
      return NextResponse.json({ error: "Erro ao atualizar unidade" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Erro no PATCH /api/units:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

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
    for (const update of updates) {
      if (!update.unidade || !update.status || !validStatuses.includes(update.status)) {
        return NextResponse.json({ error: `Atualização inválida para unidade ${update.unidade}` }, { status: 400 });
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
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
