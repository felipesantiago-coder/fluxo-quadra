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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

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

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
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

  useEffect(() => {
    fetchEmpreendimentos();
  }, [fetchEmpreendimentos]);

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
    input.accept = ".webp";
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
        addToast("success", `Excel processado: ${json.inserted} unidades inseridas de ${json.total_rows} linhas`);
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
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-gray-400">
            Administração do Sistema • Espelho de Vendas
          </p>
        </div>
      </footer>

      {/* ── Create Modal ───────────────────────────────────────────────── */}
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
              {/* Modal header */}
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
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal body */}
              <div className="px-6 py-5 space-y-4">
                {/* Nome */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Nome <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.nome}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Quattre Istambul"
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 placeholder:text-gray-400"
                  />
                </div>

                {/* Região */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Região <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.regiao}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, regiao: e.target.value }))}
                    placeholder="Ex: Sobradinho, DF"
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 placeholder:text-gray-400"
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Descrição
                  </label>
                  <input
                    type="text"
                    value={createForm.descricao}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Breve descrição do empreendimento (opcional)"
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !createForm.nome.trim() || !createForm.regiao.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-gray-900 to-gray-700 text-white hover:from-gray-800 hover:to-gray-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Criar Empreendimento
                    </>
                  )}
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
