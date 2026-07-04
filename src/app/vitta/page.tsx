export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VittaDashboard from "@/components/vitta-dashboard";

export default async function VittaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
  const isAdmin = adminEmails.length === 0 || adminEmails.includes(user.email?.toLowerCase() || "");

  return <VittaDashboard isAdmin={isAdmin} />;
}