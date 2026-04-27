export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VillaBiancoDashboard from "@/components/villa-bianco-dashboard";

export default async function VillaBiancoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return <VillaBiancoDashboard />;
}
