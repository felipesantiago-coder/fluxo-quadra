export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { coordenadorHasAccess } from "@/lib/coordinator-access";
import MomentDashboard from "@/components/moment-dashboard";

export default async function MomentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

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
          .eq("slug", "moment")
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

  return <MomentDashboard isAdmin={isAdmin} isCoordinator={isCoordinator} />;
}
