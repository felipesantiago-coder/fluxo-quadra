import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSistemaClient from "./AdminSistemaClient";

export const dynamic = "force-dynamic";

export default async function AdminSistemaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Verificar role (resiliente: se tabela não existir, redireciona para projetos)
  let isAdminSistema = false;
  try {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role === "admin_sistema") isAdminSistema = true;
  } catch {
    // Tabela profiles pode não existir ainda
  }
  if (!isAdminSistema) redirect("/projetos");

  return <AdminSistemaClient />;
}
