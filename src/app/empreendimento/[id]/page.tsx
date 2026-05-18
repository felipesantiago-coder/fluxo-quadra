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
  const isAdminEmail = user.email?.toLowerCase() === "prosperosdirecional@gmail.com";
  let userRole = isAdminEmail ? "admin_sistema" : "usuario_comum";
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role) userRole = profile.role;
  } catch {
    // Tabela profiles pode não existir — usa fallback
  }

  // Coordenador e admin_sistema podem alterar status de unidades
  const canEditStatus = userRole === "coordenador" || userRole === "admin_sistema";

  return (
    <DynamicDashboard
      empreendimentoId={id}
      empreendimentoNome={emp.nome}
      isAdmin={canEditStatus}
    />
  );
}
