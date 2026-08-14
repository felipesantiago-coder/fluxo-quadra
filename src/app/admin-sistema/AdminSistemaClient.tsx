"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  FileSpreadsheet,
  MapPin,
  ArrowLeft,
  LogOut,
  X,
  Check,
  AlertCircle,
  Loader2,
  Shield,
  Users,
  UserPlus,
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Crown,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

type AdminTab = "empreendimentos" | "usuarios" | "assinaturas";

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  must_change_password: boolean;
  must_setup_mfa: boolean;
  mfa_enabled: boolean;
  created_at: string;
}

interface Empreendimento {
  id: string;
  nome: string;
  slug: string;
  regiao: string;
  imagem_url: string | null;
  descricao: string;
  ativo: boolean;
  unit_count: number;
  created_at: string;
}

// ─── Toast state ─────────────────────────────────────────────────────────────
interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminSistemaClient() {
  const router = useRouter();
  const supabase = createClient();

  // Data
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ nome: "", regiao: "", descricao: "" });
  const [creating, setCreating] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Empreendimento | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Upload states keyed by empreendimento id
  const [uploadingImage, setUploadingImage] = useState<Record<string, boolean>>({});
  const [uploadingExcel, setUploadingExcel] = useState<Record<string, boolean>>({});

  // Tab
  const [activeTab, setActiveTab] = useState<AdminTab>("empreendimentos");

  // Assinaturas
  const [assinaturas, setAssinaturas] = useState<Record<string, unknown>[]>([]);
  const [assinaturasLoading, setAssinaturasLoading] = useState(false);
  const [planosAdmin, setPlanosAdmin] = useState<Record<string, unknown>[]>([]);
  const [syncingPlano, setSyncingPlano] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [statusChangeDialog, setStatusChangeDialog] = useState<{ id: string; currentStatus: string } | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusMotivo, setStatusMotivo] = useState("");
  // Plano CRUD
  const [savingPlano, setSavingPlano] = useState(false);
  const [deletingPlano, setDeletingPlano] = useState<string | null>(null);
  const [togglingPlano, setTogglingPlano] = useState<string | null>(null);

  // Usuários
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ email: "", displayName: "", role: "coordenador" as "comum" | "coordenador" | "admin_sistema" });
  const [creatingUser, setCreatingUser] = useState(false);
  const [createdUserPassword, setCreatedUserPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<Record<string, boolean>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  // ─── Auto-migrate legacy projects (roda em background, não bloqueia carregamento) ─
  const migrateLegacy = useCallback(async () => {
    try {
      await fetch("/api/admin-sistema/migrate-legacy", { method: "POST" });
    } catch {
      // Silently fail — os projetos podem já estar migrados
    }
  }, []);

  // ─── Fetch empreendimentos ─────────────────────────────────────────────────
  const fetchEmpreendimentos = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin-sistema/empreendimentos");
      if (!res.ok) throw new Error("Erro ao buscar empreendimentos");
      const json = await res.json();
      setEmpreendimentos(Array.isArray(json.empreendimentos) ? json.empreendimentos : []);
    } catch (err) {
      console.error(err);
      addToast("error", "Erro ao carregar empreendimentos");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // ─── Fetch assinaturas ──────────────────────────────────────────
  const fetchAssinaturas = useCallback(async () => {
    try {
      setAssinaturasLoading(true);
      const res = await fetch("/api/admin-sistema/assinaturas");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setAssinaturas(json.assinaturas || []);
    } catch {
      addToast("error", "Erro ao carregar assinaturas");
    } finally {
      setAssinaturasLoading(false);
    }
  }, [addToast]);

  // ─── Fetch planos admin ─────────────────────────────────────────
  const fetchPlanosAdmin = useCallback(async () => {
    try {
      const res = await fetch("/api/admin-sistema/planos");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setPlanosAdmin(json.planos || []);
    } catch {
      addToast("error", "Erro ao carregar planos");
    }
  }, [addToast]);

  // ─── Sync plano com Mercado Pago ────────────────────────────────
  const handleSyncPlano = useCallback(async (planoId: string) => {
    setSyncingPlano(planoId);
    try {
      const res = await fetch("/api/admin-sistema/planos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planoId }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast("success", `Plano sincronizado! MP ID: ${json.mercadopago_plan_id}`);
        await fetchPlanosAdmin();
      } else {
        addToast("error", json.error || "Erro ao sincronizar plano.");
      }
    } catch {
      addToast("error", "Erro ao sincronizar com Mercado Pago.");
    } finally {
      setSyncingPlano(null);
    }
  }, [addToast, fetchPlanosAdmin]);

  // ─── Alterar status de assinatura ────────────────────────────────
  const handleOpenStatusChange = useCallback((id: string, current: string) => {
    setStatusChangeDialog({ id, currentStatus: current });
    setNewStatus("");
    setStatusMotivo("");
  }, []);

  const handleConfirmStatusChange = useCallback(async () => {
    if (!statusChangeDialog || !newStatus) return;
    setChangingStatus(statusChangeDialog.id);
    try {
      const res = await fetch("/api/admin-sistema/assinaturas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assinaturaId: statusChangeDialog.id, status: newStatus, motivo: statusMotivo }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast("success", json.message || "Status atualizado.");
        setStatusChangeDialog(null);
        await fetchAssinaturas();
      } else {
        addToast("error", json.error || "Erro ao atualizar status.");
      }
    } catch {
      addToast("error", "Erro ao atualizar status.");
    } finally {
      setChangingStatus(null);
    }
  }, [statusChangeDialog, newStatus, statusMotivo, addToast, fetchAssinaturas]);

  // ─── Plano CRUD ─────────────────────────────────────────────────
  const handleSavePlano = useCallback(async (data: Record<string, unknown>) => {
    setSavingPlano(true);
    try {
      const isEdit = !!data.id;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch("/api/admin-sistema/planos", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok) {
        addToast("success", isEdit ? "Plano atualizado!" : "Plano criado!");
        if (json.mp_plan_cleared) {
          addToast("error", "Preço/período alterado — re-sincronize com o MP.");
        }
        await fetchPlanosAdmin();
        return json;
      } else {
        addToast("error", json.error || "Erro ao salvar plano.");
        return null;
      }
    } catch {
      addToast("error", "Erro ao salvar plano.");
      return null;
    } finally {
      setSavingPlano(false);
    }
  }, [addToast, fetchPlanosAdmin]);

  const handleDeletePlano = useCallback(async (planoId: string) => {
    setDeletingPlano(planoId);
    try {
      const res = await fetch("/api/admin-sistema/planos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: planoId }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast("success", "Plano excluído.");
        await fetchPlanosAdmin();
      } else {
        addToast("error", json.error || "Erro ao excluir.");
      }
    } catch {
      addToast("error", "Erro ao excluir plano.");
    } finally {
      setDeletingPlano(null);
    }
  }, [addToast, fetchPlanosAdmin]);

  const handleTogglePlano = useCallback(async (planoId: string, currentAtivo: boolean) => {
    setTogglingPlano(planoId);
    try {
      const res = await fetch("/api/admin-sistema/planos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: planoId, ativo: !currentAtivo }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast("success", !currentAtivo ? "Plano ativado." : "Plano desativado.");
        await fetchPlanosAdmin();
      } else {
        addToast("error", json.error || "Erro ao alterar plano.");
      }
    } catch {
      addToast("error", "Erro ao alterar plano.");
    } finally {
      setTogglingPlano(null);
    }
  }, [addToast, fetchPlanosAdmin]);

  // ─── Fetch usuários ──────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const res = await fetch("/api/admin-sistema/users");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setUsers(json.users || []);
    } catch {
      addToast("error", "Erro ao carregar usuários");
    } finally {
      setUsersLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, [supabase.auth]);

  // Buscar dados imediatamente; migrar legacy em background sem bloquear
  const hasMigrated = React.useRef(false);
  useEffect(() => {
    if (activeTab === "empreendimentos") {
      fetchEmpreendimentos();
      if (!hasMigrated.current) {
        hasMigrated.current = true;
        migrateLegacy(); // fire-and-forget, não bloqueia o fetch
      }
    } else if (activeTab === "assinaturas") {
      fetchAssinaturas();
      fetchPlanosAdmin();
    } else {
      fetchUsers();
    }
  }, [activeTab, migrateLegacy, fetchEmpreendimentos, fetchUsers, fetchAssinaturas, fetchPlanosAdmin]);

  // ─── Create empreendimento ─────────────────────────────────────────────────
  const handleCreate = async () => {
    const nome = createForm.nome.trim();
    const regiao = createForm.regiao.trim();
    if (!nome || !regiao) return;

    setCreating(true);
    try {
      const res = await fetch("/api/admin-sistema/empreendimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          regiao,
          descricao: createForm.descricao.trim(),
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Erro ao criar empreendimento");
      }
      const created = await res.json();
      setEmpreendimentos((prev) => [...prev, { ...created, unit_count: 0 }]);
      setShowCreateModal(false);
      setCreateForm({ nome: "", regiao: "", descricao: "" });
      addToast("success", `"${nome}" criado com sucesso`);
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  // ─── Delete empreendimento ─────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin-sistema/empreendimentos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Erro ao remover empreendimento");
      }
      setEmpreendimentos((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      addToast("success", `"${deleteTarget.nome}" removido com sucesso`);
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ─── Image upload ──────────────────────────────────────────────────────────
  const handleImageUpload = async (empId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".jpg,.jpeg,.png,.webp";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploadingImage((prev) => ({ ...prev, [empId]: true }));
      try {
        const fd = new FormData();
        fd.append("empreendimentoId", empId);
        fd.append("file", file);
        const res = await fetch("/api/admin-sistema/empreendimentos/upload-image", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || "Erro no upload da imagem");
        }
        const json = await res.json();
        setEmpreendimentos((prev) =>
          prev.map((emp) => (emp.id === empId ? { ...emp, imagem_url: json.imagem_url } : emp))
        );
        addToast("success", "Imagem carregada com sucesso");
      } catch (err) {
        addToast("error", (err as Error).message);
      } finally {
        setUploadingImage((prev) => ({ ...prev, [empId]: false }));
      }
    };
    input.click();
  };

  // ─── Excel upload ──────────────────────────────────────────────────────────
  const handleExcelUpload = async (empId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploadingExcel((prev) => ({ ...prev, [empId]: true }));
      try {
        const fd = new FormData();
        fd.append("empreendimentoId", empId);
        fd.append("file", file);
        const res = await fetch("/api/admin-sistema/empreendimentos/upload-excel", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || "Erro no upload do Excel");
        }
        const json = await res.json();
        const parts: string[] = [];
        if (json.inserted) parts.push(`${json.inserted} inseridas`);
        if (json.updated) parts.push(`${json.updated} atualizadas`);
        if (json.skipped) parts.push(`${json.skipped} ignoradas`);
        if (json.errors) parts.push(`${json.errors} com erro`);
        addToast("success", `Excel: ${parts.join(", ")} — ${json.total_units} unidades totais`);
        // Refresh to update unit counts
        fetchEmpreendimentos();
      } catch (err) {
        addToast("error", (err as Error).message);
      } finally {
        setUploadingExcel((prev) => ({ ...prev, [empId]: false }));
      }
    };
    input.click();
  };

  // ─── Alterar role de usuário ─────────────────────────────────────────
  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingRole((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch("/api/admin-sistema/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Erro ao alterar função");
      }
      const json = await res.json();
      // Atualizar o usuário na lista local
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: json.user.role } : u))
      );
      addToast("success", `Função de ${json.user.email || "usuário"} alterada para ${newRole === "admin_sistema" ? "Admin" : newRole === "coordenador" ? "Coordenador" : "Comum"}`);
    } catch (err) {
      addToast("error", (err as Error).message);
      // Reverter o select visual
      fetchUsers();
    } finally {
      setUpdatingRole((prev) => ({ ...prev, [userId]: false }));
    }
  };

  // ─── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-lg">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Administração do <span className="text-gray-400 font-normal">Sistema</span></h1>
                <p className="text-[11px] text-gray-400 font-medium hidden sm:block">Gerenciar empreendimentos</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/projetos"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Voltar aos Projetos</span>
                <span className="sm:hidden">Voltar</span>
              </a>
              <div className="w-px h-5 bg-gray-700 hidden sm:block" />
              <a
                href="/mfa-setup"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Segurança</span>
              </a>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-semibold transition-colors border border-red-500/20"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("empreendimentos")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "empreendimentos"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Empreendimentos
          </button>
          <button
            onClick={() => setActiveTab("usuarios")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "usuarios"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users className="w-4 h-4" />
            Usuários
          </button>
          <button
            onClick={() => setActiveTab("assinaturas")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "assinaturas"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Crown className="w-4 h-4" />
            Assinaturas
          </button>
        </div>

        {/* ═══ TAB: Empreendimentos ═══ */}
        {activeTab === "empreendimentos" && (<>
        {/* Title + action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight"
            >
              Empreendimentos
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-sm text-gray-500 mt-1"
            >
              {loading ? "Carregando..." : `${empreendimentos.length} empreendimento${empreendimentos.length !== 1 ? "s" : ""} cadastrado${empreendimentos.length !== 1 ? "s" : ""}`}
            </motion.p>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-gray-900 to-gray-700 text-white hover:from-gray-800 hover:to-gray-600 shadow-md rounded-xl h-11 px-5 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Novo Empreendimento
            </Button>
          </motion.div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-44 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                  <div className="h-4 bg-gray-100 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && empreendimentos.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
              <Building2 className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-400">Nenhum empreendimento cadastrado</h3>
            <p className="text-sm text-gray-300 mt-1.5">
              Clique em &quot;Novo Empreendimento&quot; para começar
            </p>
          </motion.div>
        )}

        {/* Empreendimentos grid */}
        {!loading && empreendimentos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {empreendimentos.map((emp, index) => (
                <motion.div
                  key={emp.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.35, delay: 0.04 * index }}
                  className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
                >
                  {/* Image thumbnail */}
                  <div className="relative h-44 bg-gray-100 overflow-hidden">
                    {emp.imagem_url ? (
                      <img
                        src={emp.imagem_url}
                        alt={emp.nome}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                        <ImageIcon className="w-10 h-10 mb-2" />
                        <span className="text-xs font-medium">Sem imagem</span>
                      </div>
                    )}
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    {/* Region badge */}
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-black/40 text-white backdrop-blur-sm">
                        <MapPin className="w-3 h-3" />
                        {emp.regiao}
                      </span>
                    </div>
                    {/* Unit count badge */}
                    <div className="absolute bottom-3 left-3">
                      <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/90 text-gray-700 backdrop-blur-sm shadow-sm">
                        {emp.unit_count} unidade{emp.unit_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-gray-900 tracking-tight truncate">{emp.nome}</h3>
                        {emp.descricao && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{emp.descricao}</p>
                        )}
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        emp.ativo
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-gray-100 text-gray-500 border border-gray-200"
                      }`}>
                        {emp.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 mt-2">
                      Criado em {formatDate(emp.created_at)}
                    </p>

                    {/* Action buttons */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {/* Upload image */}
                      <button
                        onClick={() => handleImageUpload(emp.id)}
                        disabled={uploadingImage[emp.id]}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingImage[emp.id] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        {uploadingImage[emp.id] ? "Enviando..." : "Upload Imagem"}
                      </button>

                      {/* Upload Excel */}
                      <button
                        onClick={() => handleExcelUpload(emp.id)}
                        disabled={uploadingExcel[emp.id]}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingExcel[emp.id] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        )}
                        {uploadingExcel[emp.id] ? "Processando..." : "Upload Excel"}
                      </button>

                      {/* Acessar Espelho */}
                      <a
                        href={`/empreendimento/${emp.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-all shadow-sm"
                      >
                        Acessar Espelho
                      </a>

                      {/* Remover */}
                      <button
                        onClick={() => setDeleteTarget(emp)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 transition-all ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remover
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        </>)}

        {/* ═══ TAB: Usuários ═══ */}
        {activeTab === "usuarios" && (
          <div className="space-y-6">
            {/* Title + action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Usuários</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {usersLoading ? "Carregando..." : `${users.length} usuário${users.length !== 1 ? "s" : ""} cadastrado${users.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <Button
                onClick={() => { setShowCreateUserModal(true); setCreatedUserPassword(""); setCreateUserForm({ email: "", displayName: "", role: "coordenador" }); }}
                className="flex items-center gap-2 bg-gradient-to-r from-gray-900 to-gray-700 text-white hover:from-gray-800 hover:to-gray-600 shadow-md rounded-xl h-11 px-5 text-sm font-semibold"
              >
                <UserPlus className="w-4 h-4" />
                Novo Usuário
              </Button>
            </div>

            {/* Loading */}
            {usersLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-48" />
                        <div className="h-3 bg-gray-100 rounded w-32" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Users table */}
            {!usersLoading && users.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuário</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Role</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Segurança</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Criado em</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                                {(u.display_name || u.email)[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">{u.display_name || u.email.split("@")[0]}</p>
                                <p className="text-xs text-gray-400 truncate">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            {updatingRole[u.id] ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Salvando...
                              </span>
                            ) : (
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                disabled={u.id === currentUserId}
                                title={u.id === currentUserId ? "Você não pode alterar sua própria função" : `Alterar função de ${u.email}`}
                                className={`text-xs font-semibold rounded-full px-2.5 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-900/20 ${
                                  u.role === "admin_sistema"
                                    ? "bg-amber-100 text-amber-700"
                                    : u.role === "coordenador"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-gray-100 text-gray-600"
                                } ${u.id === currentUserId ? "opacity-60 cursor-not-allowed" : "hover:opacity-80"}`}
                              >
                                <option value="comum">Usuário Comum</option>
                                <option value="coordenador">Coordenador</option>
                                <option value="admin_sistema">Administrador</option>
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {u.mfa_enabled ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                  <Shield className="w-3 h-3" /> 2FA
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                                  Sem 2FA
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-xs text-gray-500">
                              {new Date(u.created_at).toLocaleDateString("pt-BR")}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {u.must_change_password ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Trocar senha</span>
                            ) : u.must_setup_mfa ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Configurar 2FA</span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Ativo</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!usersLoading && users.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
                  <Users className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-400">Nenhum usuário</h3>
                <p className="text-sm text-gray-300 mt-1.5">Clique em "Novo Usuário" para começar</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: Assinaturas ═══ */}
        {activeTab === "assinaturas" && (<AssinaturasTab
          assinaturas={assinaturas}
          assinaturasLoading={assinaturasLoading}
          planosAdmin={planosAdmin}
          syncingPlano={syncingPlano}
          changingStatus={changingStatus}
          statusChangeDialog={statusChangeDialog}
          newStatus={newStatus}
          statusMotivo={statusMotivo}
          savingPlano={savingPlano}
          deletingPlano={deletingPlano}
          togglingPlano={togglingPlano}
          addToast={addToast}
          onSyncPlano={handleSyncPlano}
          onFetchAssinaturas={fetchAssinaturas}
          onFetchPlanos={fetchPlanosAdmin}
          onOpenStatusChange={handleOpenStatusChange}
          onConfirmStatusChange={handleConfirmStatusChange}
          onSetStatusChangeDialog={setStatusChangeDialog}
          onSetNewStatus={setNewStatus}
          onSetStatusMotivo={setStatusMotivo}
          onSavePlano={handleSavePlano}
          onDeletePlano={handleDeletePlano}
          onTogglePlano={handleTogglePlano}
        />)}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-gray-400">
            Administração do Sistema • Espelho de Vendas
          </p>
        </div>
      </footer>

      {/* ── Create Empreendimento Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Novo Empreendimento</h3>
                    <p className="text-xs text-gray-400">Preencha os campos abaixo</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nome <span className="text-red-400">*</span></label>
                  <input type="text" value={createForm.nome} onChange={(e) => setCreateForm((prev) => ({ ...prev, nome: e.target.value }))} placeholder="Ex: Quattre Istambul" className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 placeholder:text-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Região <span className="text-red-400">*</span></label>
                  <input type="text" value={createForm.regiao} onChange={(e) => setCreateForm((prev) => ({ ...prev, regiao: e.target.value }))} placeholder="Ex: Sobradinho, DF" className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 placeholder:text-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Descrição</label>
                  <input type="text" value={createForm.descricao} onChange={(e) => setCreateForm((prev) => ({ ...prev, descricao: e.target.value }))} placeholder="Breve descrição (opcional)" className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 placeholder:text-gray-400" />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
                <button onClick={() => setShowCreateModal(false)} disabled={creating} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50">Cancelar</button>
                <button onClick={handleCreate} disabled={creating || !createForm.nome.trim() || !createForm.regiao.trim()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-gray-900 to-gray-700 text-white hover:from-gray-800 hover:to-gray-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                  {creating ? (<><Loader2 className="w-4 h-4 animate-spin" /> Criando...</>) : (<><Check className="w-4 h-4" /> Criar Empreendimento</>)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
                <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Confirmar Remoção</h3>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                <p className="text-sm text-gray-600 leading-relaxed">
                  Tem certeza que deseja remover o empreendimento{" "}
                  <span className="font-bold text-gray-900">{deleteTarget.nome}</span>?
                </p>
                <p className="text-sm text-red-600 mt-2 font-medium">
                  Isso removerá também todas as unidades associadas.
                </p>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Removendo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Remover
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create User Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateUserModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowCreateUserModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">Novo Usuário</h3>
                </div>
                <button onClick={() => setShowCreateUserModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                {!createdUserPassword ? (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">E-mail</label>
                      <input
                        type="email"
                        value={createUserForm.email}
                        onChange={(e) => setCreateUserForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="usuario@email.com"
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Nome de exibição (opcional)</label>
                      <input
                        type="text"
                        value={createUserForm.displayName}
                        onChange={(e) => setCreateUserForm((f) => ({ ...f, displayName: e.target.value }))}
                        placeholder="Nome do usuário"
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Função</label>
                      <select
                        value={createUserForm.role}
                        onChange={(e) => setCreateUserForm((f) => ({ ...f, role: e.target.value as "comum" | "coordenador" | "admin_sistema" }))}
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
                      >
                        <option value="comum">Usuário Comum</option>
                        <option value="coordenador">Coordenador</option>
                        <option value="admin_sistema">Administrador do Sistema</option>
                      </select>
                    </div>
                    <p className="text-xs text-gray-500 bg-blue-50 p-3 rounded-xl border border-blue-100">
                      Uma senha temporária será gerada automaticamente. O usuário deverá definiu sua própria senha no primeiro acesso, além de configurar a autenticação em duas etapas.
                    </p>
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
                      <Check className="w-7 h-7 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Usuário criado com sucesso!</h4>
                      <p className="text-xs text-gray-500 mt-1">Compartilhe a senha temporária com o usuário:</p>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-gray-900 rounded-xl justify-center">
                      <code className={`text-white font-mono text-lg tracking-wider ${showPassword ? "" : "blur-sm select-none"}`}>
                        {createdUserPassword}
                      </code>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(createdUserPassword); addToast("success", "Senha copiada!"); }}
                        className="text-gray-400 hover:text-white"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-amber-600 font-medium">
                      Esta senha será exibida apenas uma vez.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
                {createdUserPassword ? (
                  <button
                    onClick={() => { setShowCreateUserModal(false); fetchUsers(); }}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-gray-900 to-gray-700 text-white hover:from-gray-800 hover:to-gray-600 transition-all shadow-md"
                  >
                    Concluir
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setShowCreateUserModal(false)}
                      disabled={creatingUser}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={async () => {
                        if (!createUserForm.email.includes("@")) {
                          addToast("error", "E-mail inválido");
                          return;
                        }
                        setCreatingUser(true);
                        try {
                          const res = await fetch("/api/admin-sistema/users/create", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              email: createUserForm.email,
                              displayName: createUserForm.displayName || undefined,
                              role: createUserForm.role,
                            }),
                          });
                          if (!res.ok) {
                            const json = await res.json();
                            throw new Error(json.error || "Erro ao criar usuário");
                          }
                          const json = await res.json();
                          setCreatedUserPassword(json.user.tempPassword);
                          addToast("success", `Usuário ${createUserForm.email} criado!`);
                        } catch (err) {
                          addToast("error", (err as Error).message);
                        } finally {
                          setCreatingUser(false);
                        }
                      }}
                      disabled={creatingUser || !createUserForm.email.includes("@")}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-gray-900 to-gray-700 text-white hover:from-gray-800 hover:to-gray-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingUser ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</> : <><Check className="w-4 h-4" /> Criar Usuário</>}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── Toast Notifications ─────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-[400] flex flex-col gap-2 max-w-sm">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm ${
                toast.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {toast.type === "success" ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <p className="text-sm font-medium">{toast.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Assinaturas Tab Component ───────────────────────────────────────────────

interface AssinaturasTabProps {
  assinaturas: Record<string, unknown>[];
  assinaturasLoading: boolean;
  planosAdmin: Record<string, unknown>[];
  syncingPlano: string | null;
  changingStatus: string | null;
  statusChangeDialog: { id: string; currentStatus: string } | null;
  newStatus: string;
  statusMotivo: string;
  savingPlano: boolean;
  deletingPlano: string | null;
  togglingPlano: string | null;
  addToast: (type: "success" | "error", message: string) => void;
  onSyncPlano: (planoId: string) => Promise<void>;
  onFetchAssinaturas: () => Promise<void>;
  onFetchPlanos: () => Promise<void>;
  onOpenStatusChange: (id: string, current: string) => void;
  onConfirmStatusChange: () => Promise<void>;
  onSetStatusChangeDialog: (v: { id: string; currentStatus: string } | null) => void;
  onSetNewStatus: (v: string) => void;
  onSetStatusMotivo: (v: string) => void;
  onSavePlano: (data: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  onDeletePlano: (planoId: string) => Promise<void>;
  onTogglePlano: (planoId: string, currentAtivo: boolean) => Promise<void>;
}

interface PlanoFormState {
  id?: string;
  nome: string;
  descricao: string;
  periodo_meses: string;
  preco: string;
  features: string;
  popular: boolean;
  ativo: boolean;
  ordem: string;
}

const EMPTY_PLANO_FORM: PlanoFormState = {
  nome: "",
  descricao: "",
  periodo_meses: "1",
  preco: "",
  features: "",
  popular: false,
  ativo: true,
  ordem: "",
};

function AssinaturasTab({
  assinaturas, assinaturasLoading, planosAdmin, syncingPlano,
  changingStatus, statusChangeDialog, newStatus, statusMotivo,
  savingPlano, deletingPlano, togglingPlano,
  addToast, onSyncPlano, onFetchAssinaturas, onFetchPlanos,
  onOpenStatusChange, onConfirmStatusChange,
  onSetStatusChangeDialog, onSetNewStatus, onSetStatusMotivo,
  onSavePlano, onDeletePlano, onTogglePlano,
}: AssinaturasTabProps) {
  const [innerTab, setInnerTab] = useState<"assinaturas" | "planos">("assinaturas");

  // Plano form
  const [showPlanoDialog, setShowPlanoDialog] = useState(false);
  const [planoForm, setPlanoForm] = useState<PlanoFormState>(EMPTY_PLANO_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Ativação manual de assinatura
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [activateForm, setActivateForm] = useState({ userId: "", planoId: "", motivo: "" });
  const [activateUsers, setActivateUsers] = useState<Record<string, unknown>[]>([]);
  const [activateLoading, setActivateLoading] = useState(false);
  const [activateFetchingUsers, setActivateFetchingUsers] = useState(false);

  // Correcao de usuarios legados
  const [fixLegacyLoading, setFixLegacyLoading] = useState(false);

  const statusLabels: Record<string, string> = {
    active: "Ativa", pending: "Pendente", cancelled: "Cancelada",
    paused: "Pausada", expired: "Expirada", cancelled_by_user: "Cancelada (user)",
  };

  const statusColors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    cancelled: "bg-red-100 text-red-700",
    cancelled_by_user: "bg-red-100 text-red-700",
    paused: "bg-gray-100 text-gray-700",
    expired: "bg-gray-100 text-gray-500",
  };

  const openCreatePlano = () => {
    setPlanoForm(EMPTY_PLANO_FORM);
    setShowPlanoDialog(true);
  };

  const handleOpenActivateDialog = async () => {
    setActivateForm({ userId: "", planoId: "", motivo: "" });
    setShowActivateDialog(true);
    if (activateUsers.length === 0) {
      setActivateFetchingUsers(true);
      try {
        const res = await fetch("/api/admin-sistema/users");
        if (res.ok) {
          const json = await res.json();
          setActivateUsers((json.users || []).filter((u: Record<string, unknown>) => u.role !== "admin_sistema"));
        }
      } catch {
        addToast("error", "Erro ao buscar usuários.");
      } finally {
        setActivateFetchingUsers(false);
      }
    }
  };

  const handleFixLegacy = async () => {
    setFixLegacyLoading(true);
    try {
      const res = await fetch("/api/admin-sistema/assinaturas/fix-legacy", {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        const parts: string[] = [];
        if (json.fixed_no_subscription?.length > 0) {
          parts.push(`${json.fixed_no_subscription.length} sem assinatura corrigidos`);
        }
        if (json.fixed_expired?.length > 0) {
          parts.push(`${json.fixed_expired.length} expirados`);
        }
        const msg = parts.length > 0
          ? `Correcao concluida: ${parts.join(", ")}.`
          : "Nenhum usuario precisava de correcao.";
        addToast("success", msg);
        if (json.total_fixed > 0) {
          await onFetchAssinaturas();
        }
      } else {
        addToast("error", json.error || "Erro ao corrigir usuarios legados.");
      }
    } catch {
      addToast("error", "Erro ao corrigir usuarios legados.");
    } finally {
      setFixLegacyLoading(false);
    }
  };

  const handleActivateManual = async () => {
    if (!activateForm.userId || !activateForm.planoId || activateForm.motivo.trim().length < 10) {
      addToast("error", "Selecione um usuário, um plano e forneça um motivo (mín. 10 caracteres).");
      return;
    }
    setActivateLoading(true);
    try {
      const res = await fetch("/api/admin-sistema/assinaturas/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activateForm.userId,
          planoId: activateForm.planoId,
          motivo: activateForm.motivo.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast("success", json.message || "Assinatura ativada manualmente.");
        setShowActivateDialog(false);
        await onFetchAssinaturas();
      } else {
        addToast("error", json.error || "Erro ao ativar assinatura.");
      }
    } catch {
      addToast("error", "Erro ao ativar assinatura.");
    } finally {
      setActivateLoading(false);
    }
  };

  const openEditPlano = (plano: Record<string, unknown>) => {
    const featuresArr = Array.isArray(plano.features) ? (plano.features as string[]).join(", ") : "";
    setPlanoForm({
      id: plano.id as string,
      nome: plano.nome as string,
      descricao: plano.descricao as string || "",
      periodo_meses: String(plano.periodo_meses),
      preco: String(plano.preco),
      features: featuresArr,
      popular: plano.popular as boolean || false,
      ativo: plano.ativo as boolean ?? true,
      ordem: plano.ordem ? String(plano.ordem) : "",
    });
    setShowPlanoDialog(true);
  };

  const handleSavePlanoForm = async () => {
    if (!planoForm.nome.trim() || !planoForm.preco || !planoForm.periodo_meses) {
      addToast("error", "Preencha nome, preço e período.");
      return;
    }
    const features = planoForm.features
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    const payload: Record<string, unknown> = {
      nome: planoForm.nome.trim(),
      descricao: planoForm.descricao.trim(),
      periodo_meses: parseInt(planoForm.periodo_meses, 10),
      preco: parseFloat(planoForm.preco),
      features,
      popular: planoForm.popular,
      ativo: planoForm.ativo,
    };
    if (planoForm.id) payload.id = planoForm.id;
    if (planoForm.ordem) payload.ordem = parseInt(planoForm.ordem, 10);

    const result = await onSavePlano(payload);
    if (result) setShowPlanoDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button onClick={() => setInnerTab("assinaturas")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${innerTab === "assinaturas" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <CreditCard className="w-4 h-4" /> Assinaturas
        </button>
        <button onClick={() => setInnerTab("planos")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${innerTab === "planos" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <Crown className="w-4 h-4" /> Planos / MP
        </button>
      </div>

      {/* ══ Sub-tab: Assinaturas ══ */}
      {innerTab === "assinaturas" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Assinaturas</h2>
              <p className="text-sm text-gray-500 mt-1">
                {assinaturasLoading ? "Carregando..." : `${assinaturas.length} assinatura(s)`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onFetchAssinaturas} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                <RefreshCw className="w-4 h-4" />
              </button>
              <Button
                onClick={handleFixLegacy}
                disabled={fixLegacyLoading}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-md rounded-xl h-9 px-4 text-xs font-semibold"
              >
                {fixLegacyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {fixLegacyLoading ? "Corrigindo..." : "Corrigir legados"}
              </Button>
              <Button
                onClick={handleOpenActivateDialog}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md rounded-xl h-9 px-4 text-xs font-semibold"
              >
                <Check className="w-4 h-4" /> Ativar manualmente
              </Button>
            </div>
          </div>
          {assinaturasLoading && <div className="space-y-3">{[1,2,3].map(i => (<div key={i} className="bg-white rounded-xl p-4 border animate-pulse"><div className="h-4 bg-gray-200 rounded w-48" /></div>))}</div>}
          {!assinaturasLoading && assinaturas.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50/50 text-gray-500 text-xs uppercase">
                    <th className="text-left px-4 py-3">Usuário</th>
                    <th className="text-left px-4 py-3">Plano</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Método</th>
                    <th className="text-left px-4 py-3">Início</th>
                    <th className="text-left px-4 py-3">Ações</th>
                  </tr></thead>
                  <tbody>
                    {assinaturas.map((ass: Record<string, unknown>) => {
                      const user = (ass.user as Record<string, unknown>) || {};
                      const plano = (ass.plano as Record<string, unknown>) || {};
                      const status = (ass.status as string) || "pending";
                      return (
                        <tr key={ass.id as string} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{(user.display_name as string) || (user.email as string)?.split("@")[0]}</p>
                            <p className="text-xs text-gray-500">{user.email as string}</p>
                          </td>
                          <td className="px-4 py-3 font-medium">{plano.nome as string}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[status] || "bg-gray-100 text-gray-500"}`}>
                              {statusLabels[status] || status}
                            </span>
                          </td>
                          <td className="px-4 py-3 capitalize text-gray-600">{ass.metodo_pagamento as string || "—"}</td>
                          <td className="px-4 py-3 text-gray-500">{ass.data_inicio ? new Date(ass.data_inicio as string).toLocaleDateString("pt-BR") : "—"}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => onOpenStatusChange(ass.id as string, status)}
                              disabled={changingStatus === (ass.id as string)}
                              className="text-xs font-semibold text-amber-600 hover:text-amber-800 disabled:opacity-50"
                            >
                              Alterar status
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {!assinaturasLoading && assinaturas.length === 0 && (
            <div className="text-center py-12 text-gray-400"><p className="text-sm">Nenhuma assinatura registrada.</p></div>
          )}
        </>
      )}

      {/* ══ Sub-tab: Planos ══ */}
      {innerTab === "planos" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Planos e Mercado Pago</h2>
              <p className="text-sm text-gray-500 mt-1">Gerencie os planos de assinatura.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onFetchPlanos} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                <RefreshCw className="w-4 h-4" />
              </button>
              <Button
                onClick={openCreatePlano}
                className="flex items-center gap-2 bg-gradient-to-r from-gray-900 to-gray-700 text-white hover:from-gray-800 hover:to-gray-600 shadow-md rounded-xl h-9 px-4 text-xs font-semibold"
              >
                <Plus className="w-4 h-4" /> Novo Plano
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {planosAdmin.map((plano: Record<string, unknown>) => {
              const hasMpId = !!plano.mercadopago_plan_id;
              const isAtivo = plano.ativo as boolean;
              return (
                <div key={plano.id as string} className={`bg-white rounded-xl p-4 sm:p-5 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${!isAtivo ? "opacity-60" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{plano.nome as string}</p>
                      {hasMpId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                          <Check className="w-3 h-3" /> MP
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-semibold">
                          Sem MP
                        </span>
                      )}
                      {isAtivo ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">Ativo</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold">Inativo</span>
                      )}
                      {plano.popular && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">Popular</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      R$ {Number(plano.preco).toFixed(2).replace(".", ",")} — {(plano.periodo_meses as number)}{"mes" + ((plano.periodo_meses as number) > 1 ? "es" : "")}
                      {plano.descricao ? ` — ${plano.descricao}` : ""}
                    </p>
                    {hasMpId && (
                      <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">MP: {plano.mercadopago_plan_id as string}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Toggle ativo/inativo */}
                    <button
                      onClick={() => onTogglePlano(plano.id as string, isAtivo)}
                      disabled={togglingPlano === (plano.id as string)}
                      className={`p-2 rounded-lg border transition-colors text-xs ${isAtivo ? "border-red-200 text-red-500 hover:bg-red-50" : "border-emerald-200 text-emerald-500 hover:bg-emerald-50"} disabled:opacity-50`}
                      title={isAtivo ? "Desativar" : "Ativar"}
                    >
                      {togglingPlano === (plano.id as string) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isAtivo ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    {/* Editar */}
                    <button
                      onClick={() => openEditPlano(plano)}
                      className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {/* Excluir */}
                    <button
                      onClick={() => setDeleteConfirm(plano.id as string)}
                      disabled={deletingPlano === (plano.id as string)}
                      className="p-2 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Excluir"
                    >
                      {deletingPlano === (plano.id as string) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                    {/* Sincronizar MP */}
                    {!hasMpId && (
                      <button
                        onClick={() => onSyncPlano(plano.id as string)}
                        disabled={syncingPlano === (plano.id as string)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {syncingPlano === (plano.id as string) ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sync...</> : "Sync MP"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {planosAdmin.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">Nenhum plano cadastrado.</p>
                <Button onClick={openCreatePlano} variant="outline" className="mt-3 rounded-xl text-xs">Criar primeiro plano</Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══ Dialog: Criar/Editar Plano ══ */}
      <Dialog open={showPlanoDialog} onOpenChange={setShowPlanoDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{planoForm.id ? "Editar Plano" : "Novo Plano"}</DialogTitle>
            <DialogDescription>
              {planoForm.id ? "Altere os dados do plano abaixo." : "Preencha os dados para criar um novo plano."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Nome *</label>
                <input
                  value={planoForm.nome}
                  onChange={(e) => setPlanoForm((p) => ({ ...p, nome: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                  placeholder="Ex: Mensal, Trimestral..."
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Preço (R$) *</label>
                <input
                  type="number" step="0.01" min="0" inputMode="decimal"
                  value={planoForm.preco}
                  onChange={(e) => setPlanoForm((p) => ({ ...p, preco: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                  placeholder="49.90"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Período (meses) *</label>
                <input
                  type="number" min="1" step="1" inputMode="numeric"
                  value={planoForm.periodo_meses}
                  onChange={(e) => setPlanoForm((p) => ({ ...p, periodo_meses: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Ordem</label>
                <input
                  type="number" min="0" step="1" inputMode="numeric"
                  value={planoForm.ordem}
                  onChange={(e) => setPlanoForm((p) => ({ ...p, ordem: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                  placeholder="Auto"
                />
              </div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={planoForm.popular}
                    onChange={(e) => setPlanoForm((p) => ({ ...p, popular: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Popular</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={planoForm.ativo}
                    onChange={(e) => setPlanoForm((p) => ({ ...p, ativo: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Ativo</span>
                </label>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Descrição</label>
                <textarea
                  value={planoForm.descricao}
                  onChange={(e) => setPlanoForm((p) => ({ ...p, descricao: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Descrição breve do plano..."
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Features (separadas por vírgula)</label>
                <textarea
                  value={planoForm.features}
                  onChange={(e) => setPlanoForm((p) => ({ ...p, features: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Espelho de vendas, Todos os empreendimentos, Suporte..."
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPlanoDialog(false)} className="flex-1 rounded-xl" disabled={savingPlano}>Cancelar</Button>
            <Button
              onClick={handleSavePlanoForm}
              disabled={savingPlano || !planoForm.nome.trim() || !planoForm.preco || !planoForm.periodo_meses}
              className="flex-1 rounded-xl bg-gray-900 hover:bg-gray-800 text-white"
            >
              {savingPlano ? <Loader2 className="w-4 h-4 animate-spin" /> : planoForm.id ? "Salvar alterações" : "Criar plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Dialog: Confirmar exclusão ══ */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir plano?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Se houver assinaturas ativas, a exclusão será bloqueada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl">Cancelar</Button>
            <Button
              onClick={() => { if (deleteConfirm) { onDeletePlano(deleteConfirm); setDeleteConfirm(null); } }}
              disabled={!deleteConfirm || deletingPlano !== null}
              variant="destructive"
              className="flex-1 rounded-xl"
            >
              {deletingPlano ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Dialog: Alterar status da assinatura ══ */}
      <Dialog open={!!statusChangeDialog} onOpenChange={(open) => !open && onSetStatusChangeDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar status da assinatura</DialogTitle>
            <DialogDescription>Status atual: {statusChangeDialog?.currentStatus}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Novo status</label>
              <select
                value={newStatus}
                onChange={(e) => onSetNewStatus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Selecionar...</option>
                <option value="active">Ativa</option>
                <option value="paused">Pausada</option>
                <option value="cancelled">Cancelada</option>
                <option value="expired">Expirada</option>
                <option value="pending">Pendente</option>
              </select>
            </div>
            {(newStatus === "cancelled" || newStatus === "expired") && (
              <div>
                <label className="text-sm font-medium text-gray-700">Motivo (opcional)</label>
                <textarea
                  value={statusMotivo}
                  onChange={(e) => onSetStatusMotivo(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Ex: Inadimplência, solicitação do usuário..."
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onSetStatusChangeDialog(null)} className="flex-1 rounded-xl">Cancelar</Button>
            <Button
              onClick={onConfirmStatusChange}
              disabled={!newStatus || changingStatus !== null}
              className="flex-1 rounded-xl bg-gray-900 hover:bg-gray-800 text-white"
            >
              {changingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Dialog: Ativar assinatura manualmente ══ */}
      <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ativar assinatura manualmente</DialogTitle>
            <DialogDescription>
              Crie uma assinatura ativa para um usuário existente sem depender do pagamento via Mercado Pago.
              A ação é registrada com auditoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Usuário *</label>
              <select
                value={activateForm.userId}
                onChange={(e) => setActivateForm((f) => ({ ...f, userId: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                disabled={activateFetchingUsers}
              >
                <option value="">{activateFetchingUsers ? "Carregando..." : "Selecionar usuário..."}</option>
                {activateUsers.map((u) => (
                  <option key={u.id as string} value={u.id as string}>
                    {u.email as string}{u.display_name ? ` — ${u.display_name}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Plano *</label>
              <select
                value={activateForm.planoId}
                onChange={(e) => setActivateForm((f) => ({ ...f, planoId: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Selecionar plano...</option>
                {planosAdmin.filter((p) => p.ativo).map((p) => (
                  <option key={p.id as string} value={p.id as string}>
                    {p.nome as string} — R$ {Number(p.preco).toFixed(2).replace(".", ",")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Motivo da ativação * <span className="text-xs text-gray-400">(mín. 10 caracteres)</span></label>
              <textarea
                value={activateForm.motivo}
                onChange={(e) => setActivateForm((f) => ({ ...f, motivo: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={3}
                placeholder="Ex: Usuário pré-existente antes da integração com Mercado Pago..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowActivateDialog(false)} className="flex-1 rounded-xl" disabled={activateLoading}>Cancelar</Button>
            <Button
              onClick={handleActivateManual}
              disabled={activateLoading || !activateForm.userId || !activateForm.planoId || activateForm.motivo.trim().length < 10}
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {activateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ativar assinatura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
