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
      .from("moment_units")
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
    console.error("Erro no PATCH /api/moment-units:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
