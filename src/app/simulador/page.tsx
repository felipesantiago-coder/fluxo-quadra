"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Calculator,
  Info,
  AlertTriangle,
  FileDown,
  Trash2,
  RotateCcw,
} from "lucide-react";

// ─── Constants ───
const DELIVERY_YEAR = 2027;
const DELIVERY_MONTH = 11; // November (1-indexed for display, internally 10 for Date)
const PAYMENT_LIMIT_YEAR = 2027;
const PAYMENT_LIMIT_MONTH = 10; // October

// ─── Utility Functions ───
function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function parseCurrencyToNumber(formatted: string): number {
  if (!formatted) return 0;
  const cleaned = formatted.replace(/[R$\s.]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

function formatInputAsCurrency(value: string): { formatted: string; numeric: number } {
  const digits = value.replace(/\D/g, "");
  const numeric = parseInt(digits) || 0;
  const formatted = formatBRL(numeric / 100);
  return { formatted, numeric: numeric / 100 };
}

function addMonthsToDate(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function monthsBetween(start: Date, end: Date): number {
  const yearDiff = end.getUTCFullYear() - start.getUTCFullYear();
  const monthDiff = end.getUTCMonth() - start.getUTCMonth();
  return yearDiff * 12 + monthDiff;
}

function formatDateBR(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Types ───
interface InstallmentRow {
  parcela: string;
  data: string;
  valor: string;
}

interface CalculationResult {
  finalPropertyValue: number;
  downPaymentValue: number;
  downPaymentPercent: number;
  monthlyInstallments: number;
  monthlyPaid: number;
  monthlyPaidPercent: number;
  semesterInstallments: number;
  semesterPaid: number;
  semesterPaidPercent: number;
  habiteseAmount: number;
  habitesePercent: number;
  captationPercent: number;
  monthlyRemaining: number;
  semesterRemaining: number;
  habiteseBalance: number;
  sinalRows: InstallmentRow[];
  monthlyRows: InstallmentRow[];
  semesterRows: InstallmentRow[];
  isLowCaptation: boolean;
}

// ─── Simulator Component ───
function SimulatorContent() {
  const searchParams = useSearchParams();
  const initialValor = parseFloat(searchParams.get("valor") || "0");
  const initialUnidade = searchParams.get("unidade") || "";
  const initialArea = searchParams.get("area") || "";
  const initialAndar = searchParams.get("andar") || "";

  // Form state
  const [propertyValueInput, setPropertyValueInput] = useState(initialValor > 0 ? formatBRL(initialValor) : "");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [unitName, setUnitName] = useState(initialUnidade);
  const [downPaymentInput, setDownPaymentInput] = useState("");
  const [downPaymentDate, setDownPaymentDate] = useState(getTodayISO());
  const [downPaymentInstallments, setDownPaymentInstallments] = useState("1");
  const [monthlyValueInput, setMonthlyValueInput] = useState("");
  const [semesterValueInput, setSemesterValueInput] = useState("");
  const [maxMonthly, setMaxMonthly] = useState("48");
  const [maxSemester, setMaxSemester] = useState("6");
  const [activeTab, setActiveTab] = useState<"sinal" | "mensal" | "semestral" | "habitese">("sinal");
  const [showResults, setShowResults] = useState(false);

  const parseVal = (raw: string) => parseCurrencyToNumber(raw);

  const propertyValue = parseVal(propertyValueInput);
  const downPaymentManual = parseVal(downPaymentInput);
  const monthlyVal = parseVal(monthlyValueInput);
  const semesterVal = parseVal(semesterValueInput);

  const discount = parseFloat(discountPercent) || 0;
  const finalPropertyValue = propertyValue * (1 - discount / 100);
  const downPaymentValue = downPaymentManual > 0 ? downPaymentManual : finalPropertyValue * 0.1;

  const result: CalculationResult = useMemo(() => {
    const dpDate = new Date(Date.UTC(
      parseInt(downPaymentDate.split("-")[0]),
      parseInt(downPaymentDate.split("-")[1]) - 1,
      parseInt(downPaymentDate.split("-")[2])
    ));

    const paymentLimit = new Date(Date.UTC(PAYMENT_LIMIT_YEAR, PAYMENT_LIMIT_MONTH - 1, 30));
    const totalMonths = Math.max(0, monthsBetween(dpDate, paymentLimit));

    const maxM = parseInt(maxMonthly);
    const maxS = parseInt(maxSemester);
    const mInstallments = Math.min(totalMonths, maxM);
    const sInstallments = Math.min(Math.floor(totalMonths / 6), maxS);

    const mPaid = monthlyVal * mInstallments;
    const sPaid = semesterVal * sInstallments;

    const totalCaptation = downPaymentValue + mPaid + sPaid;
    const captPct = finalPropertyValue > 0 ? (totalCaptation / finalPropertyValue) * 100 : 0;

    const habitese = finalPropertyValue - totalCaptation;
    const mRemaining = Math.max(0, monthlyVal * maxM - mPaid);
    const sRemaining = Math.max(0, semesterVal * maxS - sPaid);
    const hBalance = Math.max(0, habitese - mRemaining - sRemaining);

    const dpPerInstallment = downPaymentValue / parseInt(downPaymentInstallments);

    const sinalRows: InstallmentRow[] = [];
    for (let i = 1; i <= parseInt(downPaymentInstallments); i++) {
      sinalRows.push({
        parcela: `${i}/${downPaymentInstallments}`,
        data: formatDateBR(addMonthsToDate(dpDate, i - 1)),
        valor: formatBRL(dpPerInstallment),
      });
    }

    const monthlyRows: InstallmentRow[] = [];
    for (let i = 1; i <= mInstallments; i++) {
      monthlyRows.push({
        parcela: `${i}/${maxM}`,
        data: formatDateBR(addMonthsToDate(dpDate, i)),
        valor: formatBRL(monthlyVal),
      });
    }

    const semesterRows: InstallmentRow[] = [];
    for (let i = 1; i <= sInstallments; i++) {
      semesterRows.push({
        parcela: `${i}/${maxS}`,
        data: formatDateBR(addMonthsToDate(dpDate, i * 6)),
        valor: formatBRL(semesterVal),
      });
    }

    return {
      finalPropertyValue,
      downPaymentValue,
      downPaymentPercent: finalPropertyValue > 0 ? (downPaymentValue / finalPropertyValue) * 100 : 0,
      monthlyInstallments: mInstallments,
      monthlyPaid: mPaid,
      monthlyPaidPercent: finalPropertyValue > 0 ? (mPaid / finalPropertyValue) * 100 : 0,
      semesterInstallments: sInstallments,
      semesterPaid: sPaid,
      semesterPaidPercent: finalPropertyValue > 0 ? (sPaid / finalPropertyValue) * 100 : 0,
      habiteseAmount: habitese,
      habitesePercent: finalPropertyValue > 0 ? (habitese / finalPropertyValue) * 100 : 0,
      captationPercent: captPct,
      monthlyRemaining: mRemaining,
      semesterRemaining: sRemaining,
      habiteseBalance: hBalance,
      sinalRows,
      monthlyRows,
      semesterRows,
      isLowCaptation: captPct > 0 && captPct < 25,
    };
  }, [propertyValue, discount, downPaymentValue, downPaymentDate, downPaymentInstallments, monthlyVal, semesterVal, maxMonthly, maxSemester, finalPropertyValue]);

  // Show results when there's meaningful data
  useEffect(() => {
    setShowResults(propertyValue > 0);
  }, [propertyValue]);

  // Auto-calculate
  useEffect(() => {
    if (propertyValue > 0) setShowResults(true);
  }, [result]);

  const handleCurrencyInput = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const { formatted } = formatInputAsCurrency(e.target.value);
    setter(formatted);
  };

  const clearAll = () => {
    setPropertyValueInput(initialValor > 0 ? formatBRL(initialValor) : "");
    setDiscountPercent("0");
    setDownPaymentInput("");
    setMonthlyValueInput("");
    setSemesterValueInput("");
    setDownPaymentInstallments("1");
    setMaxMonthly("48");
    setMaxSemester("6");
    setDownPaymentDate(getTodayISO());
    setShowResults(false);
  };

  // PDF generation
  const generatePDF = useCallback(async () => {
    const { jsPDF } = await import("jspdf");
    const autoTableModule = await import("jspdf-autotable");
    const autoTable = autoTableModule.default || autoTableModule;

    const doc = new jsPDF("p", "mm", "a4") as any;
    autoTable(doc, {
      startY: -9999,
      head: [["", ""]],
      body: [],
    });
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const primaryColor = [26, 58, 95];
    const secondaryColor = [212, 175, 55];
    let yPos = 0;

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Quattre - Torre Istambul", margin, 20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Simulação Comercial - Fluxo de Pagamento", margin, 30);
    const today = new Date().toLocaleDateString("pt-BR");
    doc.setFontSize(10);
    doc.text(`Gerado em: ${today}`, pageWidth - margin - 30, 30, { align: "right" });
    yPos = 50;

    // Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Informações da Proposta", margin, yPos);
    yPos += 10;
    autoTable(doc,{
      startY: yPos,
      head: [["Descrição", "Informação"]],
      body: [
        ["Unidade", unitName || "Não informado"],
        ["Área", initialArea || "—"],
        ["Andar", initialAndar ? `${initialAndar}º Andar` : "—"],
        ["Valor do Imóvel", formatBRL(propertyValue)],
        ["Valor com Desconto", formatBRL(result.finalPropertyValue)],
      ],
      theme: "grid",
      headStyles: { fillColor: primaryColor, textColor: 255 },
      margin: { top: 10, left: margin, right: margin },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 }, 1: { cellWidth: "auto" } },
    });
    yPos = doc.lastAutoTable.finalY + 15;

    // Summary
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo Financeiro", margin, yPos);
    yPos += 10;
    autoTable(doc,{
      startY: yPos,
      head: [["Etapa", "Valor", "%"]],
      body: [
        ["Sinal", formatBRL(result.downPaymentValue), `${result.downPaymentPercent.toFixed(2)}%`],
        ["Mensais (Obra)", formatBRL(result.monthlyPaid), `${result.monthlyPaidPercent.toFixed(2)}%`],
        ["Semestrais (Obra)", formatBRL(result.semesterPaid), `${result.semesterPaidPercent.toFixed(2)}%`],
        ["Habite-se", formatBRL(result.habiteseAmount), `${result.habitesePercent.toFixed(2)}%`],
        ["Total", formatBRL(result.finalPropertyValue), "100%"],
      ],
      theme: "striped",
      headStyles: { fillColor: primaryColor, textColor: 255 },
      margin: { top: 10, left: margin, right: margin },
      foot: [["", "Total Geral:", formatBRL(result.finalPropertyValue)]],
      footStyles: { fillColor: secondaryColor, textColor: 0, fontStyle: "bold" },
    });
    yPos = doc.lastAutoTable.finalY + 15;

    // Sinal schedule
    if (result.sinalRows.length > 0) {
      if (yPos > 230) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Cronograma: Sinal", margin, yPos);
      yPos += 10;
      autoTable(doc,{
        startY: yPos,
        head: [["Parcela", "Data", "Valor"]],
        body: result.sinalRows.map((r) => [r.parcela, r.data, r.valor]),
        theme: "grid",
        headStyles: { fillColor: primaryColor, textColor: 255 },
        margin: { top: 10, left: margin, right: margin },
      });
      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Monthly schedule
    if (result.monthlyRows.length > 0) {
      if (yPos > 220) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Cronograma: Mensais", margin, yPos);
      yPos += 10;
      autoTable(doc,{
        startY: yPos,
        head: [["Parcela", "Data", "Valor"]],
        body: result.monthlyRows.map((r) => [r.parcela, r.data, r.valor]),
        theme: "grid",
        headStyles: { fillColor: primaryColor, textColor: 255 },
        margin: { top: 10, left: margin, right: margin },
        pageBreak: "auto",
      });
      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Semester schedule
    if (result.semesterRows.length > 0) {
      if (yPos > 220) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Cronograma: Semestrais", margin, yPos);
      yPos += 10;
      autoTable(doc,{
        startY: yPos,
        head: [["Parcela", "Data", "Valor"]],
        body: result.semesterRows.map((r) => [r.parcela, r.data, r.valor]),
        theme: "grid",
        headStyles: { fillColor: primaryColor, textColor: 255 },
        margin: { top: 10, left: margin, right: margin },
      });
      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Habite-se
    if (yPos > 200) { doc.addPage(); yPos = 20; }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Detalhes do Habite-se", margin, yPos);
    yPos += 10;
    autoTable(doc,{
      startY: yPos,
      head: [["Descrição", "Valor"]],
      body: [
        ["Saldo Mensais Restantes", formatBRL(result.monthlyRemaining)],
        ["Saldo Semestrais Restantes", formatBRL(result.semesterRemaining)],
        ["Saldo Final do Imóvel", formatBRL(result.habiteseBalance)],
        ["Total para Quitação", formatBRL(result.habiteseAmount)],
      ],
      theme: "striped",
      headStyles: { fillColor: secondaryColor, textColor: 0 },
      margin: { top: 10, left: margin, right: margin },
    });
    yPos = doc.lastAutoTable.finalY + 15;

    // Notes
    if (yPos > 210) { doc.addPage(); yPos = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Observações Importantes", margin, yPos);
    yPos += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const notes = [
      "As parcelas não pagas durante as obras serão incluídas ao saldo devedor para o habite-se.",
      "O saldo devedor deverá ser quitado até o habite-se ou financiado com o banco de preferência após emissão do habite-se.",
      "Importante: Os saldos devedores de todas as parcelas serão corrigidos mensalmente pelo INCC (Índice Nacional de Custo da Construção) até o habite-se.",
      "Os valores, condições e disponibilidade apresentados podem sofrer alteração sem aviso prévio.",
    ];
    notes.forEach((note) => {
      const lines = doc.splitTextToSize(note, pageWidth - margin * 2);
      doc.text(lines, margin, yPos);
      yPos += lines.length * 4 + 4;
    });

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${totalPages} - Quattre Torre Istambul`, pageWidth / 2, pageHeight - 10, { align: "center" });
    }

    const fileName = `Proposta_Quattre_${(unitName || "unidade").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  }, [result, unitName, initialArea, initialAndar, propertyValue]);

  // ─── Render ───
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
                  Espelho de <span className="text-gray-400 font-normal">Vendas</span>
                </h1>
                <p className="text-[11px] text-gray-400 font-medium hidden sm:block">Simulador de Fluxo de Pagamento</p>
              </div>
            </div>
            <a
              href="/"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
            >
              ← Voltar ao Espelho de Vendas
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Simulador de Fluxo de Pagamento</h2>
          <p className="text-gray-500 mt-2">Calcule o financiamento do seu apartamento</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-10">
          {["Dados Básicos", "Sinal", "Mensais", "Semestrais", "Resultado"].map((step, i) => (
            <div key={step} className="flex items-center">
              {i > 0 && <div className="w-8 sm:w-16 h-0.5 bg-gray-200 mx-1" />}
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i < 4 ? "bg-emerald-500 text-white" : "bg-gray-900 text-white"}`}>
                  {i < 4 ? "✓" : i + 1}
                </div>
                <span className="text-[10px] sm:text-xs text-gray-500 font-medium text-center hidden sm:block">{step}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ─── Left Column: Form ─── */}
          <div className="space-y-6">
            {/* Form Card */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4">
                <div className="flex items-center gap-2 text-white">
                  <Calculator className="w-5 h-5" />
                  <h3 className="font-semibold">Informações do Imóvel</h3>
                </div>
              </div>
              <div className="p-6 space-y-5">
                {/* Auto calc indicator */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm">
                  <RotateCcw className="w-4 h-4" />
                  <span className="font-medium">Cálculo automático em tempo real</span>
                </div>

                {/* Delivery info */}
                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border-l-4 border-gray-900 text-gray-700 text-sm">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Entrega Prevista:</strong> Novembro de {DELIVERY_YEAR}</span>
                </div>

                {/* Property Value */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Valor do Imóvel (R$)
                  </label>
                  <input
                    type="text"
                    value={propertyValueInput}
                    onChange={handleCurrencyInput(setPropertyValueInput)}
                    placeholder="Ex: R$ 500.000,00"
                    className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                  />
                </div>

                {/* Discount */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Percentual de Desconto (%)
                  </label>
                  <input
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="Ex: 5"
                    className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Unidade Escolhida
                  </label>
                  <input
                    type="text"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    placeholder="Ex: Apartamento 1201"
                    className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                  />
                </div>

                {/* Down Payment Value */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Valor do Sinal (R$)
                  </label>
                  <input
                    type="text"
                    value={downPaymentInput}
                    onChange={handleCurrencyInput(setDownPaymentInput)}
                    placeholder="Deixe em branco para 10% do valor final"
                    className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Padrão: 10% do valor final do imóvel</p>
                </div>

                {/* Down Payment Date */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Data do Primeiro Pagamento do Sinal
                  </label>
                  <input
                    type="date"
                    value={downPaymentDate}
                    min={getTodayISO()}
                    onChange={(e) => setDownPaymentDate(e.target.value)}
                    className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Não é permitido selecionar datas anteriores</p>
                </div>

                {/* Down Payment Installments */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Número de Parcelas do Sinal (até 2)
                  </label>
                  <select
                    value={downPaymentInstallments}
                    onChange={(e) => setDownPaymentInstallments(e.target.value)}
                    className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                  >
                    <option value="1">1 parcela</option>
                    <option value="2">2 parcelas</option>
                  </select>
                </div>

                {/* Monthly Installment Value */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Valor de Cada Parcela Mensal (R$)
                  </label>
                  <input
                    type="text"
                    value={monthlyValueInput}
                    onChange={handleCurrencyInput(setMonthlyValueInput)}
                    placeholder="Ex: R$ 1.500,00"
                    className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                  />
                  {monthlyVal > 0 && (
                    <div className="mt-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-600">
                      <span className="font-medium">Total mensal: {formatBRL(monthlyVal * parseInt(maxMonthly))}</span>
                    </div>
                  )}
                </div>

                {/* Semester Installment Value */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Valor de Cada Parcela Semestral (R$)
                  </label>
                  <input
                    type="text"
                    value={semesterValueInput}
                    onChange={handleCurrencyInput(setSemesterValueInput)}
                    placeholder="Ex: R$ 10.000,00"
                    className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                  />
                  {semesterVal > 0 && (
                    <div className="mt-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-600">
                      <span className="font-medium">Total semestral: {formatBRL(semesterVal * parseInt(maxSemester))}</span>
                    </div>
                  )}
                </div>

                {/* Max Monthly */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Número Máximo de Parcelas Mensais
                  </label>
                  <select
                    value={maxMonthly}
                    onChange={(e) => setMaxMonthly(e.target.value)}
                    className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                  >
                    <option value="48">48 parcelas</option>
                    <option value="36">36 parcelas</option>
                  </select>
                </div>

                {/* Max Semester */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Número Máximo de Parcelas Semestrais
                  </label>
                  <select
                    value={maxSemester}
                    onChange={(e) => setMaxSemester(e.target.value)}
                    className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                  >
                    <option value="6">6 parcelas</option>
                    <option value="4">4 parcelas</option>
                  </select>
                </div>

                {/* Low captation warning */}
                {result.isLowCaptation && showResults && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border-l-4 border-red-500 text-red-700 animate-pulse">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="font-bold text-sm">
                      Captação durante as obras abaixo de 25% não é permitida!
                    </span>
                  </div>
                )}

                {/* Clear button */}
                <button
                  onClick={clearAll}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar Todos os Campos
                </button>
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl shadow-lg p-6 text-white">
              <h4 className="font-semibold text-white/80 text-sm uppercase tracking-wider mb-4">Resumo do Financiamento</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/60 text-xs mb-1">Valor do Imóvel</p>
                  <p className="text-xl font-bold">{formatBRL(propertyValue)}</p>
                </div>
                <div>
                  <p className="text-white/60 text-xs mb-1">Valor com Desconto</p>
                  <p className="text-xl font-bold">{formatBRL(result.finalPropertyValue)}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full h-3 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      result.captationPercent >= 50 ? "bg-emerald-400" : result.isLowCaptation ? "bg-red-400" : "bg-amber-400"
                    }`}
                    style={{ width: `${Math.min(result.captationPercent, 100)}%` }}
                  />
                </div>
                <p className="text-white/60 text-xs mt-2 text-center">
                  Captação durante obras: <span className="text-white font-bold">{result.captationPercent.toFixed(2)}%</span>
                </p>
              </div>
            </div>
          </div>

          {/* ─── Right Column: Results ─── */}
          <div className="space-y-6">
            {/* Results Table Card */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4">
                <div className="flex items-center gap-2 text-white">
                  <Calculator className="w-5 h-5" />
                  <h3 className="font-semibold">Detalhamento do Fluxo de Pagamento</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-900 text-white">
                        <th className="text-left py-3 px-4 rounded-tl-lg font-semibold text-xs uppercase tracking-wider">Descrição</th>
                        <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider">Valor (R$)</th>
                        <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider">Percentual</th>
                        <th className="text-left py-3 px-4 rounded-tr-lg font-semibold text-xs uppercase tracking-wider">Observação</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-4 font-medium">Sinal</td>
                        <td className="py-3 px-4 text-right font-semibold">{formatBRL(result.downPaymentValue)}</td>
                        <td className="py-3 px-4 text-right text-gray-500">{result.downPaymentPercent.toFixed(2)}%</td>
                        <td className="py-3 px-4 text-gray-400 text-xs">Até 2 parcelas com INCC</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-4 font-medium">Parcelas Mensais</td>
                        <td className="py-3 px-4 text-right font-semibold">{formatBRL(result.monthlyPaid)}</td>
                        <td className="py-3 px-4 text-right text-gray-500">{result.monthlyPaidPercent.toFixed(2)}%</td>
                        <td className="py-3 px-4 text-gray-400 text-xs">{result.monthlyInstallments} de {maxMonthly} parcelas</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-4 font-medium">Parcelas Semestrais</td>
                        <td className="py-3 px-4 text-right font-semibold">{formatBRL(result.semesterPaid)}</td>
                        <td className="py-3 px-4 text-right text-gray-500">{result.semesterPaidPercent.toFixed(2)}%</td>
                        <td className="py-3 px-4 text-gray-400 text-xs">{result.semesterInstallments} de {maxSemester} parcelas</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-4 font-medium">Habite-se</td>
                        <td className="py-3 px-4 text-right font-semibold">{formatBRL(result.habiteseAmount)}</td>
                        <td className="py-3 px-4 text-right text-gray-500">{result.habitesePercent.toFixed(2)}%</td>
                        <td className="py-3 px-4 text-gray-400 text-xs">Saldo mensais + semestrais + final</td>
                      </tr>
                      <tr className="bg-emerald-50">
                        <td className="py-3 px-4 font-bold text-emerald-900">Valor Total</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-900">{formatBRL(result.finalPropertyValue)}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700">100%</td>
                        <td className="py-3 px-4"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Info note */}
                <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-gray-600">
                  <strong className="text-gray-800">Observação:</strong> O valor do Habite-se inclui:
                  <ul className="mt-2 space-y-1 list-disc list-inside text-gray-500">
                    <li>Parcelas mensais restantes</li>
                    <li>Parcelas semestrais restantes</li>
                    <li>Saldo final do imóvel</li>
                  </ul>
                </div>

                {/* Schedule Tabs */}
                {showResults && (
                  <div className="mt-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-3">Cronograma de Pagamento</h4>
                    <div className="flex border-b border-gray-200">
                      {(["sinal", "mensal", "semestral", "habitese"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
                            activeTab === tab
                              ? "text-gray-900 border-b-2 border-gray-900"
                              : "text-gray-400 hover:text-gray-600"
                          }`}
                        >
                          {tab === "habitese" ? "Habite-se" : tab === "sinal" ? "Sinal" : tab === "mensal" ? "Mensais" : "Semestrais"}
                        </button>
                      ))}
                    </div>
                    <div className="p-4 border border-t-0 border-gray-200 rounded-b-xl">
                      {activeTab === "sinal" && (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Parcela</th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Data</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Valor (R$)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.sinalRows.length > 0 ? result.sinalRows.map((row, i) => (
                              <tr key={i} className="border-b border-gray-50">
                                <td className="py-2 px-3">{row.parcela}</td>
                                <td className="py-2 px-3">{row.data}</td>
                                <td className="py-2 px-3 text-right font-semibold">{row.valor}</td>
                              </tr>
                            )) : (
                              <tr><td colSpan={3} className="py-4 text-center text-gray-400">Nenhum dado</td></tr>
                            )}
                          </tbody>
                        </table>
                      )}

                      {activeTab === "mensal" && (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Parcela</th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Data</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Valor (R$)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.monthlyRows.length > 0 ? result.monthlyRows.map((row, i) => (
                              <tr key={i} className="border-b border-gray-50">
                                <td className="py-2 px-3">{row.parcela}</td>
                                <td className="py-2 px-3">{row.data}</td>
                                <td className="py-2 px-3 text-right font-semibold">{row.valor}</td>
                              </tr>
                            )) : (
                              <tr><td colSpan={3} className="py-4 text-center text-gray-400">Nenhum dado</td></tr>
                            )}
                          </tbody>
                        </table>
                      )}

                      {activeTab === "semestral" && (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Parcela</th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Data</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Valor (R$)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.semesterRows.length > 0 ? result.semesterRows.map((row, i) => (
                              <tr key={i} className="border-b border-gray-50">
                                <td className="py-2 px-3">{row.parcela}</td>
                                <td className="py-2 px-3">{row.data}</td>
                                <td className="py-2 px-3 text-right font-semibold">{row.valor}</td>
                              </tr>
                            )) : (
                              <tr><td colSpan={3} className="py-4 text-center text-gray-400">Nenhum dado</td></tr>
                            )}
                          </tbody>
                        </table>
                      )}

                      {activeTab === "habitese" && (
                        <div className="space-y-4">
                          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                            <p className="font-bold text-amber-900 text-lg">{formatBRL(result.habiteseAmount)}</p>
                            <p className="text-sm text-amber-700 mt-1">Este valor pode ser quitado ou financiado com instituição financeira de preferência</p>
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900 text-sm mb-3">Composição do Habite-se:</h5>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                                <span className="text-sm text-gray-600">Parcelas mensais restantes</span>
                                <span className="text-sm font-semibold text-gray-900">{formatBRL(result.monthlyRemaining)}</span>
                              </div>
                              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                                <span className="text-sm text-gray-600">Parcelas semestrais restantes</span>
                                <span className="text-sm font-semibold text-gray-900">{formatBRL(result.semesterRemaining)}</span>
                              </div>
                              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                                <span className="text-sm text-gray-600">Saldo final do imóvel</span>
                                <span className="text-sm font-semibold text-gray-900">{formatBRL(result.habiteseBalance)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PDF Button */}
                {showResults && (
                  <button
                    onClick={generatePDF}
                    className="mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors shadow-lg"
                  >
                    <FileDown className="w-4 h-4" />
                    Gerar PDF da Proposta
                  </button>
                )}
              </div>
            </div>

            {/* Important Info Card */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4">
                <div className="flex items-center gap-2 text-white">
                  <Info className="w-5 h-5" />
                  <h3 className="font-semibold">Informações Importantes</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="p-4 rounded-xl bg-gray-50 border-l-4 border-amber-400 text-sm text-gray-600 space-y-2">
                  <ul className="space-y-2">
                    <li>O sinal pode ser dividido em até 2 vezes com correção de INCC</li>
                    <li>As parcelas mensais começam no mês seguinte ao sinal</li>
                    <li>A primeira parcela semestral é 6 meses após o sinal</li>
                    <li>O número de parcelas pagas durante as obras depende da data do sinal e da entrega prevista para novembro de {DELIVERY_YEAR}</li>
                    <li>As parcelas não pagas durante as obras serão incluídas no habite-se</li>
                    <li>O habite-se pode ser quitado ou financiado com o banco de preferência</li>
                    <li><strong>Importante:</strong> Os valores dos saldos devedores de todas as parcelas serão corrigidos mensalmente pelo INCC</li>
                    <li><strong>Captação mínima:</strong> A captação durante as obras deve ser de no mínimo 25% do valor do imóvel</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="font-semibold text-gray-600">Espelho de Vendas</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <span>Simulador de Fluxo de Pagamento</span>
            <span className="hidden sm:inline">•</span>
            <span>&copy; {new Date().getFullYear()} - Todos os direitos reservados</span>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            Este é um simulador de fluxo de pagamento. Valores sujeitos a alteração sem aviso prévio.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function SimuladorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
          <div className="text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-400 font-medium">Carregando simulador...</p>
          </div>
        </div>
      }
    >
      <SimulatorContent />
    </Suspense>
  );
}
