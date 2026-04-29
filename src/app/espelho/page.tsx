export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  const isAdmin = adminEmails.length === 0 || adminEmails.includes(user.email?.toLowerCase() || "");

  return <SalesDashboard isAdmin={isAdmin} />;
}
