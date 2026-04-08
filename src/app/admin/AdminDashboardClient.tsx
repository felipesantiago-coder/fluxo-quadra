"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";
import SalesDashboard from "@/components/sales-dashboard";

export default function AdminDashboardClient() {
  const router = useRouter();

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/admin/login");
    });
  }, [router]);

  const handleLogout = async () => {
    await createClient().auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="relative min-h-screen">
      {/* Barra fixa admin no topo */}
      <div className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          Modo Administrativo — Clique no status de uma unidade para alterar
        </div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-xs text-white/80 hover:text-white transition-colors">
            Ver espelho público
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </div>

      {/* Dashboard com isAdmin=true, com padding-top para a barra admin */}
      <div className="pt-10">
        <SalesDashboard isAdmin={true} />
      </div>
    </div>
  );
}
