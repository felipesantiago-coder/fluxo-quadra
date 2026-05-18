export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjetosClient from "./ProjetosClient";

export default async function ProjetosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Buscar role do usuário (resiliente: se tabela não existir ou der erro, usa fallback)
  const isAdminEmail = user.email?.toLowerCase() === "prosperosdirecional@gmail.com";
  let userRole = isAdminEmail ? "admin_sistema" : "coordenador";
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role) userRole = profile.role;
  } catch {
    // Tabela profiles pode não existir ou estar com erro — usa fallback
  }

  return <ProjetosClient userRole={userRole} />;
}
