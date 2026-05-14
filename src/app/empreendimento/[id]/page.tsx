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

  // Verificar role
  const isAdmin =
    user.email?.toLowerCase() === "prosperosdirecional@gmail.com" ||
    (
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
    ).data?.role === "admin_sistema";

  return (
    <DynamicDashboard
      empreendimentoId={id}
      empreendimentoNome={emp.nome}
      isAdmin={!!isAdmin}
    />
  );
}
