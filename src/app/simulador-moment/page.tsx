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
  TrendingUp,
} from "lucide-react";

// ─── Constants ───
const DELIVERY_YEAR = 2028;
const DELIVERY_MONTH = 1;
const DECORATION_FEE = 19505.00;

// ─── Utility Functions ───
function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
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

interface InstallmentRow { parcela: string; data: string; valor: string; }

interface CalculationResult {
  finalPropertyValue: number;
  downPaymentValue: number;
  downPaymentPercent: number;
  totalMonths: number;
  maxMonthlyInstallments: number;
  maxSemesterInstallments: number;
  monthlyPaid: number;
  monthlyPaidPercent: number;
  semesterPaid: number;
  semesterPaidPercent: number;
  decorationInstallmentValue: number;
  decorationInstallments: number;
  habiteseAmount: number;
  habitesePercent: number;
  captationPercent: number;
  sinalRows: InstallmentRow[];
  monthlyRows: InstallmentRow[];
  semesterRows: InstallmentRow[];
  decorationRows: InstallmentRow[];
  isLowCaptation: boolean;
  inccMonthlyRate: number;
  inccCorrectionFactor: number;
  inccAccumulatedPercent: number;
  inccMode: string;
  habiteseCorrected: number;
}

type InccMode = "none" | "180m" | "12m" | "projection";

interface InccData {
  avg180: number;
  avg12: number;
  projection: number;
  lastUpdate: string | null;
  totalMonths: number;
  loading: boolean;
  error: string | null;
  isFallback: boolean;
}

function SimulatorContent() {
  const searchParams = useSearchParams();
  const initialValor = parseFloat(searchParams.get("valor") || "0");
  const initialUnidade = searchParams.get("unidade") || "";
  const initialArea = searchParams.get("area") || "";

  const [propertyValueInput, setPropertyValueInput] = useState(initialValor > 0 ? formatBRL(initialValor) : "");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [unitName, setUnitName] = useState(initialUnidade);
  const [downPaymentInput, setDownPaymentInput] = useState("");
  const [downPaymentDate, setDownPaymentDate] = useState(getTodayISO());
  const [monthlyValueInput, setMonthlyValueInput] = useState("");
  const [semesterValueInput, setSemesterValueInput] = useState("");
  const [activeTab, setActiveTab] = useState<"sinal" | "mensal" | "semestral" | "decoracao" | "habitese">("sinal");
  const [showResults, setShowResults] = useState(false);
  const [inccMode, setInccMode] = useState<InccMode>("none");
  const [inccData, setInccData] = useState<InccData>({
    avg180: 0,
    avg12: 0,
    projection: 0,
    lastUpdate: null,
    totalMonths: 0,
    loading: true,
    error: null,
    isFallback: false,
  });

  const parseVal = (raw: string) => parseCurrencyToNumber(raw);
  const propertyValue = parseVal(propertyValueInput);
  const downPaymentManual = parseVal(downPaymentInput);
  const monthlyVal = parseVal(monthlyValueInput);
  const semesterVal = parseVal(semesterValueInput);
  const discount = parseFloat(discountPercent) || 0;
  const finalPropertyValue = propertyValue * (1 - discount / 100);
  const downPaymentValue = downPaymentManual > 0 ? downPaymentManual : finalPropertyValue * 0.1;

  const getInccMonthlyRate = (): number => {
    if (inccMode === "180m") return inccData.avg180;
    if (inccMode === "12m") return inccData.avg12;
    if (inccMode === "projection") return inccData.projection;
    return 0;
  };
  const inccMonthlyRate = inccData.loading ? 0 : getInccMonthlyRate();

  const result: CalculationResult = useMemo(() => {
    const dpDate = new Date(Date.UTC(
      parseInt(downPaymentDate.split("-")[0]),
      parseInt(downPaymentDate.split("-")[1]) - 1,
      parseInt(downPaymentDate.split("-")[2])
    ));
    const deliveryDate = new Date(Date.UTC(DELIVERY_YEAR, DELIVERY_MONTH, 1));
    let totalMonths = monthsBetween(dpDate, deliveryDate) - 1;
    totalMonths = Math.max(0, totalMonths);
    const maxMonthlyInstallments = totalMonths;
    const maxSemesterInstallments = Math.floor(totalMonths / 6);

    // INCC accumulation factor: valor no mês N = base × (1 + INCC)^N
    const inccFactor = (months: number) =>
      inccMonthlyRate > 0 ? Math.pow(1 + inccMonthlyRate / 100, months) : 1;

    // ─── Parcelas mensais (1ª parcela = valor informado, demais corrigidas pelo INCC) ───
    const monthlyRows: InstallmentRow[] = [];
    let monthlyPaid = 0;
    for (let i = 0; i < maxMonthlyInstallments; i++) {
      const val = monthlyVal * inccFactor(i);
      monthlyPaid += val;
      monthlyRows.push({ parcela: `${i + 1}/${maxMonthlyInstallments}`, data: formatDateBR(addMonthsToDate(dpDate, i + 1)), valor: formatBRL(val) });
    }

    // ─── Parcelas semestrais (1ª parcela = valor informado, demais corrigidas pelo INCC) ───
    const semesterRows: InstallmentRow[] = [];
    let semesterPaid = 0;
    for (let i = 0; i < maxSemesterInstallments; i++) {
      const val = semesterVal * inccFactor(6 * i);
      semesterPaid += val;
      semesterRows.push({ parcela: `${i + 1}/${maxSemesterInstallments}`, data: formatDateBR(addMonthsToDate(dpDate, (i + 1) * 6)), valor: formatBRL(val) });
    }

    const totalCaptation = downPaymentValue + monthlyPaid + semesterPaid;
    const captPct = finalPropertyValue > 0 ? (totalCaptation / finalPropertyValue) * 100 : 0;
    const habitese = finalPropertyValue - totalCaptation;
    const DECORATION_INSTALLMENTS = 10;
    const decorationInstallmentValue = DECORATION_FEE / DECORATION_INSTALLMENTS;
    const decorationStartDate = new Date(Date.UTC(DELIVERY_YEAR, DELIVERY_MONTH - DECORATION_INSTALLMENTS, 1));

    const sinalRows: InstallmentRow[] = [{ parcela: "1/1", data: formatDateBR(dpDate), valor: formatBRL(downPaymentValue) }];

    // Decoração (não sofre correção INCC — taxa fixa por projeto)
    const decorationRows: InstallmentRow[] = [];
    for (let i = 0; i < DECORATION_INSTALLMENTS; i++) {
      decorationRows.push({ parcela: `${i + 1}/${DECORATION_INSTALLMENTS}`, data: formatDateBR(addMonthsToDate(decorationStartDate, i)), valor: formatBRL(decorationInstallmentValue) });
    }

    // INCC correction over construction period
    const deliveryDateCalc = new Date(Date.UTC(DELIVERY_YEAR, DELIVERY_MONTH, 1));
    const constructionMonths = Math.max(0, monthsBetween(dpDate, deliveryDateCalc));
    let inccCorrectionFactor = 1;
    if (inccMonthlyRate > 0 && constructionMonths > 0) {
      for (let i = 0; i < constructionMonths; i++) {
        inccCorrectionFactor *= (1 + inccMonthlyRate / 100);
      }
    }
    const inccAccumulatedPercent = (inccCorrectionFactor - 1) * 100;

    return {
      finalPropertyValue, downPaymentValue,
      downPaymentPercent: finalPropertyValue > 0 ? (downPaymentValue / finalPropertyValue) * 100 : 0,
      totalMonths, maxMonthlyInstallments, maxSemesterInstallments,
      monthlyPaid, monthlyPaidPercent: finalPropertyValue > 0 ? (monthlyPaid / finalPropertyValue) * 100 : 0,
      semesterPaid, semesterPaidPercent: finalPropertyValue > 0 ? (semesterPaid / finalPropertyValue) * 100 : 0,
      decorationInstallmentValue, decorationInstallments: DECORATION_INSTALLMENTS,
      habiteseAmount: habitese, habitesePercent: finalPropertyValue > 0 ? (habitese / finalPropertyValue) * 100 : 0,
      captationPercent: captPct,
      sinalRows, monthlyRows, semesterRows, decorationRows,
      isLowCaptation: captPct > 0 && captPct < 30,
      inccMonthlyRate,
      inccCorrectionFactor,
      inccAccumulatedPercent,
      inccMode,
      habiteseCorrected: habitese * inccCorrectionFactor,
    };
  }, [propertyValue, discount, downPaymentValue, downPaymentDate, monthlyVal, semesterVal, finalPropertyValue, inccMonthlyRate, inccMode]);

  useEffect(() => { setShowResults(propertyValue > 0); }, [propertyValue]);
  useEffect(() => { if (propertyValue > 0) setShowResults(true); }, [result]);

  // Fetch INCC data
  useEffect(() => {
    async function fetchIncc() {
      try {
        const res = await fetch("/api/incc");
        const data = await res.json();
        setInccData({
          avg180: data.avg180,
          avg12: data.avg12,
          projection: data.projection,
          lastUpdate: data.lastUpdate,
          totalMonths: data.totalMonths || 0,
          loading: false,
          error: null,
          isFallback: data.fallback || false,
        });
      } catch {
        setInccData((prev) => ({
          ...prev,
          loading: false,
          error: "Erro ao carregar dados do INCC",
          isFallback: true,
          avg180: 0.45,
          avg12: 0.4,
          projection: 0.4,
        }));
      }
    }
    fetchIncc();
  }, []);

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
    setDownPaymentDate(getTodayISO());
    setShowResults(false);
    setInccMode("none");
  };

  const generatePDF = useCallback(async () => {
    const { jsPDF } = await import("jspdf");
    const autoTableModule = await import("jspdf-autotable");
    const autoTable = autoTableModule.default || autoTableModule;
    const doc = new jsPDF("p", "mm", "a4") as any;
    autoTable(doc, { startY: -9999, head: [["", ""]], body: [] });
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
    doc.text("Moment", margin, 20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Simulação de Fluxo de Pagamento", margin, 30);
    const today = new Date().toLocaleDateString("pt-BR");
    doc.setFontSize(10);
    doc.text(`Gerado em: ${today}`, pageWidth - margin - 30, 30, { align: "right" });
    yPos = 50;

    // Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Informações da Simulação", margin, yPos);
    yPos += 10;
    autoTable(doc, {
      startY: yPos,
      head: [["Descrição", "Informação"]],
      body: [
        ["Unidade", unitName || "Não informado"],
        ["Área", initialArea || "—"],
        ["Valor do Imóvel", formatBRL(propertyValue)],
        ["Valor com Desconto", formatBRL(result.finalPropertyValue)],
        ["Entrega Prevista", "Fevereiro de 2028"],
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
    autoTable(doc, {
      startY: yPos,
      head: [["Etapa", "Valor", "%"]],
      body: [
        ["Sinal Ato", formatBRL(result.downPaymentValue), `${result.downPaymentPercent.toFixed(2)}%`],
        ["Mensais (Obra)", formatBRL(result.monthlyPaid), `${result.monthlyPaidPercent.toFixed(2)}%`],
        ["Semestrais (Obra)", formatBRL(result.semesterPaid), `${result.semesterPaidPercent.toFixed(2)}%`],
        ["Habite-se", formatBRL(result.habiteseAmount), `${result.habitesePercent.toFixed(2)}%`],
        ...(inccMode !== "none" && result.inccAccumulatedPercent > 0 ? [
          ["Habite-se (corrigido INCC)", formatBRL(result.habiteseCorrected), `${((result.habiteseCorrected / result.finalPropertyValue) * 100).toFixed(2)}%`],
        ] : []),
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
      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.text("Cronograma: Sinal", margin, yPos); yPos += 10;
      autoTable(doc, { startY: yPos, head: [["Parcela", "Data", "Valor"]], body: result.sinalRows.map((r) => [r.parcela, r.data, r.valor]), theme: "grid", headStyles: { fillColor: primaryColor, textColor: 255 }, margin: { top: 10, left: margin, right: margin } });
      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Monthly schedule
    if (result.monthlyRows.length > 0) {
      if (yPos > 220) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.text("Cronograma: Mensais", margin, yPos); yPos += 10;
      autoTable(doc, { startY: yPos, head: [["Parcela", "Data", "Valor"]], body: result.monthlyRows.map((r) => [r.parcela, r.data, r.valor]), theme: "grid", headStyles: { fillColor: primaryColor, textColor: 255 }, margin: { top: 10, left: margin, right: margin }, pageBreak: "auto" });
      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Semester schedule
    if (result.semesterRows.length > 0) {
      if (yPos > 220) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.text("Cronograma: Semestrais", margin, yPos); yPos += 10;
      autoTable(doc, { startY: yPos, head: [["Parcela", "Data", "Valor"]], body: result.semesterRows.map((r) => [r.parcela, r.data, r.valor]), theme: "grid", headStyles: { fillColor: primaryColor, textColor: 255 }, margin: { top: 10, left: margin, right: margin } });
      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Decoration schedule
    if (result.decorationRows.length > 0) {
      if (yPos > 220) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.text("Cronograma: Decoração", margin, yPos); yPos += 10;
      autoTable(doc, { startY: yPos, head: [["Parcela", "Data", "Valor"]], body: result.decorationRows.map((r) => [r.parcela, r.data, r.valor]), theme: "grid", headStyles: { fillColor: primaryColor, textColor: 255 }, margin: { top: 10, left: margin, right: margin }, pageBreak: "auto" });
      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Habite-se
    if (yPos > 200) { doc.addPage(); yPos = 20; }
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Detalhes do Habite-se", margin, yPos); yPos += 10;
    autoTable(doc, {
      startY: yPos,
      head: [["Descrição", "Valor"]],
      body: [["Saldo Devedor Final", formatBRL(result.habiteseAmount)], ["Total para Quitação", formatBRL(result.habiteseAmount)]],
      theme: "striped", headStyles: { fillColor: secondaryColor, textColor: 0 }, margin: { top: 10, left: margin, right: margin },
    });
    yPos = doc.lastAutoTable.finalY + 15;

    // INCC correction section in PDF
    if (inccMode !== "none" && result.inccAccumulatedPercent > 0) {
      if (yPos > 200) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.text("Correção INCC", margin, yPos); yPos += 10;
      const dpDate = new Date(Date.UTC(
        parseInt(downPaymentDate.split("-")[0]),
        parseInt(downPaymentDate.split("-")[1]) - 1,
        parseInt(downPaymentDate.split("-")[2])
      ));
      const deliveryDateCalc = new Date(Date.UTC(DELIVERY_YEAR, DELIVERY_MONTH, 1));
      const constructionMonths = Math.max(0, monthsBetween(dpDate, deliveryDateCalc));
      autoTable(doc, {
        startY: yPos,
        head: [["Descrição", "Valor"]],
        body: [
          ["Taxa Mensal INCC", `${inccMonthlyRate.toFixed(3)}% ao mês`],
          ["Período de Correção", `${constructionMonths} meses`],
          ["Correção Acumulada", `${result.inccAccumulatedPercent.toFixed(2)}%`],
          ["Habite-se Original", formatBRL(result.habiteseAmount)],
          ["Habite-se Corrigido", formatBRL(result.habiteseCorrected)],
          ["Impacto INCC", formatBRL(result.habiteseCorrected - result.habiteseAmount)],
        ],
        theme: "grid",
        headStyles: { fillColor: [180, 83, 9], textColor: 255 },
        margin: { top: 10, left: margin, right: margin },
      });
      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Notes
    if (yPos > 210) { doc.addPage(); yPos = 20; }
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
    doc.text("Observações Importantes", margin, yPos); yPos += 8;
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60);
    const notes = [
      "O sinal é pago à vista.",
      "As parcelas mensais começam no mês seguinte ao sinal.",
      "A primeira parcela semestral é 6 meses após o sinal.",
      "O número de parcelas pagas durante as obras é calculado automaticamente com base na data do sinal e na entrega prevista para fevereiro de 2028.",
      "O saldo devedor no habite-se pode ser quitado ou financiado com o banco de preferência.",
      "Importante: Os saldos devedores de todas as parcelas serão corrigidos mensalmente pelo INCC (Índice Nacional de Custo da Construção) até o habite-se.",
      "Captação mínima: A captação durante as obras deve ser de no mínimo 30% do valor do imóvel.",
      "A Taxa de Decoração de R$ 19.505,00 é dividida em 10 parcelas fixas de R$ 1.950,50, pagas de abril de 2027 a janeiro de 2028 (10 meses antes da entrega).",
      "Os valores, condições e disponibilidade apresentados podem sofrer alteração sem aviso prévio.",
      inccMode !== "none" && result.inccAccumulatedPercent > 0
        ? `Correção INCC aplicada ao saldo devedor com taxa de ${inccMonthlyRate.toFixed(3)}% ao mês (${result.inccAccumulatedPercent.toFixed(2)}% acumulado no período da obra). Fonte: INCC-10/Bacen.`
        : null,
    ].filter(Boolean);
    notes.forEach((note) => {
      const lines = doc.splitTextToSize(note, pageWidth - margin * 2);
      doc.text(lines, margin, yPos);
      yPos += lines.length * 4 + 4;
    });

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(150);
      doc.text(`Página ${i} de ${totalPages} - Moment`, pageWidth / 2, pageHeight - 10, { align: "center" });
    }

    const fileName = `Simulacao_Moment_${(unitName || "unidade").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  }, [result, unitName, initialArea, propertyValue, inccMode, inccMonthlyRate, downPaymentDate]);

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
                <p className="text-[11px] text-gray-400 font-medium hidden sm:block">Simulador Moment</p>
              </div>
            </div>
            <a href="/moment" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
              ← Voltar ao Moment
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Simulador de Fluxo de Pagamento</h2>
          <p className="text-gray-500 mt-2">Simulador Moment — Calcule o financiamento do seu apartamento</p>
        </div>

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
          {/* Left Column */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4">
                <div className="flex items-center gap-2 text-white">
                  <Calculator className="w-5 h-5" />
                  <h3 className="font-semibold">Informações do Imóvel</h3>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm">
                  <RotateCcw className="w-4 h-4" />
                  <span className="font-medium">Cálculo automático em tempo real</span>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border-l-4 border-gray-900 text-gray-700 text-sm">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Entrega Prevista:</strong> Fevereiro de {DELIVERY_YEAR}</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Valor do Imóvel (R$)</label>
                  <input type="text" value={propertyValueInput} onChange={handleCurrencyInput(setPropertyValueInput)} placeholder="Ex: R$ 500.000,00" className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Percentual de Desconto (%)</label>
                  <input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} min="0" max="100" step="0.01" placeholder="Ex: 5" className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Unidade Escolhida</label>
                  <input type="text" value={unitName} onChange={(e) => setUnitName(e.target.value)} placeholder="Ex: Apartamento 101" className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Valor do Sinal Ato (R$)</label>
                  <input type="text" value={downPaymentInput} onChange={handleCurrencyInput(setDownPaymentInput)} placeholder="Deixe em branco para 10% do valor final" className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all" />
                  <p className="text-[11px] text-gray-400 mt-1">Padrão: 10% do valor final do imóvel. Pagamento à vista.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Data do Pagamento do Sinal Ato</label>
                  <input type="date" value={downPaymentDate} min={getTodayISO()} onChange={(e) => setDownPaymentDate(e.target.value)} className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all" />
                  <p className="text-[11px] text-gray-400 mt-1">Por padrão, utiliza a data atual. Não é permitido selecionar datas anteriores.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Valor de Cada Parcela Mensal (R$)</label>
                  <input type="text" value={monthlyValueInput} onChange={handleCurrencyInput(setMonthlyValueInput)} placeholder="Ex: R$ 1.500,00" className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all" />
                  {monthlyVal > 0 && result.totalMonths > 0 && (
                    <div className="mt-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-600">
                      <span className="font-medium">Total mensal: {formatBRL(monthlyVal * result.maxMonthlyInstallments)} ({result.maxMonthlyInstallments}x)</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Valor de Cada Parcela Semestral (R$)</label>
                  <input type="text" value={semesterValueInput} onChange={handleCurrencyInput(setSemesterValueInput)} placeholder="Ex: R$ 10.000,00" className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all" />
                  {semesterVal > 0 && result.maxSemesterInstallments > 0 && (
                    <div className="mt-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-600">
                      <span className="font-medium">Total semestral: {formatBRL(semesterVal * result.maxSemesterInstallments)} ({result.maxSemesterInstallments}x)</span>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">Taxa de Decoração (R$ 19.505,00):</span>
                    <span className="font-semibold text-gray-900">
                      {`10x de ${formatBRL(result.decorationInstallmentValue)} (abr/2027 a jan/2028)`}
                    </span>
                  </div>
                </div>

                {/* INCC Correction */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <label className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">
                      Correção INCC no Saldo Devedor
                    </label>
                  </div>
                  <select
                    value={inccMode}
                    onChange={(e) => setInccMode(e.target.value as InccMode)}
                    className="w-full h-10 px-4 rounded-xl border border-amber-200 bg-white text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300/30 focus:border-amber-300 transition-all"
                  >
                    <option value="none">Sem correção INCC</option>
                    <option value="180m" disabled={inccData.loading}>
                      Média últimos 180 meses{!inccData.loading ? ` (${inccData.avg180.toFixed(3)}% a.m.)` : " (carregando...)"}
                    </option>
                    <option value="12m" disabled={inccData.loading}>
                      Média últimos 12 meses{!inccData.loading ? ` (${inccData.avg12.toFixed(3)}% a.m.)` : " (carregando...)"}
                    </option>
                    <option value="projection" disabled={inccData.loading}>
                      Projeção INCC (12m){!inccData.loading ? ` (${inccData.projection.toFixed(3)}% a.m.)` : " (carregando...)"}
                    </option>
                  </select>
                  {inccMode !== "none" && !inccData.loading && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs text-amber-700">
                        <span className="font-semibold">Taxa selecionada:</span> {inccMonthlyRate.toFixed(3)}% ao mês
                      </p>
                      {inccData.isFallback && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Usando valor de referência (fonte indisponível)
                        </p>
                      )}
                      {result.inccAccumulatedPercent > 0 && (
                        <div className="p-2.5 rounded-lg bg-white/70 border border-amber-200 text-xs text-amber-800">
                          <span className="font-semibold">Correção acumulada no período da obra:</span>{" "}
                          {result.inccAccumulatedPercent.toFixed(2)}%
                          <br />
                          <span className="font-semibold">Habite-se corrigido:</span>{" "}
                          {formatBRL(result.habiteseCorrected)}
                          {" (+"}{formatBRL(result.habiteseCorrected - result.habiteseAmount)})
                        </div>
                      )}
                      {inccData.lastUpdate && !inccData.isFallback && (
                        <p className="text-[10px] text-amber-500">
                          Dados INCC-10 (Bacen) atualizados em {inccData.lastUpdate}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {result.isLowCaptation && showResults && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border-l-4 border-red-500 text-red-700 animate-pulse">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="font-bold text-sm">Captação durante as obras abaixo de 30% não é permitida!</span>
                  </div>
                )}

                <button onClick={clearAll} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all">
                  <Trash2 className="w-4 h-4" /> Limpar Todos os Campos
                </button>
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl shadow-lg p-6 text-white">
              <h4 className="font-semibold text-white/80 text-sm uppercase tracking-wider mb-4">Resumo do Financiamento</h4>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-white/60 text-xs mb-1">Valor do Imóvel</p><p className="text-xl font-bold">{formatBRL(propertyValue)}</p></div>
                <div><p className="text-white/60 text-xs mb-1">Valor com Desconto</p><p className="text-xl font-bold">{formatBRL(result.finalPropertyValue)}</p></div>
              </div>
              <div className="mt-4">
                <div className="w-full h-3 rounded-full bg-white/20 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${result.captationPercent >= 50 ? "bg-emerald-400" : result.isLowCaptation ? "bg-red-400" : "bg-amber-400"}`} style={{ width: `${Math.min(result.captationPercent, 100)}%` }} />
                </div>
                <p className="text-white/60 text-xs mt-2 text-center">Captação durante obras: <span className="text-white font-bold">{result.captationPercent.toFixed(2)}%</span></p>
              </div>
              {inccMode !== "none" && result.inccAccumulatedPercent > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/25">
                  <p className="text-amber-200 text-xs font-semibold uppercase tracking-wider mb-1">Correção INCC</p>
                  <p className="text-white text-sm font-medium">
                    Habite-se corrigido: <span className="font-bold text-amber-200">{formatBRL(result.habiteseCorrected)}</span>
                  </p>
                  <p className="text-amber-200/70 text-xs mt-0.5">
                    +{formatBRL(result.habiteseCorrected - result.habiteseAmount)} ({result.inccAccumulatedPercent.toFixed(2)}% acumulado)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
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
                      <tr className="border-b border-gray-100"><td className="py-3 px-4 font-medium">Sinal Ato</td><td className="py-3 px-4 text-right font-semibold">{formatBRL(result.downPaymentValue)}</td><td className="py-3 px-4 text-right text-gray-500">{result.downPaymentPercent.toFixed(2)}%</td><td className="py-3 px-4 text-gray-400 text-xs">Pagamento à vista</td></tr>
                      <tr className="border-b border-gray-100"><td className="py-3 px-4 font-medium">Parcelas Mensais</td><td className="py-3 px-4 text-right font-semibold">{formatBRL(result.monthlyPaid)}</td><td className="py-3 px-4 text-right text-gray-500">{result.monthlyPaidPercent.toFixed(2)}%</td><td className="py-3 px-4 text-gray-400 text-xs">{result.maxMonthlyInstallments} parcelas durante a obra</td></tr>
                      <tr className="border-b border-gray-100"><td className="py-3 px-4 font-medium">Parcelas Semestrais</td><td className="py-3 px-4 text-right font-semibold">{formatBRL(result.semesterPaid)}</td><td className="py-3 px-4 text-right text-gray-500">{result.semesterPaidPercent.toFixed(2)}%</td><td className="py-3 px-4 text-gray-400 text-xs">{result.maxSemesterInstallments} parcelas durante a obra</td></tr>
                      <tr className="border-b border-gray-100"><td className="py-3 px-4 font-medium">Taxa de Decoração</td><td className="py-3 px-4 text-right font-semibold">{formatBRL(DECORATION_FEE)}</td><td className="py-3 px-4 text-right text-gray-500">—</td><td className="py-3 px-4 text-gray-400 text-xs">{result.decorationInstallments}x de abr/2027 a jan/2028</td></tr>
                      <tr className="border-b border-gray-100"><td className="py-3 px-4 font-medium">Habite-se</td><td className="py-3 px-4 text-right font-semibold">{formatBRL(result.habiteseAmount)}</td><td className="py-3 px-4 text-right text-gray-500">{result.habitesePercent.toFixed(2)}%</td><td className="py-3 px-4 text-gray-400 text-xs">Saldo devedor restante</td></tr>
                      {inccMode !== "none" && result.inccAccumulatedPercent > 0 && (
                        <tr className="border-b border-gray-100 bg-amber-50">
                          <td className="py-3 px-4 font-medium text-amber-900">Habite-se (corrigido INCC)</td>
                          <td className="py-3 px-4 text-right font-semibold text-amber-900">{formatBRL(result.habiteseCorrected)}</td>
                          <td className="py-3 px-4 text-right text-amber-700">{((result.habiteseCorrected / result.finalPropertyValue) * 100).toFixed(2)}%</td>
                          <td className="py-3 px-4 text-amber-600 text-xs">+{formatBRL(result.habiteseCorrected - result.habiteseAmount)} ({result.inccAccumulatedPercent.toFixed(2)}%)</td>
                        </tr>
                      )}
                      <tr className="bg-emerald-50"><td className="py-3 px-4 font-bold text-emerald-900">Valor Total</td><td className="py-3 px-4 text-right font-bold text-emerald-900">{formatBRL(result.finalPropertyValue)}</td><td className="py-3 px-4 text-right font-bold text-emerald-700">100%</td><td className="py-3 px-4"></td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-gray-600">
                  <strong className="text-gray-800">Observação:</strong> O valor do Habite-se inclui:
                  <ul className="mt-2 space-y-1 list-disc list-inside text-gray-500">
                    <li>Saldo devedor restante</li>
                    <li>Pode ser quitado ou financiado com o banco de preferência</li>
                  </ul>
                </div>

                {showResults && (
                  <div className="mt-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-3">Cronograma de Pagamento</h4>
                    <div className="flex border-b border-gray-200">
                      {(["sinal", "mensal", "semestral", "decoracao", "habitese"] as const).map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === tab ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-400 hover:text-gray-600"}`}>
                          {tab === "habitese" ? "Habite-se" : tab === "sinal" ? "Sinal" : tab === "mensal" ? "Mensais" : tab === "semestral" ? "Semestrais" : "Decoração"}
                        </button>
                      ))}
                    </div>
                    <div className="p-4 border border-t-0 border-gray-200 rounded-b-xl max-h-96 overflow-y-auto custom-scrollbar">
                      {activeTab === "sinal" && (
                        <table className="w-full text-sm"><thead><tr className="border-b border-gray-100"><th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Parcela</th><th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Data</th><th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Valor (R$)</th></tr></thead><tbody>
                          {result.sinalRows.length > 0 ? result.sinalRows.map((row, i) => (<tr key={i} className="border-b border-gray-50"><td className="py-2 px-3">{row.parcela}</td><td className="py-2 px-3">{row.data}</td><td className="py-2 px-3 text-right font-semibold">{row.valor}</td></tr>)) : (<tr><td colSpan={3} className="py-4 text-center text-gray-400">Nenhum dado</td></tr>)}
                        </tbody></table>
                      )}
                      {activeTab === "mensal" && (
                        <table className="w-full text-sm"><thead><tr className="border-b border-gray-100"><th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Parcela</th><th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Data</th><th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Valor (R$)</th></tr></thead><tbody>
                          {result.monthlyRows.length > 0 ? result.monthlyRows.map((row, i) => (<tr key={i} className="border-b border-gray-50"><td className="py-2 px-3">{row.parcela}</td><td className="py-2 px-3">{row.data}</td><td className="py-2 px-3 text-right font-semibold">{row.valor}</td></tr>)) : (<tr><td colSpan={3} className="py-4 text-center text-gray-400">Nenhum dado</td></tr>)}
                        </tbody></table>
                      )}
                      {activeTab === "semestral" && (
                        <table className="w-full text-sm"><thead><tr className="border-b border-gray-100"><th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Parcela</th><th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Data</th><th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Valor (R$)</th></tr></thead><tbody>
                          {result.semesterRows.length > 0 ? result.semesterRows.map((row, i) => (<tr key={i} className="border-b border-gray-50"><td className="py-2 px-3">{row.parcela}</td><td className="py-2 px-3">{row.data}</td><td className="py-2 px-3 text-right font-semibold">{row.valor}</td></tr>)) : (<tr><td colSpan={3} className="py-4 text-center text-gray-400">Nenhum dado</td></tr>)}
                        </tbody></table>
                      )}
                      {activeTab === "decoracao" && (
                        <table className="w-full text-sm"><thead><tr className="border-b border-gray-100"><th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Parcela</th><th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Data</th><th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Valor (R$)</th></tr></thead><tbody>
                          {result.decorationRows.length > 0 ? result.decorationRows.map((row, i) => (<tr key={i} className="border-b border-gray-50"><td className="py-2 px-3">{row.parcela}</td><td className="py-2 px-3">{row.data}</td><td className="py-2 px-3 text-right font-semibold">{row.valor}</td></tr>)) : (<tr><td colSpan={3} className="py-4 text-center text-gray-400">Nenhum dado</td></tr>)}
                        </tbody></table>
                      )}
                      {activeTab === "habitese" && (
                        <div className="space-y-3">
                          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                            <p className="text-sm font-semibold text-amber-900">Saldo Devedor no Habite-se</p>
                            <p className="text-2xl font-bold text-amber-900 mt-1">{formatBRL(result.habiteseAmount)}</p>
                            <p className="text-sm text-amber-700 mt-1">{result.habitesePercent.toFixed(2)}% do valor do imóvel</p>
                          </div>
                          {inccMode !== "none" && result.inccAccumulatedPercent > 0 && (
                            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 mt-3">
                              <p className="text-sm font-semibold text-amber-900">Habite-se Corrigido (INCC)</p>
                              <p className="text-2xl font-bold text-amber-900 mt-1">{formatBRL(result.habiteseCorrected)}</p>
                              <p className="text-sm text-amber-700 mt-1">+{formatBRL(result.habiteseCorrected - result.habiteseAmount)} ({result.inccAccumulatedPercent.toFixed(2)}% acumulado)</p>
                            </div>
                          )}
                          <p className="text-sm text-gray-500">O saldo devedor no habite-se pode ser quitado à vista ou financiado com o banco de preferência do cliente.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button onClick={generatePDF} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-gray-900 to-gray-700 text-white font-semibold text-sm hover:from-gray-800 hover:to-gray-600 shadow-lg hover:shadow-xl transition-all mt-6">
                  <FileDown className="w-4 h-4" /> Baixar Simulação em PDF
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-600 space-y-2">
                  <p className="font-semibold text-gray-900">Informações Importantes</p>
                  <ul className="space-y-1 list-disc list-inside text-gray-500">
                    <li>Captação mínima durante as obras: <strong>30%</strong> do valor do imóvel</li>
                    <li>Taxa de Decoração: <strong>R$ 19.505,00</strong> (10x de abr/2027 a jan/2028)</li>
                    <li>Entrega prevista: <strong>Fevereiro de 2028</strong></li>
                    <li>Saldos devedores corrigidos mensalmente pelo INCC até o habite-se</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mt-auto border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Espelho de Vendas • Moment</span>
          <span>Simulador de Fluxo de Pagamento</span>
        </div>
      </footer>
    </div>
  );
}

export default function SimuladorMomentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Carregando simulador...</p>
        </div>
      </div>
    }>
      <SimulatorContent />
    </Suspense>
  );
}
