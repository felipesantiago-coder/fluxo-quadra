"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Maximize2,
  Car,
  DollarSign,
  ChevronUp,
  Filter,
  X,
  Check,
  LogOut,
  Sun,
  BedDouble,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

// ─── Interfaces ───
interface ProjetoUnit {
  id: string;
  empreendimento_id: string;
  andar: number | null;
  unidade: string;
  vagas: number | null;
  area: number | null;
  area_str: string;
  quartos: number | null;
  valor_venda: number | null;
  status: string;
  posicao_solar: string;
  tipologia: string;
  bloco: string;
  is_cobertura: boolean;
  is_garden: boolean;
  ordem: number;
}

interface DynamicDashboardProps {
  empreendimentoId: string;
  empreendimentoNome: string;
  isAdmin: boolean;
  hideHeader?: boolean;
}

// ─── Color palette ───
const colorPalette = [
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", gradient: "from-emerald-500 to-emerald-600", accent: "bg-emerald-500" },
  { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", gradient: "from-sky-500 to-sky-600", accent: "bg-sky-500" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", gradient: "from-amber-500 to-amber-600", accent: "bg-amber-500" },
  { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", gradient: "from-violet-500 to-violet-600", accent: "bg-violet-500" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", gradient: "from-rose-500 to-rose-600", accent: "bg-rose-500" },
  { bg: "bg-lime-50", border: "border-lime-200", text: "text-lime-700", gradient: "from-lime-500 to-lime-600", accent: "bg-lime-500" },
  { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", gradient: "from-teal-500 to-teal-600", accent: "bg-teal-500" },
  { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", gradient: "from-cyan-500 to-cyan-600", accent: "bg-cyan-500" },
  { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", gradient: "from-orange-500 to-orange-600", accent: "bg-orange-500" },
  { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700", gradient: "from-pink-500 to-pink-600", accent: "bg-pink-500" },
];

type ColorSet = (typeof colorPalette)[number];

// ─── Color mapping with Map cache ───
const tipologiaColorCache = new Map<string, ColorSet>();

function getTipologiaColor(tip: string): ColorSet {
  if (tipologiaColorCache.has(tip)) {
    return tipologiaColorCache.get(tip)!;
  }
  const hash = tip
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % colorPalette.length;
  const color = colorPalette[index];
  tipologiaColorCache.set(tip, color);
  return color;
}

// ─── Status config ───
type UnitStatus = "disponivel" | "reservado" | "vendido";

const statusLabels: Record<UnitStatus, { label: string; color: string; dotColor: string }> = {
  disponivel: { label: "Disponível", color: "bg-emerald-100 text-emerald-800 border-emerald-200", dotColor: "bg-emerald-500" },
  reservado: { label: "Reservada", color: "bg-amber-100 text-amber-800 border-amber-200", dotColor: "bg-amber-500" },
  vendido: { label: "Vendida", color: "bg-red-100 text-red-800 border-red-200", dotColor: "bg-red-500" },
};

const allStatuses: { value: UnitStatus; label: string; dotColor: string }[] = [
  { value: "disponivel", label: "Disponível", dotColor: "bg-emerald-500" },
  { value: "reservado", label: "Reservada", dotColor: "bg-amber-500" },
  { value: "vendido", label: "Vendida", dotColor: "bg-red-500" },
];

const statusOptions: UnitStatus[] = ["disponivel", "reservado", "vendido"];

// ─── Helpers ───
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatArea(value: number | null): string {
  if (!value) return "—";
  return `${value}m²`;
}

function getStatusColor(status: string): { label: string; color: string; dotColor: string } {
  const validStatus = statusLabels[status as UnitStatus];
  if (validStatus) return validStatus;
  return { label: status, color: "bg-gray-100 text-gray-800 border-gray-200", dotColor: "bg-gray-500" };
}

function pricePerSqm(valor: number | null, area: number | null): string | null {
  if (!valor || !area) return null;
  return (
    (Number(valor) / Number(area)).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

// ─── Unit Card ───
function UnitCard({
  unit,
  onSelect,
  isBackground,
  isAdmin,
  onStatusChange,
  empreendimentoId,
}: {
  unit: ProjetoUnit;
  onSelect: (unit: ProjetoUnit) => void;
  isBackground: boolean;
  isAdmin: boolean;
  onStatusChange: (unidade: string, newStatus: UnitStatus) => void;
  empreendimentoId: string;
}) {
  const colors = getTipologiaColor(unit.tipologia || "Padrão");
  const status = getStatusColor(unit.status);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    if (!showStatusMenu) return;
    const handleClickOutside = () => setShowStatusMenu(false);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showStatusMenu]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdmin) setShowStatusMenu(!showStatusMenu);
  };

  const handleStatusSelect = async (e: React.MouseEvent, newStatus: UnitStatus) => {
    e.stopPropagation();
    setShowStatusMenu(false);
    if (!onStatusChange || newStatus === unit.status) return;

    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/admin-sistema/empreendimentos/${empreendimentoId}/units`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unidade: unit.unidade, status: newStatus }),
        }
      );
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

  const displayArea = unit.area_str || formatArea(unit.area);
  const sqm = pricePerSqm(unit.valor_venda, unit.area);

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
        {/* Header: Unit identifier + Status */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <span className="text-xl font-bold tracking-tight text-gray-900 block truncate">
              {unit.unidade}
            </span>
            {unit.bloco && (
              <span className="text-[11px] text-gray-400 font-medium">
                Bloco {unit.bloco}
              </span>
            )}
          </div>
          <div className="relative flex-shrink-0 ml-2">
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
              {isAdmin && !showStatusMenu && (
                <span className="ml-0.5 opacity-50">▾</span>
              )}
            </button>

            {/* Status dropdown */}
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
                  <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-1.5">
                    Alterar status
                  </p>
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
                      {s.value === unit.status && (
                        <Check className="w-3 h-3 ml-auto" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Feedback visual */}
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
              {feedback === "success"
                ? "Status atualizado!"
                : "Erro ao atualizar."}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tipologia badge */}
        {unit.tipologia && (
          <div>
            <span
              className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md ${colors.bg} ${colors.text} ${colors.border} border`}
            >
              {unit.tipologia}
            </span>
          </div>
        )}

        {/* Info items */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">{displayArea}</span>
          </div>
          {unit.vagas !== null && unit.vagas !== undefined && (
            <div className="flex items-center gap-1.5 text-gray-500">
              <Car className="w-3.5 h-3.5" />
              <span className="text-sm font-medium">
                {unit.vagas} vag{unit.vagas === 1 ? "a" : "as"}
              </span>
            </div>
          )}
          {unit.quartos !== null && unit.quartos !== undefined && (
            <div className="flex items-center gap-1.5 text-gray-500">
              <BedDouble className="w-3.5 h-3.5" />
              <span className="text-sm font-medium">
                {unit.quartos} qts
              </span>
            </div>
          )}
          {unit.posicao_solar && (
            <div className="flex items-center gap-1.5 text-gray-500">
              <Sun className="w-3.5 h-3.5" />
              <span className="text-sm font-medium">{unit.posicao_solar}</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="pt-1">
          <p
            className={`text-lg font-bold ${
              unit.valor_venda ? "text-gray-900" : "text-gray-400 italic"
            }`}
          >
            {unit.valor_venda ? formatCurrency(Number(unit.valor_venda)) : "Consulte o valor"}
          </p>
          {sqm && (
            <p className="text-[11px] text-gray-400 mt-0.5">
              R$ {sqm}/m²
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Expanded Centered Card Modal ───
function ExpandedCard({
  unit,
  onClose,
  empreendimentoNome,
}: {
  unit: ProjetoUnit;
  onClose: () => void;
  empreendimentoNome: string;
}) {
  const colors = getTipologiaColor(unit.tipologia || "Padrão");
  const status = getStatusColor(unit.status);
  const displayArea = unit.area_str || formatArea(unit.area);
  const sqm = pricePerSqm(unit.valor_venda, unit.area);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-8"
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
            <div
              className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}
            >
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                Unidade {unit.unidade}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {unit.andar !== null
                  ? `${unit.andar}º Andar`
                  : "Sem andar definido"}
                {unit.bloco ? ` — Bloco ${unit.bloco}` : ""}
                {" — "}
                {empreendimentoNome}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${status.color}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                  {status.label}
                </span>
                {unit.tipologia && (
                  <span
                    className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md border ${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    {unit.tipologia}
                  </span>
                )}
                {unit.is_cobertura && (
                  <Badge
                    variant="outline"
                    className="text-[11px] font-semibold border-amber-300 bg-amber-50 text-amber-700"
                  >
                    Cobertura
                  </Badge>
                )}
                {unit.is_garden && (
                  <Badge
                    variant="outline"
                    className="text-[11px] font-semibold border-emerald-300 bg-emerald-50 text-emerald-700"
                  >
                    Garden
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-100" />

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {unit.quartos !== null && unit.quartos !== undefined && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <BedDouble className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {unit.quartos} quarto{unit.quartos > 1 ? "s" : ""}
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium">
                    Dormitórios
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                <Maximize2 className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{displayArea}</p>
                <p className="text-[11px] text-gray-400 font-medium">
                  Área Privativa
                </p>
              </div>
            </div>
            {unit.vagas !== null && unit.vagas !== undefined && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <Car className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {unit.vagas} vaga{unit.vagas > 1 ? "s" : ""}
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium">Garagem</p>
                </div>
              </div>
            )}
            {unit.posicao_solar && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <Sun className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {unit.posicao_solar}
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium">
                    Posição Solar
                  </p>
                </div>
              </div>
            )}
            {unit.andar !== null && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {unit.andar}º andar
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium">Pavimento</p>
                </div>
              </div>
            )}
            {unit.bloco && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    Bloco {unit.bloco}
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium">Bloco</p>
                </div>
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="border-t border-gray-100" />

          {/* Price */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Valor de Venda
              </span>
            </div>
            {unit.valor_venda ? (
              <div className="space-y-2">
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(Number(unit.valor_venda))}
                </p>
                {sqm && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs border-gray-200">
                      R$ {sqm}/m²
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-lg font-semibold text-gray-400">
                  Consulte o valor
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Entre em contato para saber o valor desta unidade
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Floor Section (collapsible) ───
function FloorSection({
  floor,
  floorLabel,
  floorUnits,
  selectedUnit,
  onSelectUnit,
  isCollapsed,
  onToggle,
  isAdmin,
  onStatusChange,
  empreendimentoId,
}: {
  floor: number;
  floorLabel: string;
  floorUnits: ProjetoUnit[];
  selectedUnit: ProjetoUnit | null;
  onSelectUnit: (unit: ProjetoUnit) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  isAdmin: boolean;
  onStatusChange: (unidade: string, newStatus: UnitStatus) => void;
  empreendimentoId: string;
}) {
  const tipologiasInFloor = [...new Set(floorUnits.map((u) => u.tipologia).filter(Boolean))];
  const totalInFloor = floorUnits.length;
  const disponiveis = floorUnits.filter(
    (u) => u.status === "disponivel"
  ).length;

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
            <h3 className="text-lg font-bold">{floorLabel}</h3>
            <p className="text-sm text-white/60">
              {totalInFloor} unidade{totalInFloor !== 1 ? "s" : ""} •{" "}
              {disponiveis} disponíve
              {disponiveis !== 1 ? "is" : "l"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
            {tipologiasInFloor.map((tipo) => {
              const count = floorUnits.filter((u) => u.tipologia === tipo).length;
              return (
                <Badge
                  key={tipo}
                  variant="secondary"
                  className="text-[10px] font-semibold bg-white/15 text-white/80 border-white/20"
                >
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
                  key={unit.id}
                  unit={unit}
                  onSelect={onSelectUnit}
                  isBackground={
                    selectedUnit !== null && selectedUnit.id !== unit.id
                  }
                  isAdmin={isAdmin}
                  onStatusChange={onStatusChange}
                  empreendimentoId={empreendimentoId}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Tipologia Legend ───
function TipologiaLegend({
  tipologias,
}: {
  tipologias: string[];
}) {
  if (tipologias.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-white/80 shadow-sm border border-gray-100">
      <span className="text-xs font-semibold text-gray-500 mr-1">
        Tipologias:
      </span>
      {tipologias.map((tipo) => {
        const colors = getTipologiaColor(tipo);
        return (
          <Badge
            key={tipo}
            variant="outline"
            className={`text-[11px] font-semibold ${colors.bg} ${colors.text} ${colors.border}`}
          >
            <span className={`w-2 h-2 rounded-full ${colors.accent} mr-1`} />
            {tipo}
          </Badge>
        );
      })}
    </div>
  );
}

// ─── Loading Skeleton ───
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filter skeleton */}
      <div className="p-4 rounded-xl bg-white shadow-md border border-gray-100 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 bg-gray-200 rounded" />
          <div className="w-16 h-3 bg-gray-200 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="w-20 h-2 bg-gray-200 rounded mb-2" />
              <div className="w-full h-9 bg-gray-100 rounded-lg border border-gray-200" />
            </div>
          ))}
        </div>
      </div>
      {/* Card skeletons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border-2 border-gray-100 bg-white shadow-md animate-pulse"
          >
            <div className="h-1.5 bg-gray-200" />
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-16 h-5 bg-gray-200 rounded" />
                <div className="w-16 h-5 bg-gray-200 rounded-full" />
              </div>
              <div className="w-14 h-4 bg-gray-200 rounded" />
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 bg-gray-200 rounded" />
                  <div className="w-10 h-3.5 bg-gray-200 rounded" />
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 bg-gray-200 rounded" />
                  <div className="w-10 h-3.5 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="pt-1">
                <div className="w-24 h-5 bg-gray-200 rounded" />
                <div className="w-16 h-3 bg-gray-200 rounded mt-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dynamic Dashboard ───
export default function DynamicDashboard({
  empreendimentoId,
  empreendimentoNome,
  isAdmin,
  hideHeader = false,
}: DynamicDashboardProps) {
  const router = useRouter();
  const [units, setUnits] = useState<ProjetoUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<ProjetoUnit | null>(null);
  const [collapsedFloors, setCollapsedFloors] = useState<Set<number>>(
    new Set()
  );
  const [filterTipologia, setFilterTipologia] = useState<string>("all");
  const [filterSolar, setFilterSolar] = useState<string>("all");
  const [filterBloco, setFilterBloco] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<UnitStatus | "all">("all");
  const [filterAndar, setFilterAndar] = useState<number | "all">("all");
  const [sortBy, setSortBy] = useState<
    "andar" | "price-asc" | "price-desc"
  >("andar");

  // ─── Detect available filter values from data ───
  const availableTipologias = useMemo(() => {
    const set = new Set(units.map((u) => u.tipologia).filter(Boolean));
    return [...set].sort();
  }, [units]);

  const availableSolarPosicoes = useMemo(() => {
    const set = new Set(
      units.map((u) => u.posicao_solar).filter(Boolean)
    );
    return [...set].sort();
  }, [units]);

  const availableBlocos = useMemo(() => {
    const set = new Set(units.map((u) => u.bloco).filter(Boolean));
    return [...set].sort();
  }, [units]);

  const availableAndares = useMemo(() => {
    const set = new Set(
      units.map((u) => u.andar).filter((a): a is number => a !== null)
    );
    return [...set].sort((a, b) => a - b);
  }, [units]);

  // ─── Auto-detect which filters to show ───
  const showTipologiaFilter = availableTipologias.length > 1;
  const showSolarFilter = availableSolarPosicoes.length > 1;
  const showBlocoFilter = availableBlocos.length > 1;
  const showAndarFilter = availableAndares.length > 1;

  // ─── Filter & sort ───
  const filteredUnits = useMemo(() => {
    let result = [...units];
    if (filterTipologia !== "all")
      result = result.filter((u) => u.tipologia === filterTipologia);
    if (filterSolar !== "all")
      result = result.filter((u) => u.posicao_solar === filterSolar);
    if (filterBloco !== "all")
      result = result.filter((u) => u.bloco === filterBloco);
    if (filterStatus !== "all")
      result = result.filter((u) => u.status === filterStatus);
    if (filterAndar !== "all")
      result = result.filter((u) => u.andar === filterAndar);

    // Default sort by ordem within groups
    result.sort((a, b) => a.ordem - b.ordem);

    if (sortBy === "price-asc")
      result.sort(
        (a, b) =>
          (Number(a.valor_venda) || Infinity) -
          (Number(b.valor_venda) || Infinity)
      );
    if (sortBy === "price-desc")
      result.sort(
        (a, b) =>
          (Number(b.valor_venda) || 0) - (Number(a.valor_venda) || 0)
      );
    return result;
  }, [
    units,
    filterTipologia,
    filterSolar,
    filterBloco,
    filterStatus,
    filterAndar,
    sortBy,
  ]);

  // ─── Active floors for floor-based sorting ───
  const activeFloors = useMemo(() => {
    const floorSet = new Set(
      filteredUnits
        .map((u) => u.andar)
        .filter((a): a is number => a !== null)
    );
    return availableAndares.filter((f) => floorSet.has(f));
  }, [filteredUnits, availableAndares]);

  // ─── Summary stats ───
  const summaryStats = useMemo(() => {
    const total = units.length;
    const disponiveis = units.filter((u) => u.status === "disponivel").length;
    const reservados = units.filter((u) => u.status === "reservado").length;
    const vendidos = units.filter((u) => u.status === "vendido").length;
    return { total, disponiveis, reservados, vendidos };
  }, [units]);

  // ─── Fetch units + realtime ───
  useEffect(() => {
    let supabaseChannel: ReturnType<
      ReturnType<typeof createClient>["channel"]
    > | null = null;

    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/admin-sistema/empreendimentos/${empreendimentoId}/units`
        );
        if (!res.ok) {
          console.error("Erro ao buscar unidades:", res.statusText);
          return;
        }
        const data = await res.json();
        const mapped: ProjetoUnit[] = (Array.isArray(data) ? data : []).map(
          (row: Record<string, unknown>) => ({
            id: row.id as string,
            empreendimento_id: (row.empreendimento_id as string) || empreendimentoId,
            andar: (row.andar as number) ?? null,
            unidade: String(row.unidade ?? ""),
            vagas: (row.vagas as number) ?? null,
            area: (row.area as number) ?? null,
            area_str: (row.area_str as string) || "",
            quartos: (row.quartos as number) ?? null,
            valor_venda: row.valor_venda as number | null,
            status: (row.status as string) || "disponivel",
            posicao_solar: (row.posicao_solar as string) || "",
            tipologia: (row.tipologia as string) || "",
            bloco: (row.bloco as string) || "",
            is_cobertura: (row.is_cobertura as boolean) || false,
            is_garden: (row.is_garden as boolean) || false,
            ordem: (row.ordem as number) ?? 0,
          })
        );

        setUnits(mapped);

        // Realtime subscription
        const supabase = createClient();
        supabaseChannel = supabase
          .channel(`projeto-${empreendimentoId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "projeto_units",
              filter: `empreendimento_id=eq.${empreendimentoId}`,
            },
            (payload) => {
              const updated = payload.new as Record<string, unknown>;
              setUnits((prev) =>
                prev.map((u) => {
                  if (u.id !== updated.id) return u;
                  return {
                    ...u,
                    status: (updated.status as string) ?? u.status,
                    valor_venda: (updated.valor_venda as number | null) ?? u.valor_venda,
                    andar: (updated.andar as number) ?? u.andar,
                    unidade: String(updated.unidade ?? u.unidade),
                    vagas: (updated.vagas as number) ?? u.vagas,
                    area: (updated.area as number) ?? u.area,
                    area_str: (updated.area_str as string) || u.area_str,
                    quartos: (updated.quartos as number) ?? u.quartos,
                    posicao_solar: (updated.posicao_solar as string) || u.posicao_solar,
                    tipologia: (updated.tipologia as string) || u.tipologia,
                    bloco: (updated.bloco as string) || u.bloco,
                    is_cobertura: (updated.is_cobertura as boolean) || u.is_cobertura,
                    is_garden: (updated.is_garden as boolean) || u.is_garden,
                  };
                })
              );
            }
          )
          .subscribe();
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    return () => {
      if (supabaseChannel) {
        createClient().removeChannel(supabaseChannel);
      }
    };
  }, [empreendimentoId]);

  // ─── Handlers ───
  const handleSelectUnit = useCallback((unit: ProjetoUnit) => {
    setSelectedUnit(unit);
  }, []);

  const handleLocalStatusChange = useCallback(
    (unidade: string, newStatus: UnitStatus) => {
      setUnits((prev) =>
        prev.map((u) =>
          u.unidade === unidade ? { ...u, status: newStatus } : u
        )
      );
      setSelectedUnit((prev) =>
        prev && prev.unidade === unidade
          ? { ...prev, status: newStatus }
          : prev
      );
    },
    []
  );

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

  const handleLogout = useCallback(async () => {
    await createClient().auth.signOut();
    window.location.href = "/";
  }, []);

  const hasActiveFilters =
    filterTipologia !== "all" ||
    filterSolar !== "all" ||
    filterBloco !== "all" ||
    filterStatus !== "all" ||
    filterAndar !== "all" ||
    sortBy !== "andar";

  const clearAllFilters = useCallback(() => {
    setFilterTipologia("all");
    setFilterSolar("all");
    setFilterBloco("all");
    setFilterStatus("all");
    setFilterAndar("all");
    setSortBy("andar");
  }, []);

  // ─── Loading state with skeleton ───
  if (loading) {
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
                      Espelho de{" "}
                      <span className="text-gray-400 font-normal">Vendas</span>
                    </h1>
                    <p className="text-[11px] text-gray-400 font-medium">
                      {empreendimentoNome}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>
        )}
        <main className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-6 flex-1">
          <LoadingSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex flex-col">
      {/* Header */}
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
                    Espelho de{" "}
                    <span className="text-gray-400 font-normal">Vendas</span>
                  </h1>
                  <p className="text-[11px] text-gray-400 font-medium">
                    {empreendimentoNome}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-400 font-medium px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Atualização em tempo real
                </div>
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
      )}

      <main className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-6 space-y-6 flex-1">
        {/* Filters */}
        <div className="p-4 rounded-xl bg-white shadow-md border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Filtros
            </span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-xs text-gray-400 hover:text-gray-600"
                onClick={clearAllFilters}
              >
                <X className="w-3 h-3 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Tipologia filter (auto-detected) */}
            {showTipologiaFilter && (
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                  Tipologia
                </label>
                <select
                  value={filterTipologia}
                  onChange={(e) => setFilterTipologia(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                >
                  <option value="all">Todas</option>
                  {availableTipologias.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Posição Solar filter (auto-detected) */}
            {showSolarFilter && (
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                  Posição Solar
                </label>
                <select
                  value={filterSolar}
                  onChange={(e) => setFilterSolar(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                >
                  <option value="all">Todas</option>
                  {availableSolarPosicoes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Bloco filter (auto-detected) */}
            {showBlocoFilter && (
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                  Bloco
                </label>
                <select
                  value={filterBloco}
                  onChange={(e) => setFilterBloco(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                >
                  <option value="all">Todos</option>
                  {availableBlocos.map((b) => (
                    <option key={b} value={b}>
                      Bloco {b}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Andar filter (auto-detected) */}
            {showAndarFilter && (
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                  Andar
                </label>
                <select
                  value={filterAndar}
                  onChange={(e) =>
                    setFilterAndar(
                      e.target.value === "all" ? "all" : Number(e.target.value)
                    )
                  }
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                >
                  <option value="all">Todos</option>
                  {availableAndares.map((a) => (
                    <option key={a} value={a}>
                      {a}º andar
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status filter (always shown) */}
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as UnitStatus | "all")
                }
                className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
              >
                <option value="all">Todos</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Ordenar (always shown) */}
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                Ordenar
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
              >
                <option value="andar">Andar</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tipologia Legend */}
        <TipologiaLegend tipologias={availableTipologias} />

        {/* Units display — floor sections when sorted by andar, flat grid for price */}
        {sortBy === "andar" ? (
          <div className="space-y-6">
            {activeFloors.map((floor) => {
              const floorUnits = filteredUnits.filter((u) => u.andar === floor);
              const hasCobertura = floorUnits.some((u) => u.is_cobertura);
              const hasGarden = floorUnits.some((u) => u.is_garden);
              const floorLabel =
                floor === 0
                  ? hasGarden
                    ? "Térreo — Garden"
                    : "Térreo"
                  : hasCobertura
                    ? `${floor}º Andar — Cobertura`
                    : hasGarden
                      ? `${floor}º Andar — Garden`
                      : `${floor}º Andar`;

              return (
                <FloorSection
                  key={floor}
                  floor={floor}
                  floorLabel={floorLabel}
                  floorUnits={floorUnits}
                  selectedUnit={selectedUnit}
                  onSelectUnit={handleSelectUnit}
                  isCollapsed={collapsedFloors.has(floor)}
                  onToggle={() => toggleFloor(floor)}
                  isAdmin={isAdmin}
                  onStatusChange={handleLocalStatusChange}
                  empreendimentoId={empreendimentoId}
                />
              );
            })}
          </div>
        ) : (
          <motion.div
            key={sortBy}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <DollarSign className="w-4 h-4" />
              Ordenado por{" "}
              {sortBy === "price-asc" ? "menor preço" : "maior preço"}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {filteredUnits.map((unit) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  onSelect={handleSelectUnit}
                  isBackground={false}
                  isAdmin={isAdmin}
                  onStatusChange={handleLocalStatusChange}
                  empreendimentoId={empreendimentoId}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {filteredUnits.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-400">
              Nenhuma unidade encontrada
            </h3>
            <p className="text-sm text-gray-300 mt-1">
              Tente ajustar os filtros para ver mais resultados
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={clearAllFilters}
              >
                <X className="w-3.5 h-3.5 mr-1.5" />
                Limpar todos os filtros
              </Button>
            )}
          </motion.div>
        )}
      </main>

      {/* Footer with unit count summary */}
      <footer className="border-t border-gray-200 bg-white/80 backdrop-blur-sm mt-auto">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Building2 className="w-4 h-4" />
              <span className="font-semibold text-gray-600">
                {empreendimentoNome}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-gray-500">
                  {summaryStats.total} total
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-emerald-700">
                  {summaryStats.disponiveis} disponíve
                  {summaryStats.disponiveis !== 1 ? "is" : "l"}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-amber-700">
                  {summaryStats.reservados} reservada
                  {summaryStats.reservados !== 1 ? "s" : ""}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-red-700">
                  {summaryStats.vendidos} vendida
                  {summaryStats.vendidos !== 1 ? "s" : ""}
                </span>
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Expanded centered card overlay */}
      <AnimatePresence>
        {selectedUnit && (
          <ExpandedCard
            unit={selectedUnit}
            onClose={handleCloseExpanded}
            empreendimentoNome={empreendimentoNome}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
