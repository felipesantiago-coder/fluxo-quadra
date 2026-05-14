import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSistemaClient from "./AdminSistemaClient";

export const dynamic = "force-dynamic";

export default async function AdminSistemaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Verificar role (resiliente: se tabela não existir ou der erro, usa fallback por email)
  const isAdminEmail = user.email?.toLowerCase() === "prosperosdirecional@gmail.com";
  let isAdminSistema = isAdminEmail;
  try {
    const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!error && profile?.role === "admin_sistema") isAdminSistema = true;
  } catch {
    // Tabela profiles pode não existir ou estar com erro
  }
  if (!isAdminSistema) redirect("/projetos");

  return <AdminSistemaClient />;
}
