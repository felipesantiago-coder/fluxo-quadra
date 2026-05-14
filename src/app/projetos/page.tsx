export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjetosClient from "./ProjetosClient";

export default async function ProjetosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Buscar role do usuário (resiliente: se tabela não existir, assume "coordenador")
  let userRole = "coordenador";
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role) userRole = profile.role;
  } catch {
    // Tabela profiles pode não existir ainda — assume role padrão
  }

  return <ProjetosClient userRole={userRole} />;
}
