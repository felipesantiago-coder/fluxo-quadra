export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  // Processar empreendimentos com contagem de unidades (1 query extra)
  let empreendimentos: EmpreendimentoData[] = [];

  if (empsResult.data && empsResult.data.length > 0) {
    const empIds = empsResult.data.map(e => e.id);

    // Buscar contagem de unidades em LOTE (uma única query)
    const { data: unitRows } = await supabase
      .from("projeto_units")
      .select("empreendimento_id")
      .in("empreendimento_id", empIds);

    const countMap = new Map<string, number>();
    if (unitRows) {
      for (const r of unitRows) {
        const id = r.empreendimento_id as string;
        countMap.set(id, (countMap.get(id) || 0) + 1);
      }
    }

    empreendimentos = empsResult.data.map(emp => ({
      ...emp,
      unit_count: countMap.get(emp.id) || 0,
    }));
  }

  return (
    <ProjetosClient
      userRole={userRole}
      initialEmpreendimentos={empreendimentos}
      initialMfaEnabled={hasVerifiedMfa}
    />
  );
}
