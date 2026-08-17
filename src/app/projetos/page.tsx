export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCoordenadorEmpreendimentos } from "@/lib/coordinator-access";
import ProjetosClient from "./ProjetosClient";

interface EmpreendimentoData {
  id: string;
  nome: string;
  slug: string;
  regiao: string;
  imagem_url: string | null;
  descricao: string;
  ativo: boolean;
  unit_count: number;
}

// Mapeamento slug → tabela de unidades (desenvolvimentos legados)
const LEGACY_TABLE_MAP: Record<string, string> = {
  "quattre-istambul": "units",
  "villa-bianco": "villa_bianco_units",
  moment: "moment_units",
  "residencial-vitta": "vitta_units",
};

export default async function ProjetosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Buscar role do usuário
  const isAdminEmail = user.email?.toLowerCase() === "prosperosdirecional@gmail.com";
  let userRole = isAdminEmail ? "admin_sistema" : "coordenador";

  // Buscar tudo em paralelo: profile + empreendimentos + MFA (totp + passkeys)
  const [profileResult, empsResult, totpResult, passkeyResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, mfa_enabled")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("empreendimentos")
      .select("id, nome, slug, regiao, imagem_url, descricao, ativo, created_at")
      .eq("ativo", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("user_totp")
      .select("id, verified")
      .eq("user_id", user.id)
      .eq("verified", true)
      .maybeSingle(),
    supabase
      .from("user_passkeys")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  if (!profileResult.error && profileResult.data?.role) {
    userRole = profileResult.data.role;
  }

  const profileMfa = profileResult.data?.mfa_enabled ?? false;
  const hasVerifiedMfa = profileMfa || !!totpResult.data || (passkeyResult.count && passkeyResult.count > 0);

  // Processar empreendimentos com contagem de unidades + última atualização
  let empreendimentos: EmpreendimentoData[] = [];
  const lastUpdatedMap: Record<string, string | null> = {};

  if (empsResult.data && empsResult.data.length > 0) {
    const emps = empsResult.data;
    const empIds = emps.map(e => e.id);
    const slugToId = new Map(emps.map(e => [e.slug, e.id]));

    // Separar empreendimentos legados dos genéricos
    const legacySlugs = emps
      .filter(e => LEGACY_TABLE_MAP[e.slug])
      .map(e => e.slug);
    const genericIds = emps
      .filter(e => !LEGACY_TABLE_MAP[e.slug])
      .map(e => e.id);

    // Buscar contagem de unidades + updated_at em LOTE (uma query)
    const { data: genericUnitRows } = await supabase
      .from("projeto_units")
      .select("empreendimento_id, updated_at")
      .in("empreendimento_id", empIds);

    // Calcular contagem e MAX(updated_at) para projetos genéricos
    const countMap = new Map<string, number>();
    const genericMaxMap = new Map<string, string>();

    if (genericUnitRows) {
      for (const r of genericUnitRows) {
        const id = r.empreendimento_id as string;
        countMap.set(id, (countMap.get(id) || 0) + 1);
        const ts = r.updated_at as string;
        if (ts) {
          const current = genericMaxMap.get(id);
          if (!current || ts > current) genericMaxMap.set(id, ts);
        }
      }
    }

    // Para projetos genéricos, usar os dados calculados acima
    for (const id of genericIds) {
      lastUpdatedMap[id] = genericMaxMap.get(id) || null;
    }

    // Buscar updated_at das tabelas legadas em paralelo
    const legacyQueries = legacySlugs.map(async (slug) => {
      const table = LEGACY_TABLE_MAP[slug];
      const { data } = await supabase
        .from(table)
        .select("updated_at");
      return { slug, rows: data as { updated_at: string }[] | null };
    });

    const legacyResults = await Promise.all(legacyQueries);

    for (const { slug, rows } of legacyResults) {
      const empId = slugToId.get(slug);
      if (!empId) continue;
      if (rows && rows.length > 0) {
        const maxTs = rows.reduce((max, r) => {
          if (r.updated_at && r.updated_at > max) return r.updated_at;
          return max;
        }, "");
        lastUpdatedMap[empId] = maxTs || null;
      } else {
        lastUpdatedMap[empId] = null;
      }
      // Contagem de unidades legadas já vem do projeto_units (migradas)
      // ou será 0 se não foram migradas
    }

    empreendimentos = emps.map(emp => ({
      ...emp,
      unit_count: countMap.get(emp.id) || 0,
    }));

    // Coordenador: filtrar apenas empreendimentos atribuídos
    if (userRole === "coordenador") {
      const allowedIds = await getCoordenadorEmpreendimentos(user.id);
      if (allowedIds !== null) {
        // null = tabela não existe = sem restrição (migration não executada)
        const allowedSet = new Set(allowedIds);
        empreendimentos = empreendimentos.filter(emp => allowedSet.has(emp.id));
      }
    }
  }

  return (
    <ProjetosClient
      userRole={userRole}
      initialEmpreendimentos={empreendimentos}
      initialMfaEnabled={hasVerifiedMfa}
      lastUpdatedMap={lastUpdatedMap}
    />
  );
}
