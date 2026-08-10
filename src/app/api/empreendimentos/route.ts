import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Endpoint otimizado: busca empreendimentos + contagem de unidades em 2 queries
// (antes: N+1 — uma query COUNT por empreendimento)
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Query 1: Buscar empreendimentos ativos
    const { data: emps, err } = await supabase
      .from("empreendimentos")
      .select("id, nome, slug, regiao, imagem_url, descricao, ativo, created_at")
      .eq("ativo", true)
      .order("created_at", { ascending: true });

    if (err || !emps || emps.length === 0) {
      return NextResponse.json({ empreendimentos: [], total: 0, mfa_enabled: false });
    }

    // Query 2: Buscar contagem de unidades em LOTE (uma única query)
    const empIds = emps.map(e => e.id);
    const { data: counts } = await supabase
      .from("projeto_units")
      .select("empreendimento_id")
      .in("empreendimento_id", empIds);

    // Agrupar contagem por empreendimento_id
    const countMap = new Map<string, number>();
    if (counts) {
      for (const c of counts) {
        const id = c.empreendimento_id as string;
        countMap.set(id, (countMap.get(id) || 0) + 1);
      }
    }

    const enriched = emps.map(emp => ({
      ...emp,
      unit_count: countMap.get(emp.id) || 0,
    }));

    return NextResponse.json({ empreendimentos: enriched, total: enriched.length, mfa_enabled: false });
  } catch {
    return NextResponse.json({ empreendimentos: [], total: 0, mfa_enabled: false });
  }
}
