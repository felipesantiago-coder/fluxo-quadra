export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { coordenadorHasAccess } from "@/lib/coordinator-access";
import SalesDashboard from "@/components/sales-dashboard";

export default async function EspelhoPage() {
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
  let isAdmin = adminEmails.length === 0 || adminEmails.includes(user.email?.toLowerCase() || "");
  let isCoordinator = false;

  if (!isAdmin) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role === "admin_sistema") isAdmin = true;
      if (profile?.role === "coordenador") {
        isCoordinator = true;
        const { data: emp } = await supabase
          .from("empreendimentos")
          .select("id")
          .eq("slug", "quattre-istambul")
          .maybeSingle();
        if (emp) {
          const hasAccess = await coordenadorHasAccess(user.id, emp.id);
          if (hasAccess) isAdmin = true;
        }
      }
    } catch {
      // Tabela profiles pode não existir
    }
  }

  return <SalesDashboard isAdmin={isAdmin} isCoordinator={isCoordinator} />;
}
