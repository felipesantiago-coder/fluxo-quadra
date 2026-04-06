"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { units, floors, areaTypes, formatCurrency, type Unit } from "@/lib/units-data";
import { Building2, Car, Maximize2, DollarSign, TrendingUp, X, ChevronUp, MapPin, Phone, Filter, Layers, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
  reservado: { label: "Reservado", color: "bg-amber-100 text-amber-800 border-amber-200", dotColor: "bg-amber-500" },
  vendido: { label: "Vendido", color: "bg-red-100 text-red-800 border-red-200", dotColor: "bg-red-500" },
  consultar: { label: "Consultar", color: "bg-gray-100 text-gray-600 border-gray-200", dotColor: "bg-gray-400" },
};

// ─── Unit Card Component ───
function UnitCard({
  unit,
  isSelected,
  onSelect,
  isBackground,
}: {
  unit: Unit;
  isSelected: boolean;
  onSelect: (unit: Unit) => void;
  isBackground: boolean;
}) {
  const colors = typeColors[unit.tipoArea];
  const status = statusLabels[unit.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: isBackground ? 0.3 : 1,
        y: 0,
        scale: isSelected ? 1.05 : 1,
        zIndex: isSelected ? 50 : 1,
      }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        layout: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.3 },
        scale: { type: "spring", stiffness: 400, damping: 25 },
      }}
      whileHover={!isBackground ? { y: -6, scale: 1.02 } : {}}
      onClick={() => onSelect(unit)}
      className={`
        relative cursor-pointer rounded-xl border-2 overflow-hidden
        bg-white shadow-md hover:shadow-xl
        transition-all duration-300 ease-out
        ${isSelected ? "ring-2 ring-offset-2 ring-black dark:ring-white" : ""}
        ${isBackground ? "pointer-events-none grayscale-[30%]" : ""}
      `}
      style={{
        filter: isBackground ? "blur(1px)" : "none",
      }}
    >
      {/* Top colored bar */}
      <div className={`h-1.5 bg-gradient-to-r ${colors.gradient}`} />

      <div className="p-4 space-y-3">
        {/* Header: Unit number + Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-gray-900">
              {unit.unidade}
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${status.color}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
            {status.label}
          </span>
        </div>

        {/* Info items */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">{unit.areaStr}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500">
            <Car className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">{unit.vagas} vag{unit.vagas === 1 ? "a" : "as"}</span>
          </div>
        </div>

        {/* Price */}
        <div className="pt-1">
          <div className="flex items-center gap-1 text-gray-400 mb-0.5">
            <DollarSign className="w-3 h-3" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Valor</span>
          </div>
          <p className={`text-lg font-bold ${unit.valorVenda ? "text-gray-900" : "text-gray-400 italic"}`}>
            {unit.valorFormatado}
          </p>
          {unit.valorVenda && (
            <p className="text-[11px] text-gray-400 mt-0.5">
              R$ {(unit.valorVenda / unit.area).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/m²
            </p>
          )}
        </div>

        {/* Area type badge */}
        <div className="flex justify-end">
          <Badge variant="secondary" className={`text-[10px] font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
            {unit.tipoArea}
          </Badge>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Expanded Detail Panel ───
function DetailPanel({ unit, onClose }: { unit: Unit; onClose: () => void }) {
  const colors = typeColors[unit.tipoArea];
  const status = statusLabels[unit.status];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header gradient */}
        <div className={`h-2 bg-gradient-to-r ${colors.gradient}`} />

        <div className="p-6 space-y-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>

          {/* Unit header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                {unit.unidade}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Unidade {unit.unidade}
                </h2>
                <p className="text-sm text-gray-500">
                  {unit.andar}º Andar — Quattre Istambul
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-xl bg-gray-50">
              <Maximize2 className="w-5 h-5 mx-auto mb-1.5 text-gray-400" />
              <p className="text-xl font-bold text-gray-900">{unit.areaStr}</p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">Área Privativa</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-gray-50">
              <Car className="w-5 h-5 mx-auto mb-1.5 text-gray-400" />
              <p className="text-xl font-bold text-gray-900">{unit.vagas}</p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">Vaga{unit.vagas > 1 ? "s" : ""}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-gray-50">
              <Layers className="w-5 h-5 mx-auto mb-1.5 text-gray-400" />
              <p className="text-xl font-bold text-gray-900">{unit.andar}º</p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">Andar</p>
            </div>
          </div>

          <Separator />

          {/* Price section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Valor de Venda</span>
            </div>
            {unit.valorVenda ? (
              <div className="space-y-2">
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(unit.valorVenda)}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    R$ {(unit.valorVenda / unit.area).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/m²
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${colors.text} ${colors.border}`}>
                    {unit.tipoArea}
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

          <Separator />

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="flex-1 bg-gradient-to-r from-gray-900 to-gray-800 text-white hover:from-gray-800 hover:to-gray-700 shadow-lg">
              <Phone className="w-4 h-4 mr-2" />
              Tenho Interesse
            </Button>
            <Button variant="outline" className="flex-1">
              <Info className="w-4 h-4 mr-2" />
              Mais Detalhes
            </Button>
          </div>
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
}: {
  floor: number;
  floorUnits: Unit[];
  selectedUnit: Unit | null;
  onSelectUnit: (unit: Unit) => void;
  isCollapsed: boolean;
  onToggle: () => void;
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
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {floorUnits.map((unit) => (
                <UnitCard
                  key={unit.unidade}
                  unit={unit}
                  isSelected={selectedUnit?.unidade === unit.unidade}
                  onSelect={onSelectUnit}
                  isBackground={selectedUnit !== null && selectedUnit?.unidade !== unit.unidade}
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
export default function SalesDashboard() {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [collapsedFloors, setCollapsedFloors] = useState<Set<number>>(new Set());
  const [filterArea, setFilterArea] = useState<Unit["tipoArea"] | "all">("all");
  const [filterFloor, setFilterFloor] = useState<number | "all">("all");
  const [filterVagas, setFilterVagas] = useState<number | "all">("all");


  const filteredUnits = useMemo(() => {
    let result = [...units];
    if (filterArea !== "all") result = result.filter((u) => u.tipoArea === filterArea);
    if (filterFloor !== "all") result = result.filter((u) => u.andar === filterFloor);
    if (filterVagas !== "all") result = result.filter((u) => u.vagas === filterVagas);
    return result;
  }, [filterArea, filterFloor, filterVagas]);

  const activeFloors = useMemo(() => {
    const floorSet = new Set(filteredUnits.map((u) => u.andar));
    return floors.filter((f) => floorSet.has(f));
  }, [filteredUnits]);

  const handleSelectUnit = useCallback((unit: Unit) => {
    if (selectedUnit?.unidade === unit.unidade) {
      setSelectedUnit(null);
    } else {
      setSelectedUnit(unit);
    }
  }, [selectedUnit]);

  const handleOpenDetail = useCallback(() => {
    if (selectedUnit) {
      setShowDetail(true);
    }
  }, [selectedUnit]);

  const handleCloseDetail = useCallback(() => {
    setShowDetail(false);
    setTimeout(() => setSelectedUnit(null), 300);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
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
              </div>
            </div>
            <div className="flex items-center gap-2">

            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Filters */}
        <div className="p-4 rounded-xl bg-white shadow-md border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Filtros</span>
            {(filterArea !== "all" || filterFloor !== "all" || filterVagas !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-xs text-gray-400 hover:text-gray-600"
                onClick={() => { setFilterArea("all"); setFilterFloor("all"); setFilterVagas("all"); }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

            {/* Area filter */}
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Área</label>
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value as Unit["tipoArea"] | "all")}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
              >
                <option value="all">Todas</option>
                {areaTypes.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
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

        {/* Selected unit banner */}
        <AnimatePresence>
          {selectedUnit && !showDetail && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-900 text-white shadow-xl">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${typeColors[selectedUnit.tipoArea].gradient} flex items-center justify-center font-bold text-lg shadow-lg`}>
                    {selectedUnit.unidade}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">
                      Unidade {selectedUnit.unidade} — {selectedUnit.andar}º Andar
                    </h3>
                    <p className="text-sm text-white/60">
                      {selectedUnit.areaStr} • {selectedUnit.vagas} vag{selectedUnit.vagas === 1 ? "a" : "as"} • {selectedUnit.valorFormatado}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedUnit(null)}
                    className="text-xs bg-white/10 text-white hover:bg-white/20 border-0"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Fechar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleOpenDetail}
                    className="text-xs bg-white text-gray-900 hover:bg-gray-100 shadow-md"
                  >
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
      <footer className="mt-auto border-t border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Building2 className="w-4 h-4" />
              <span className="font-semibold text-gray-600">Quattre Istambul</span>
              <span>•</span>
              <span>Espelho de Vendas</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>Localização privilegiada</span>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                <span>Contato disponível</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Detail modal */}
      <AnimatePresence>
        {showDetail && selectedUnit && (
          <DetailPanel unit={selectedUnit} onClose={handleCloseDetail} />
        )}
      </AnimatePresence>
    </div>
  );
}
