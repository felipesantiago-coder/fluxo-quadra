"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { floors, areaTypes, statusTypes, formatCurrency, type Unit, units as staticUnits } from "@/lib/units-data";
import { Building2, Car, Maximize2, DollarSign, ChevronUp, Filter, Layers, X, Sun, BedDouble, Calculator, Shield, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";

// ─── Color palette for unit types ───
const typeColors: Record<Unit["tipoArea"], { bg: string; border: string; text: string; gradient: string; accent: string }> = {
  "66m²": {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    gradient: "from-emerald-500 to-emerald-600",
    accent: "bg-emerald-500",
  },
  "67m²": {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-700",
    gradient: "from-sky-500 to-sky-600",
    accent: "bg-sky-500",
  },
  "69m²": {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    gradient: "from-amber-500 to-amber-600",
    accent: "bg-amber-500",
  },
  "100m²": {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    gradient: "from-violet-500 to-violet-600",
    accent: "bg-violet-500",
  },
};

const statusLabels: Record<Unit["status"], { label: string; color: string; dotColor: string }> = {
  disponivel: { label: "Disponível", color: "bg-emerald-100 text-emerald-800 border-emerald-200", dotColor: "bg-emerald-500" },
  reservado: { label: "Reservada", color: "bg-amber-100 text-amber-800 border-amber-200", dotColor: "bg-amber-500" },
  vendido: { label: "Vendida", color: "bg-red-100 text-red-800 border-red-200", dotColor: "bg-red-500" },
};

const allStatuses: { value: Unit["status"]; label: string; dotColor: string }[] = [
  { value: "disponivel", label: "Disponível", dotColor: "bg-emerald-500" },
  { value: "reservado", label: "Reservada", dotColor: "bg-amber-500" },
  { value: "vendido", label: "Vendida", dotColor: "bg-red-500" },
];

// ─── Unit Card (compact grid card) ───
function UnitCard({
  unit,
  onSelect,
  isBackground,
  isAdmin,
  onStatusChange,
}: {
  unit: Unit;
  onSelect: (unit: Unit) => void;
  isBackground: boolean;
  isAdmin?: boolean;
  onStatusChange?: (unidade: number, newStatus: Unit["status"]) => void;
}) {
  const colors = typeColors[unit.tipoArea];
  const status = statusLabels[unit.status];
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);

  // Fechar o menu ao clicar fora
  useEffect(() => {
    if (!showStatusMenu) return;
    const handleClickOutside = () => setShowStatusMenu(false);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showStatusMenu]);

  // Limpar feedback após 3 segundos
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdmin) setShowStatusMenu(!showStatusMenu);
  };

  const handleStatusSelect = async (e: React.MouseEvent, newStatus: Unit["status"]) => {
    e.stopPropagation();
    setShowStatusMenu(false);
    if (!onStatusChange || newStatus === unit.status) return;

    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/units", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unidade: unit.unidade, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        onStatusChange(unit.unidade, newStatus);
        setFeedback("success");
      } else {
        console.error("Erro ao atualizar status:", data.error);
        setFeedback("error");
      }
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      setFeedback("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: isBackground ? 0.25 : 1,
        y: 0,
      }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        layout: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.3 },
      }}
      whileHover={!isBackground ? { y: -6, scale: 1.03 } : {}}
      onClick={() => onSelect(unit)}
      className={`
        relative cursor-pointer rounded-xl border-2 overflow-visible
        bg-white shadow-md hover:shadow-xl
        transition-all duration-300 ease-out
        border-gray-100
        ${isBackground ? "pointer-events-none" : ""}
      `}
      style={{
        filter: isBackground ? "blur(2px)" : "none",
      }}
    >
      {/* Top colored bar */}
      <div className={`h-1.5 bg-gradient-to-r ${colors.gradient}`} />

      <div className="p-5 space-y-3">
        {/* Header: Unit number + Status */}
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-gray-900">
            {unit.unidade}
          </span>
          <div className="relative">
            <button
              onClick={handleStatusClick}
              className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${status.color} ${isAdmin ? "cursor-pointer hover:opacity-80 ring-1 ring-offset-1 ring-gray-200 hover:ring-gray-400" : "cursor-default"}`}
            >
              {saving ? (
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse" />
              ) : (
                <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
              )}
              {status.label}
              {isAdmin && !showStatusMenu && <span className="ml-0.5 opacity-50">▾</span>}
            </button>

            {/* Dropdown de status */}
            <AnimatePresence>
              {showStatusMenu && isAdmin && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-200 py-1 min-w-[140px] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-1.5">Alterar status</p>
                  {allStatuses.map((s) => (
                    <button
                      key={s.value}
                      onClick={(e) => handleStatusSelect(e, s.value)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                        s.value === unit.status
                          ? "bg-gray-50 text-gray-400"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${s.dotColor}`} />
                      {s.label}
                      {s.value === unit.status && <Check className="w-3 h-3 ml-auto" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Feedback visual de sucesso/erro */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg ${
                feedback === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {feedback === "success" ? (
                <Check className="w-3 h-3 flex-shrink-0" />
              ) : (
                <X className="w-3 h-3 flex-shrink-0" />
              )}
              {feedback === "success" ? "Status atualizado!" : "Erro ao atualizar. Verifique o console."}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info items */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">{unit.areaStr}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500">
            <Car className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">{unit.vagas} vag{unit.vagas === 1 ? "a" : "as"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500">
            <BedDouble className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">{unit.quartos} qts</span>
          </div>
        </div>

        {/* Price */}
        <div className="pt-1">
          <p className={`text-lg font-bold ${unit.valorVenda ? "text-gray-900" : "text-gray-400 italic"}`}>
            {unit.valorFormatado}
          </p>
          {unit.valorVenda && (
            <p className="text-[11px] text-gray-400 mt-0.5">
              R$ {(unit.valorVenda / unit.area).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/m²
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Expanded Centered Card ───
function ExpandedCard({ unit, onClose }: { unit: Unit; onClose: () => void }) {
  const colors = typeColors[unit.tipoArea];
  const status = statusLabels[unit.status];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 40 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Top gradient bar */}
        <div className={`h-2 bg-gradient-to-r ${colors.gradient}`} />

        <div className="p-6 sm:p-8 space-y-5">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-20"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                Unidade {unit.unidade}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {unit.andar}º Andar — Quattre Istambul
              </p>
              <div className="mt-3">
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${status.color}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                  {status.label}
                </span>
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-100" />

          {/* Stats grid 2x2 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                <BedDouble className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{unit.quartos} quarto{unit.quartos > 1 ? "s" : ""}</p>
                <p className="text-[11px] text-gray-400 font-medium">Dormitórios</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                <Maximize2 className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{unit.areaStr}</p>
                <p className="text-[11px] text-gray-400 font-medium">Área Privativa</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                <Car className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{unit.vagas} vaga{unit.vagas > 1 ? "s" : ""}</p>
                <p className="text-[11px] text-gray-400 font-medium">Garagem</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                <Sun className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{unit.posicaoSolar}</p>
                <p className="text-[11px] text-gray-400 font-medium">Posição Solar</p>
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-100" />

          {/* Price */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Valor de Venda</span>
            </div>
            {unit.valorVenda ? (
              <div className="space-y-2">
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(unit.valorVenda)}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs border-gray-200">
                    R$ {(unit.valorVenda / unit.area).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/m²
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-lg font-semibold text-gray-400">Consulte o valor</p>
                <p className="text-sm text-gray-400 mt-1">Entre em contato para saber o valor desta unidade</p>
              </div>
            )}
          </div>

          {/* Simular button */}
          <a
            href={`/simulador?valor=${unit.valorVenda || 0}&unidade=${unit.unidade}&area=${unit.areaStr}&andar=${unit.andar}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!unit.valorVenda) { e.preventDefault(); return; }
            }}
            className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${unit.valorVenda ? "bg-gradient-to-r from-gray-900 to-gray-700 text-white hover:from-gray-800 hover:to-gray-600 shadow-lg hover:shadow-xl" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
          >
            <Calculator className="w-4 h-4" />
            Simular Financiamento
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Floor Section ───
function FloorSection({
  floor,
  floorUnits,
  selectedUnit,
  onSelectUnit,
  isCollapsed,
  onToggle,
  isAdmin,
  onStatusChange,
}: {
  floor: number;
  floorUnits: Unit[];
  selectedUnit: Unit | null;
  onSelectUnit: (unit: Unit) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  isAdmin?: boolean;
  onStatusChange?: (unidade: number, newStatus: Unit["status"]) => void;
}) {
  return (
    <motion.div layout className="space-y-4">
      {/* Floor header */}
      <motion.button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg hover:shadow-xl transition-shadow group"
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold">{floor}º Andar</h3>
            <p className="text-sm text-white/60">{floorUnits.length} unidades</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            {areaTypes.map((type) => {
              const count = floorUnits.filter((u) => u.tipoArea === type).length;
              if (count === 0) return null;
              return (
                <Badge key={type} variant="secondary" className="text-[10px] font-semibold bg-white/15 text-white/80 border-white/20">
                  {count}x {type}
                </Badge>
              );
            })}
          </div>
          <motion.div animate={{ rotate: isCollapsed ? 0 : 180 }}>
            <ChevronUp className="w-5 h-5 text-white/60" />
          </motion.div>
        </div>
      </motion.button>

      {/* Floor units grid */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-visible"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {floorUnits.map((unit) => (
                <UnitCard
                  key={unit.unidade}
                  unit={unit}
                  onSelect={onSelectUnit}
                  isBackground={selectedUnit !== null && selectedUnit?.unidade !== unit.unidade}
                  isAdmin={isAdmin}
                  onStatusChange={onStatusChange}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Legend ───
function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-white/80 shadow-sm border border-gray-100">
      <span className="text-xs font-semibold text-gray-500 mr-1">Tipologias:</span>
      {areaTypes.map((type) => (
        <Badge key={type} variant="outline" className={`text-[11px] font-semibold ${typeColors[type].bg} ${typeColors[type].text} ${typeColors[type].border}`}>
          <span className={`w-2 h-2 rounded-full ${typeColors[type].accent} mr-1`} />
          {type}
        </Badge>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───
export default function SalesDashboard({ isAdmin = false }: { isAdmin?: boolean }) {
  const [units, setUnits] = useState<Unit[]>(staticUnits);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [collapsedFloors, setCollapsedFloors] = useState<Set<number>>(new Set());
  const [filterQuartos, setFilterQuartos] = useState<number | "all">("all");
  const [filterFloor, setFilterFloor] = useState<number | "all">("all");
  const [filterVagas, setFilterVagas] = useState<number | "all">("all");
  const [filterStatus, setFilterStatus] = useState<Unit["status"] | "all">("all");

  // Buscar dados do Supabase via API + Realtime
  useEffect(() => {
    let supabaseChannel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;

    async function loadData() {
      try {
        const res = await fetch("/api/units");
        const data = await res.json();

        const mapped: Unit[] = (Array.isArray(data) ? data : []).map((row: Record<string, unknown>) => ({
          andar: row.andar as number,
          unidade: row.unidade as number,
          vagas: row.vagas as number,
          area: Number(row.area),
          areaStr: row.area_str as string,
          valorVenda: row.valor_venda as number | null,
          valorStr: row.valor_venda ? Number(row.valor_venda).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "Consulte",
          valorFormatado: row.valor_venda ? formatCurrency(Number(row.valor_venda)) : "Consulte o valor",
          tipoArea: row.tipo_area as Unit["tipoArea"],
          status: row.status as Unit["status"],
          posicaoSolar: row.posicao_solar as Unit["posicaoSolar"],
          quartos: row.quartos as 2 | 3,
        }));

        setUnits(mapped);

        // Realtime: escutar mudanças de status
        const supabase = createClient();
        supabaseChannel = supabase
          .channel("dashboard-realtime")
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "units" },
            (payload) => {
              const updated = payload.new as Record<string, unknown>;
              setUnits((prev) =>
                prev.map((u) =>
                  u.unidade === updated.unidade
                    ? { ...u, status: updated.status as Unit["status"] }
                    : u
                )
              );
            }
          )
          .subscribe();
      } catch {
        console.error("Erro ao carregar dados do Supabase, usando dados estáticos.");
      }
    }

    loadData();

    return () => {
      if (supabaseChannel) {
        createClient().removeChannel(supabaseChannel);
      }
    };
  }, []);

  const filteredUnits = useMemo(() => {
    let result = [...units];
    if (filterQuartos !== "all") result = result.filter((u) => u.quartos === filterQuartos);
    if (filterFloor !== "all") result = result.filter((u) => u.andar === filterFloor);
    if (filterVagas !== "all") result = result.filter((u) => u.vagas === filterVagas);
    if (filterStatus !== "all") result = result.filter((u) => u.status === filterStatus);
    return result;
  }, [units, filterQuartos, filterFloor, filterVagas, filterStatus]);

  const activeFloors = useMemo(() => {
    const floorSet = new Set(filteredUnits.map((u) => u.andar));
    return floors.filter((f) => floorSet.has(f));
  }, [filteredUnits]);

  const handleSelectUnit = useCallback((unit: Unit) => {
    setSelectedUnit(unit);
  }, []);

  const handleLocalStatusChange = useCallback((unidade: number, newStatus: Unit["status"]) => {
    setUnits((prev) => prev.map((u) => u.unidade === unidade ? { ...u, status: newStatus } : u));
    // Também atualizar selectedUnit se for a mesma unidade
    setSelectedUnit((prev) => prev && prev.unidade === unidade ? { ...prev, status: newStatus } : prev);
  }, []);

  const handleCloseExpanded = useCallback(() => {
    setSelectedUnit(null);
  }, []);

  const toggleFloor = useCallback((floor: number) => {
    setCollapsedFloors((prev) => {
      const next = new Set(prev);
      if (next.has(floor)) next.delete(floor);
      else next.add(floor);
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center shadow-md">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                  Quattre <span className="text-gray-400 font-normal">Istambul</span>
                </h1>
                <p className="text-[11px] text-gray-400 font-medium hidden sm:block">Espelho de Vendas</p>
                {isAdmin && (
                  <span className="hidden sm:inline-flex items-center gap-1 ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        {/* Filters */}
        <div className="p-4 rounded-xl bg-white shadow-md border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Filtros</span>
            {(filterQuartos !== "all" || filterFloor !== "all" || filterVagas !== "all" || filterStatus !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-xs text-gray-400 hover:text-gray-600"
                onClick={() => { setFilterQuartos("all"); setFilterFloor("all"); setFilterVagas("all"); setFilterStatus("all"); }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Floor filter */}
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Andar</label>
              <select
                value={filterFloor}
                onChange={(e) => setFilterFloor(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
              >
                <option value="all">Todos</option>
                {floors.map((f) => (
                  <option key={f} value={f}>{f}º Andar</option>
                ))}
              </select>
            </div>

            {/* Quartos filter */}
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Quartos</label>
              <select
                value={filterQuartos}
                onChange={(e) => setFilterQuartos(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
              >
                <option value="all">Todos</option>
                <option value="2">2 quartos</option>
                <option value="3">3 quartos</option>
              </select>
            </div>

            {/* Vagas filter */}
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Vagas</label>
              <select
                value={filterVagas}
                onChange={(e) => setFilterVagas(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
              >
                <option value="all">Todas</option>
                <option value="1">1 vaga</option>
                <option value="2">2 vagas</option>
              </select>
            </div>

            {/* Status filter */}
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as Unit["status"] | "all")}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
              >
                <option value="all">Todos</option>
                {statusTypes.map((s) => (
                  <option key={s} value={s}>
                    {s === "disponivel" ? "Disponível" : s === "reservado" ? "Reservada" : s === "vendido" ? "Vendida" : "Consultar"}
                  </option>
                ))}
              </select>
            </div>

            {/* Results count */}
            <div className="flex items-end">
              <div className="w-full h-9 px-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-500">
                  <span className="font-bold text-gray-900">{filteredUnits.length}</span> resultado{filteredUnits.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <Legend />

        {/* Floor sections */}
        <div className="space-y-6">
          {activeFloors.map((floor) => {
            const floorUnits = filteredUnits
              .filter((u) => u.andar === floor)
              .sort((a, b) => a.unidade - b.unidade);
            return (
              <FloorSection
                key={floor}
                floor={floor}
                floorUnits={floorUnits}
                selectedUnit={selectedUnit}
                onSelectUnit={handleSelectUnit}
                isCollapsed={collapsedFloors.has(floor)}
                onToggle={() => toggleFloor(floor)}
                isAdmin={isAdmin}
                onStatusChange={handleLocalStatusChange}
              />
            );
          })}
        </div>

        {/* Empty state */}
        {activeFloors.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-400">Nenhuma unidade encontrada</h3>
            <p className="text-sm text-gray-300 mt-1">Tente ajustar os filtros para ver mais resultados</p>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <Building2 className="w-4 h-4" />
            <span className="font-semibold text-gray-600">Quattre Istambul</span>
            <span>•</span>
            <span>Espelho de Vendas</span>
          </div>
        </div>
      </footer>

      {/* Expanded centered card overlay */}
      <AnimatePresence>
        {selectedUnit && (
          <ExpandedCard unit={selectedUnit} onClose={handleCloseExpanded} />
        )}
      </AnimatePresence>
    </div>
  );
}
