import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DynamicDashboard from "@/components/dynamic-dashboard";

export const dynamic = "force-dynamic";

export default async function EmpreendimentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Buscar detalhes do empreendimento
  const { data: emp } = await supabase
    .from("empreendimentos")
    .select("*")
    .eq("id", id)
    .single();

  if (!emp) redirect("/projetos");

  // Verificar role (resiliente: se tabela não existir, verifica apenas pelo email)
  let isAdmin = user.email?.toLowerCase() === "prosperosdirecional@gmail.com";
  if (!isAdmin) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role === "admin_sistema") isAdmin = true;
    } catch {
      // Tabela profiles pode não existir — isAdmin já foi definido pelo email check
    }
  }

  return (
    <DynamicDashboard
      empreendimentoId={id}
      empreendimentoNome={emp.nome}
      isAdmin={!!isAdmin}
    />
  );
}
