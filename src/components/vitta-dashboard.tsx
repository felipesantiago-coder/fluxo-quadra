"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  vittaBlocos,
  vittaTipos,
  vittaAndares,
  vittaAndarLabels,
  formatVittaCurrency,
  type VittaUnit,
  vittaUnits as staticUnits,
} from "@/lib/vitta-data";
import { Building2, Maximize2, DollarSign, ChevronUp, Filter, X, Check, LogOut, Calculator, BedDouble, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";

// ─── Color palette for tipos ───
type TipoKey = VittaUnit["tipo"];

const typeColors: Record<TipoKey, { bg: string; border: string; text: string; gradient: string; accent: string }> = {
  "1 quarto": {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    gradient: "from-orange-500 to-orange-600",
    accent: "bg-orange-500",
  },
  "2 quartos": {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    gradient: "from-emerald-500 to-emerald-600",
    accent: "bg-emerald-500",
  },
  "2 quartos (suíte e varanda)": {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-700",
    gradient: "from-sky-500 to-sky-600",
    accent: "bg-sky-500",
  },
  "2 quartos (garden)": {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    gradient: "from-violet-500 to-violet-600",
    accent: "bg-violet-500",
  },
  "Loja": {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    gradient: "from-amber-500 to-amber-600",
    accent: "bg-amber-500",
  },
};

const statusLabels: Record<VittaUnit["status"], { label: string; color: string; dotColor: string }> = {
  disponivel: { label: "Disponível", color: "bg-emerald-100 text-emerald-800 border-emerald-200", dotColor: "bg-emerald-500" },
  reservado: { label: "Reservada", color: "bg-amber-100 text-amber-800 border-amber-200", dotColor: "bg-amber-500" },
  vendido: { label: "Vendida", color: "bg-red-100 text-red-800 border-red-200", dotColor: "bg-red-500" },
};

const allStatuses: { value: VittaUnit["status"]; label: string; dotColor: string }[] = [
  { value: "disponivel", label: "Disponível", dotColor: "bg-emerald-500" },
  { value: "reservado", label: "Reservada", dotColor: "bg-amber-500" },
  { value: "vendido", label: "Vendida", dotColor: "bg-red-500" },
];

const statusTypes = ["disponivel", "reservado", "vendido"] as const;

// ─── Helpers ───
function getQuartos(unit: VittaUnit): number | null {
  if (unit.tipo === "Loja") return null;
  const match = unit.tipo.match(/(\d+)\s*quarto/);
  return match ? parseInt(match[1]) : null;
}

function getPosicaoSolar(unit: VittaUnit): string | null {
  if (unit.tipo === "Loja") return null;
  return unit.unidade % 2 === 0 ? "Nascente" : "Poente";
}

// ─── Unit Card ───
function UnitCard({
  unit,
  onSelect,
  isBackground,
  isAdmin,
  onStatusChange,
}: {
  unit: VittaUnit;
  onSelect: (unit: VittaUnit) => void;
  isBackground: boolean;
  isAdmin?: boolean;
  onStatusChange?: (unidade: number, bloco: string, newStatus: VittaUnit["status"]) => void;
}) {
  const colors = typeColors[unit.tipo as TipoKey] || typeColors["1 quarto"];
  const status = statusLabels[unit.status];
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  useEffect(() => {
    if (!showStatusMenu) return;
    const handleClickOutside = () => setShowStatusMenu(false);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showStatusMenu]);

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdmin) setShowStatusMenu(!showStatusMenu);
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
      <div className={`h-1.5 bg-gradient-to-r ${colors.gradient}`} />
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Bloco {unit.bloco}</span>
            <span className="text-xl font-bold tracking-tight text-gray-900">{unit.unidade}</span>
          </div>
          <div className="relative">
            <button
              onClick={handleStatusClick}
              className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${status.color} ${isAdmin ? "cursor-pointer hover:opacity-80 ring-1 ring-offset-1 ring-gray-200 hover:ring-gray-400" : "cursor-default"}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
              {status.label}
              {isAdmin && !showStatusMenu && <span className="ml-0.5 opacity-50">▾</span>}
            </button>

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
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowStatusMenu(false);
                        if (onStatusChange && s.value !== unit.status) onStatusChange(unit.unidade, unit.bloco, s.value);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                        s.value === unit.status ? "bg-gray-50 text-gray-400" : "hover:bg-gray-50 text-gray-700"
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

        <div>
          <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md ${colors.bg} ${colors.text} ${colors.border} border`}>
            {unit.tipo}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-gray-500">
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="text-sm font-medium">{unit.areaStr}</span>
        </div>

        <div className="pt-1">
          <p className="text-lg font-bold text-gray-900">{unit.valorFormatado}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            R$ {(unit.valorVenda / unit.area).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/m²
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Expanded Card ───
function ExpandedCard({ unit, onClose }: { unit: VittaUnit; onClose: () => void }) {
  const colors = typeColors[unit.tipo as TipoKey] || typeColors["1 quarto"];
  const status = statusLabels[unit.status];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 40 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className={`h-2 bg-gradient-to-r ${colors.gradient}`} />
        <div className="p-6 sm:p-8 space-y-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-20"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>

          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                Unidade {unit.unidade}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Bloco {unit.bloco} — {unit.andar} — Residencial Vitta
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${status.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                  {status.label}
                </span>
                <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md border ${colors.bg} ${colors.text} ${colors.border}`}>
                  {unit.tipo}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">Bloco {unit.bloco}</p>
                <p className="text-[11px] text-gray-400 font-medium">Bloco</p>
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
            {getQuartos(unit) !== null && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <BedDouble className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{getQuartos(unit)} quarto{getQuartos(unit)! > 1 ? "s" : ""}</p>
                  <p className="text-[11px] text-gray-400 font-medium">Dormitórios</p>
                </div>
              </div>
            )}
            {getPosicaoSolar(unit) !== null && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <Sun className={`w-5 h-5 ${getPosicaoSolar(unit) === "Nascente" ? "text-amber-500" : "text-orange-500"}`} />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{getPosicaoSolar(unit)}</p>
                  <p className="text-[11px] text-gray-400 font-medium">Posição Solar</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100" />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Valor de Venda</span>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-gray-900">{formatVittaCurrency(unit.valorVenda)}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-gray-200">
                  R$ {(unit.valorVenda / unit.area).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/m²
                </Badge>
              </div>
            </div>
          </div>

          <a
            href={`/simulador-vitta?valor=${unit.valorVenda}&unidade=${unit.bloco}-${unit.unidade}&area=${unit.areaStr}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 bg-gradient-to-r from-gray-900 to-gray-700 text-white hover:from-gray-800 hover:to-gray-600 shadow-lg hover:shadow-xl"
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
  floor: string;
  floorUnits: VittaUnit[];
  selectedUnit: VittaUnit | null;
  onSelectUnit: (unit: VittaUnit) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  isAdmin?: boolean;
  onStatusChange?: (unidade: number, bloco: string, newStatus: VittaUnit["status"]) => void;
}) {
  const tiposInFloor = [...new Set(floorUnits.map((u) => u.tipo))];
  const totalInFloor = floorUnits.length;
  const disponiveis = floorUnits.filter((u) => u.status === "disponivel").length;

  return (
    <motion.div layout className="space-y-4">
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
            <h3 className="text-lg font-bold">{floor}</h3>
            <p className="text-sm text-white/60">{totalInFloor} unidades • {disponiveis} disponíve{disponiveis !== 1 ? "is" : "l"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
            {tiposInFloor.map((tipo) => {
              const c = typeColors[tipo as TipoKey];
              if (!c) return null;
              const count = floorUnits.filter((u) => u.tipo === tipo).length;
              return (
                <Badge key={tipo} variant="secondary" className="text-[10px] font-semibold bg-white/15 text-white/80 border-white/20">
                  {count}x {tipo}
                </Badge>
              );
            })}
          </div>
          <motion.div animate={{ rotate: isCollapsed ? 0 : 180 }}>
            <ChevronUp className="w-5 h-5 text-white/60" />
          </motion.div>
        </div>
      </motion.button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-visible"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {floorUnits.map((unit) => (
                <UnitCard
                  key={`${unit.bloco}-${unit.unidade}`}
                  unit={unit}
                  onSelect={onSelectUnit}
                  isBackground={selectedUnit !== null && (selectedUnit.bloco !== unit.bloco || selectedUnit.unidade !== unit.unidade)}
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
      {vittaTipos.map((tipo) => {
        const colors = typeColors[tipo as TipoKey];
        if (!colors) return null;
        return (
          <Badge key={tipo} variant="outline" className={`text-[11px] font-semibold ${colors.bg} ${colors.text} ${colors.border}`}>
            <span className={`w-2 h-2 rounded-full ${colors.accent} mr-1`} />
            {tipo}
          </Badge>
        );
      })}
    </div>
  );
}

// ─── Main Dashboard ───
export default function VittaDashboard({ isAdmin = false, hideHeader = false }: { isAdmin?: boolean; hideHeader?: boolean }) {
  const router = useRouter();
  const [units, setUnits] = useState<VittaUnit[]>(staticUnits);
  const [selectedUnit, setSelectedUnit] = useState<VittaUnit | null>(null);
  const [collapsedFloors, setCollapsedFloors] = useState<Set<string>>(new Set());
  const [filterBloco, setFilterBloco] = useState<string>("all");
  const [filterAndar, setFilterAndar] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<VittaUnit["status"] | "all">("all");
  const [sortBy, setSortBy] = useState<"andar" | "price-asc" | "price-desc">("andar");

  const handleSelectUnit = useCallback((unit: VittaUnit) => setSelectedUnit(unit), []);
  const handleCloseExpanded = useCallback(() => setSelectedUnit(null), []);

  const handleLocalStatusChange = useCallback((unidade: number, bloco: string, newStatus: VittaUnit["status"]) => {
    setUnits((prev) => prev.map((u) => (u.bloco === bloco && u.unidade === unidade) ? { ...u, status: newStatus } : u));
    setSelectedUnit((prev) => prev && prev.bloco === bloco && prev.unidade === unidade ? { ...prev, status: newStatus } : prev);
  }, []);

  const toggleFloor = useCallback((floor: string) => {
    setCollapsedFloors((prev) => {
      const next = new Set(prev);
      if (next.has(floor)) next.delete(floor);
      else next.add(floor);
      return next;
    });
  }, []);

  const handleLogout = useCallback(async () => {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }, [router]);

  const filteredUnits = useMemo(() => {
    let result = [...units];
    if (filterBloco !== "all") result = result.filter((u) => u.bloco === filterBloco);
    if (filterAndar !== "all") result = result.filter((u) => u.andar === filterAndar);
    if (filterTipo !== "all") result = result.filter((u) => u.tipo === filterTipo);
    if (filterStatus !== "all") result = result.filter((u) => u.status === filterStatus);
    if (sortBy === "price-asc") result.sort((a, b) => a.valorVenda - b.valorVenda);
    if (sortBy === "price-desc") result.sort((a, b) => b.valorVenda - a.valorVenda);
    return result;
  }, [units, filterBloco, filterAndar, filterTipo, filterStatus, sortBy]);

  // Group by floor for display
  const activeFloors = useMemo(() => {
    const floorSet = new Set(filteredUnits.map((u) => u.andar));
    return vittaAndares.filter((f) => floorSet.has(f));
  }, [filteredUnits]);

  const hasActiveFilters = filterBloco !== "all" || filterAndar !== "all" || filterTipo !== "all" || filterStatus !== "all" || sortBy !== "andar";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex flex-col">
      {!hideHeader && (
        <header className="sticky top-0 z-50 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-lg">
          <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight">
                    Espelho de <span className="text-gray-400 font-normal">Vendas</span>
                  </h1>
                  <p className="text-[11px] text-gray-400 font-medium">Residencial Vitta — Ceilândia</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href="/projetos" className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Projetos
                </a>
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-400 font-medium px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Atualização em tempo real
                </div>
                <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-semibold transition-colors border border-red-500/20">
                  <LogOut className="w-3.5 h-3.5" />
                  Sair
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-6 space-y-6 flex-1">
        {/* Filters */}
        <div className="p-4 rounded-xl bg-white shadow-md border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Filtros</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="ml-auto text-xs text-gray-400 hover:text-gray-600"
                onClick={() => { setFilterBloco("all"); setFilterAndar("all"); setFilterTipo("all"); setFilterStatus("all"); setSortBy("andar"); }}>
                Limpar filtros
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Bloco</label>
              <select value={filterBloco} onChange={(e) => setFilterBloco(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all">
                <option value="all">Todos</option>
                {vittaBlocos.map((b) => (<option key={b} value={b}>Bloco {b}</option>))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Andar</label>
              <select value={filterAndar} onChange={(e) => setFilterAndar(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all">
                <option value="all">Todos</option>
                {vittaAndares.map((a) => (<option key={a} value={a}>{a}</option>))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Tipologia</label>
              <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all">
                <option value="all">Todas</option>
                {vittaTipos.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as VittaUnit["status"] | "all")}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all">
                <option value="all">Todos</option>
                {statusTypes.map((s) => (<option key={s} value={s}>{s === "disponivel" ? "Disponível" : s === "reservado" ? "Reservada" : "Vendida"}</option>))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Ordenar</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all">
                <option value="andar">Andar</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="w-full h-9 px-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-500">
                  <span className="font-bold text-gray-900">{filteredUnits.length}</span> resultado{filteredUnits.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Legend />

        {sortBy === "andar" ? (
          <div className="space-y-6">
            {activeFloors.map((floor) => {
              const floorUnits = filteredUnits.filter((u) => u.andar === floor).sort((a, b) => {
                if (a.bloco !== b.bloco) return a.bloco.localeCompare(b.bloco);
                return a.unidade - b.unidade;
              });
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
        ) : (
          <motion.div key={sortBy} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <DollarSign className="w-4 h-4" />
              Ordenado por {sortBy === "price-asc" ? "menor preço" : "maior preço"}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {filteredUnits.map((unit) => (
                <UnitCard key={`${unit.bloco}-${unit.unidade}`} unit={unit} onSelect={handleSelectUnit} isBackground={false} isAdmin={isAdmin} onStatusChange={handleLocalStatusChange} />
              ))}
            </div>
          </motion.div>
        )}

        {filteredUnits.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-500 mb-1">Nenhuma unidade encontrada</h3>
            <p className="text-sm text-gray-400 text-center max-w-sm">Tente ajustar os filtros para visualizar mais unidades disponíveis.</p>
          </motion.div>
        )}
      </main>

      <footer className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-4 mt-auto">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Espelho de Vendas • Residencial Vitta</span>
          <span>{units.length} unidades • {units.filter((u) => u.status === "disponivel").length} disponíve{units.filter((u) => u.status === "disponivel").length !== 1 ? "is" : "l"}</span>
        </div>
      </footer>

      <AnimatePresence>
        {selectedUnit && <ExpandedCard unit={selectedUnit} onClose={handleCloseExpanded} />}
      </AnimatePresence>
    </div>
  );
}