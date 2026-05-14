import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSistemaClient from "./AdminSistemaClient";

export const dynamic = "force-dynamic";

export default async function AdminSistemaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin_sistema") redirect("/projetos");

  return <AdminSistemaClient />;
}
