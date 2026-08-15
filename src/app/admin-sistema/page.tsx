import { redirect } from "next/navigation";
import { requireAdminSistema } from "@/lib/admin-auth";
import AdminSistemaClient from "./AdminSistemaClient";

export const dynamic = "force-dynamic";

export default async function AdminSistemaPage() {
  // SEC-AUDIT FIX: Usa a função centralizada requireAdminSistema()
  // em vez de lógica inline com fallback de email hardcoded.
  const isAllowed = await requireAdminSistema();
  if (!isAllowed) redirect("/projetos");

  return <AdminSistemaClient />;
}
