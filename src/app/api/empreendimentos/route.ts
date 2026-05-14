import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Endpoint público: qualquer usuário autenticado pode listar empreendimentos ativos
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { data, err } = await supabase
      .from("empreendimentos")
      .select("id, nome, slug, regiao, imagem_url, descricao, ativo, created_at")
      .eq("ativo", true)
      .order("created_at", { ascending: true });

    if (err) {
      // Tabela pode não existir ainda — retornar lista vazia em vez de erro
      return NextResponse.json({ empreendimentos: [], total: 0 });
    }

    // Buscar contagem de unidades para cada empreendimento
    const enriched = await Promise.all(
      (data || []).map(async (emp) => {
        try {
          const { count } = await supabase
            .from("projeto_units")
            .select("*", { count: "exact", head: true })
            .eq("empreendimento_id", emp.id);
          return { ...emp, unit_count: count || 0 };
        } catch {
          return { ...emp, unit_count: 0 };
        }
      })
    );

    return NextResponse.json({ empreendimentos: enriched, total: enriched.length });
  } catch {
    return NextResponse.json({ empreendimentos: [], total: 0 });
  }
}
