export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Verificar se é admin
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  // SEC-AUDIT FIX: Fail-closed — se ADMIN_EMAILS não estiver configurado,
  // negar acesso em vez de permitir para qualquer usuário autenticado.
  if (adminEmails.length === 0 || !adminEmails.includes(user.email?.toLowerCase() || "")) {
    redirect("/projetos");
  }

  return <AdminDashboardClient />;
}
