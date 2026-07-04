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
const DELIVERY_YEAR = 2029;
const DELIVERY_MONTH = 3; // April (0-indexed: 0=Jan, 3=Apr)
const MAX_MONTHLY_INSTALLMENTS = 60;
const MAX_SEMESTER_INSTALLMENTS = 5;
const MIN_CAPTATION_PCT = 25;

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

type InccMode = "none" | "180m" | "12m" | "projection";

interface InccData {
  avg180: number;
  avg12: number;
  projection: number;
  projectionSource: string;
  lastUpdate: string | null;
  totalMonths: number;
  loading: boolean;
  error: string | null;
  isFallback: boolean;
}

interface InstallmentRow { parcela: string; data: string; valor: string; }

interface CalculationResult {
  finalPropertyValue: number;
  downPaymentValue: number;
  downPaymentPercent: number;
  totalMonthsUntilDelivery: number;
  paidMonthlyCount: number;
  remainingMonthlyCount: number;
  paidSemesterCount: number;
  remainingSemesterCount: number;
  monthlyPaidDuringConstruction: number;
  monthlyPaidPercent: number;
  semesterPaidDuringConstruction: number;
  semesterPaidPercent: number;
  remainingMonthlyValue: number;
  remainingSemesterValue: number;
  habiteseAmount: number;
  habitesePercent: number;
  captationPercent: number;
  sinalRows: InstallmentRow[];
  monthlyRows: InstallmentRow[];
  semesterRows: InstallmentRow[];
  isLowCaptation: boolean;
  inccMonthlyRate: number;
  inccCorrectionFactor: number;
  inccAccumulatedPercent: number;
  inccMode: string;
  habiteseCorrected: number;
  monthlyRemainingCorrected: number;
  semesterRemainingCorrected: number;
  habiteseBalanceCorrected: number;
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
  const [activeTab, setActiveTab] = useState<"sinal" | "mensal" | "semestral" | "habitese">("sinal");
  const [showResults, setShowResults] = useState(false);

  // INCC state
  const [inccMode, setInccMode] = useState<InccMode>("none");
  const [inccData, setInccData] = useState<InccData>({
    avg180: 0, avg12: 0, projection: 0, projectionSource: "",
    lastUpdate: null, totalMonths: 0,
    loading: true, error: null, isFallback: false,
  });

  const parseVal = (raw: string) => parseCurrencyToNumber(raw);
  const propertyValue = parseVal(propertyValueInput);
  const downPaymentManual = parseVal(downPaymentInput);
  const monthlyVal = parseVal(monthlyValueInput);
  const semesterVal = parseVal(semesterValueInput);
  const discount = parseFloat(discountPercent) || 0;
  const finalPropertyValue = propertyValue * (1 - discount / 100);
  const downPaymentValue = downPaymentManual > 0 ? downPaymentManual : finalPropertyValue * 0.06;

  // INCC helper
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
    // Meses até o mês anterior à entrega
    let totalMonthsUntilDelivery = monthsBetween(dpDate, deliveryDate) - 1;
    totalMonthsUntilDelivery = Math.max(0, totalMonthsUntilDelivery);

    // Quantas parcelas cabem durante a obra vs ficam para o habite-se
    const paidMonthlyCount = Math.min(MAX_MONTHLY_INSTALLMENTS, totalMonthsUntilDelivery);
    const remainingMonthlyCount = Math.max(0, MAX_MONTHLY_INSTALLMENTS - paidMonthlyCount);
    const paidSemesterCount = Math.min(MAX_SEMESTER_INSTALLMENTS, Math.floor(totalMonthsUntilDelivery / 6));
    const remainingSemesterCount = Math.max(0, MAX_SEMESTER_INSTALLMENTS - paidSemesterCount);

    // INCC: fator de correção para o período total
    const inccCorrectionFactor = totalMonthsUntilDelivery > 0 && inccMonthlyRate > 0
      ? Math.pow(1 + inccMonthlyRate / 100, totalMonthsUntilDelivery)
      : 1;

    // ── Fase 1: Calcular cronograma nominal (sem INCC) ──
    const sinalRows: InstallmentRow[] = [
      { parcela: "1/1", data: formatDateBR(dpDate), valor: formatBRL(downPaymentValue) },
    ];
    const monthlyRows: InstallmentRow[] = [];
    const semesterRows: InstallmentRow[] = [];
    const semesterPaymentMonths = new Set<number>();
    for (let i = 1; i <= paidSemesterCount; i++) semesterPaymentMonths.add(6 * i);

    for (let month = 1; month <= totalMonthsUntilDelivery; month++) {
      // Mensais
      if (month <= paidMonthlyCount) {
        const inccFactorForMonth = inccMonthlyRate > 0 ? Math.pow(1 + inccMonthlyRate / 100, month) : 1;
        monthlyRows.push({
          parcela: `${month}/${MAX_MONTHLY_INSTALLMENTS}`,
          data: formatDateBR(addMonthsToDate(dpDate, month)),
          valor: formatBRL(monthlyVal * inccFactorForMonth),
        });
      }

      // Semestrais
      if (semesterPaymentMonths.has(month)) {
        const semIdx = month / 6;
        const inccFactorForMonth = inccMonthlyRate > 0 ? Math.pow(1 + inccMonthlyRate / 100, month) : 1;
        semesterRows.push({
          parcela: `${semIdx}/${MAX_SEMESTER_INSTALLMENTS}`,
          data: formatDateBR(addMonthsToDate(dpDate, month)),
          valor: formatBRL(semesterVal * inccFactorForMonth),
        });
      }
    }

    // Valores pagos durante a obra (nominais)
    const monthlyPaidDuringConstruction = paidMonthlyCount * monthlyVal;
    const semesterPaidDuringConstruction = paidSemesterCount * semesterVal;
    const remainingMonthlyValue = remainingMonthlyCount * monthlyVal;
    const remainingSemesterValue = remainingSemesterCount * semesterVal;

    const totalCaptation = downPaymentValue + monthlyPaidDuringConstruction + semesterPaidDuringConstruction;
    const captPct = finalPropertyValue > 0 ? (totalCaptation / finalPropertyValue) * 100 : 0;

    // Habite-se = saldo devedor pós-obra
    const habitese = Math.max(0, finalPropertyValue - totalCaptation);

    // ── Fase 2: Aplicar correção INCC aos saldos remanescentes ──
    // O habite-se é composto por: parcelas mensais remanescentes + semestrais remanescentes + saldo residual
    const saldoResidual = habitese - remainingMonthlyValue - remainingSemesterValue;
    const monthlyRemainingCorrected = remainingMonthlyValue * inccCorrectionFactor;
    const semesterRemainingCorrected = remainingSemesterValue * inccCorrectionFactor;
    const habiteseBalanceCorrected = Math.max(0, saldoResidual) * inccCorrectionFactor;
    const habiteseCorrected = monthlyRemainingCorrected + semesterRemainingCorrected + habiteseBalanceCorrected;

    const inccAccumulatedPercent = habitese > 0 ? ((habiteseCorrected - habitese) / habitese) * 100 : 0;

    return {
      finalPropertyValue,
      downPaymentValue,
      downPaymentPercent: finalPropertyValue > 0 ? (downPaymentValue / finalPropertyValue) * 100 : 0,
      totalMonthsUntilDelivery,
      paidMonthlyCount,
      remainingMonthlyCount,
      paidSemesterCount,
      remainingSemesterCount,
      monthlyPaidDuringConstruction,
      monthlyPaidPercent: finalPropertyValue > 0 ? (monthlyPaidDuringConstruction / finalPropertyValue) * 100 : 0,
      semesterPaidDuringConstruction,
      semesterPaidPercent: finalPropertyValue > 0 ? (semesterPaidDuringConstruction / finalPropertyValue) * 100 : 0,
      remainingMonthlyValue,
      remainingSemesterValue,
      habiteseAmount: habitese,
      habitesePercent: finalPropertyValue > 0 ? (habitese / finalPropertyValue) * 100 : 0,
      captationPercent: captPct,
      sinalRows,
      monthlyRows,
      semesterRows,
      isLowCaptation: captPct > 0 && captPct < MIN_CAPTATION_PCT,
      inccMonthlyRate,
      inccCorrectionFactor,
      inccAccumulatedPercent,
      inccMode,
      habiteseCorrected,
      monthlyRemainingCorrected,
      semesterRemainingCorrected,
      habiteseBalanceCorrected,
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
          avg180: data.avg180 || 0, avg12: data.avg12 || 0,
          projection: data.projection || 0, projectionSource: data.projectionSource || "",
          lastUpdate: data.lastUpdate || null, totalMonths: data.totalMonths || 0,
          loading: false, error: null, isFallback: data.fallback || false,
        });
      } catch {
        setInccData(prev => ({ ...prev, loading: false, error: "Erro ao buscar dados INCC" }));
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
    doc.text("Residencial Vitta", margin, 20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Simula\u00e7\u00e3o de Fluxo de Pagamento", margin, 30);
    const today = new Date().toLocaleDateString("pt-BR");
    doc.setFontSize(10);
    doc.text(`Gerado em: ${today}`, pageWidth - margin - 30, 30, { align: "right" });
    yPos = 50;

    // Info table
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Informa\u00e7\u00f5es da Simula\u00e7\u00e3o", margin, yPos);
    yPos += 10;
    autoTable(doc, {
      startY: yPos,
      head: [["Descri\u00e7\u00e3o", "Informa\u00e7\u00e3o"]],
      body: [
        ["Unidade", unitName || "N\u00e3o informado"],
        ["\u00c1rea", initialArea || "\u2014"],
        ["Valor do Im\u00f3vel", formatBRL(propertyValue)],
        ["Valor com Desconto", formatBRL(result.finalPropertyValue)],
        ["Entrega Prevista", "Abril de 2029"],
        ["M\u00e1x. Mensais Contratadas", `${MAX_MONTHLY_INSTALLMENTS} parcelas`],
        ["M\u00e1x. Semestrais Contratadas", `${MAX_SEMESTER_INSTALLMENTS} parcelas`],
      ],
      theme: "grid",
      headStyles: { fillColor: primaryColor, textColor: 255 },
      margin: { top: 10, left: margin, right: margin },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 }, 1: { cellWidth: "auto" } },
    });
    yPos = doc.lastAutoTable.finalY + 15;

    // Financial Summary
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo Financeiro", margin, yPos);
    yPos += 10;

    const summaryBody: (string | number)[][] = [
      ["Sinal", formatBRL(result.downPaymentValue), `${result.downPaymentPercent.toFixed(2)}%`, "Pagamento \u00e0 vista"],
      [`Mensais (obra)`, formatBRL(result.monthlyPaidDuringConstruction), `${result.monthlyPaidPercent.toFixed(2)}%`, `${result.paidMonthlyCount} parcelas durante a obra`],
      [`Semestrais (obra)`, formatBRL(result.semesterPaidDuringConstruction), `${result.semesterPaidPercent.toFixed(2)}%`, `${result.paidSemesterCount} parcelas durante a obra`],
    ];

    if (result.remainingMonthlyCount > 0) {
      summaryBody.push([`Mensais (p\u00f3s habite-se)`, formatBRL(result.remainingMonthlyValue), "\u2014", `${result.remainingMonthlyCount} parcelas remanescentes`]);
    }
    if (result.remainingSemesterCount > 0) {
      summaryBody.push([`Semestrais (p\u00f3s habite-se)`, formatBRL(result.remainingSemesterValue), "\u2014", `${result.remainingSemesterCount} parcelas remanescentes`]);
    }

    summaryBody.push(["Habite-se", formatBRL(result.habiteseAmount), `${result.habitesePercent.toFixed(2)}%`, "Saldo devedor p\u00f3s-obra"]);

    if (inccMode !== "none" && result.inccAccumulatedPercent > 0) {
      summaryBody.push(["Habite-se (proje\u00e7\u00e3o INCC)", formatBRL(result.habiteseCorrected), `${((result.habiteseCorrected / result.finalPropertyValue) * 100).toFixed(2)}%`, "Valor projetado com corre\u00e7\u00e3o"]);
    }

    summaryBody.push(["Total", formatBRL(result.finalPropertyValue), "100%", ""]);

    autoTable(doc, {
      startY: yPos,
      head: [["Etapa", "Valor", "%", "Observa\u00e7\u00e3o"]],
      body: summaryBody,
      theme: "striped",
      headStyles: { fillColor: primaryColor, textColor: 255 },
      margin: { top: 10, left: margin, right: margin },
      foot: [["", "Total Geral:", formatBRL(result.finalPropertyValue), ""]],
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
      doc.text("Cronograma: Mensais (durante a obra)", margin, yPos); yPos += 10;
      autoTable(doc, { startY: yPos, head: [["Parcela", "Data", "Valor"]], body: result.monthlyRows.map((r) => [r.parcela, r.data, r.valor]), theme: "grid", headStyles: { fillColor: primaryColor, textColor: 255 }, margin: { top: 10, left: margin, right: margin }, pageBreak: "auto" });
      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Semester schedule
    if (result.semesterRows.length > 0) {
      if (yPos > 220) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.text("Cronograma: Semestrais (durante a obra)", margin, yPos); yPos += 10;
      autoTable(doc, { startY: yPos, head: [["Parcela", "Data", "Valor"]], body: result.semesterRows.map((r) => [r.parcela, r.data, r.valor]), theme: "grid", headStyles: { fillColor: primaryColor, textColor: 255 }, margin: { top: 10, left: margin, right: margin } });
      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Habite-se details
    if (yPos > 200) { doc.addPage(); yPos = 20; }
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Detalhes do Habite-se", margin, yPos); yPos += 10;

    const habiteBody: (string | number)[][] = [
      ["Saldo Devedor Total (Habite-se)", formatBRL(result.habiteseAmount)],
    ];
    if (result.remainingMonthlyCount > 0) {
      habiteBody.push([`  Parcelas mensais remanescentes (${result.remainingMonthlyCount}x)`, formatBRL(result.remainingMonthlyValue)]);
    }
    if (result.remainingSemesterCount > 0) {
      habiteBody.push([`  Parcelas semestrais remanescentes (${result.remainingSemesterCount}x)`, formatBRL(result.remainingSemesterValue)]);
    }
    const saldoResidual = result.habiteseAmount - result.remainingMonthlyValue - result.remainingSemesterValue;
    if (saldoResidual > 0) {
      habiteBody.push(["  Saldo residual", formatBRL(saldoResidual)]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [["Descri\u00e7\u00e3o", "Valor"]],
      body: habiteBody,
      theme: "striped",
      headStyles: { fillColor: secondaryColor, textColor: 0 },
      margin: { top: 10, left: margin, right: margin },
    });
    yPos = doc.lastAutoTable.finalY + 15;

    // INCC Correction section
    if (inccMode !== "none" && result.inccAccumulatedPercent > 0) {
      if (yPos > 180) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Proje\u00e7\u00e3o de Corre\u00e7\u00e3o INCC (Estimativa)", margin, yPos);
      yPos += 10;
      const inccMetricLabel = inccMode === "180m"
        ? "M\u00e9dia dos \u00faltimos 180 meses do INCC"
        : inccMode === "12m"
          ? "M\u00e9dia dos \u00faltimos 12 meses do INCC"
          : inccMode === "projection"
            ? "Proje\u00e7\u00e3o de mercado"
            : "N/A";
      const inccSourceLabel = inccData.isFallback
        ? "Dados de refer\u00eancia (valores estimados)"
        : "FGV IBRE";
      autoTable(doc, {
        startY: yPos,
        head: [["Descri\u00e7\u00e3o", "Valor"]],
        body: [
          ["Taxa Mensal Utilizada", `${inccMonthlyRate.toFixed(3)}% ao m\u00eas`],
          ["M\u00e9trica Utilizada", inccMetricLabel],
          ["Fonte dos Dados", inccSourceLabel],
          ["Per\u00edodo de Corre\u00e7\u00e3o", `${result.totalMonthsUntilDelivery} meses`],
          ["Corre\u00e7\u00e3o Acumulada", `${result.inccAccumulatedPercent.toFixed(2)}%`],
          ["Habite-se Original", formatBRL(result.habiteseAmount)],
          ["Habite-se Projetado", formatBRL(result.habiteseCorrected)],
          ["Impacto Estimado", formatBRL(result.habiteseCorrected - result.habiteseAmount)],
        ],
        theme: "grid",
        headStyles: { fillColor: [180, 83, 9], textColor: 255 },
        margin: { top: 10, left: margin, right: margin },
      });
      yPos = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(120, 80, 0);
      const disclaimerLines = doc.splitTextToSize(
        "AVISO: Os valores de corre\u00e7\u00e3o INCC apresentados acima s\u00e3o meras proje\u00e7\u00f5es estimativas e n\u00e3o garantem o resultado final. O INCC \u00e9 um \u00edndice vari\u00e1vel cujos valores futuros n\u00e3o podem ser previstos com certeza. A taxa utilizada \u00e9 baseada em dados hist\u00f3ricos/projetados e poder\u00e1 divergir significativamente do \u00edndice efetivamente apurado durante o per\u00edodo de obras. Consulte o contrato para as condi\u00e7\u00f5es definitivas de reajuste.",
        pageWidth - margin * 2
      );
      doc.text(disclaimerLines, margin, yPos);
      yPos += disclaimerLines.length * 3.5 + 10;
    }

    // Notes
    if (yPos > 210) { doc.addPage(); yPos = 20; }
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
    doc.text("Observa\u00e7\u00f5es Importantes", margin, yPos); yPos += 8;
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60);
    const notes = [
      "O sinal \u00e9 pago \u00e0 vista.",
      "As parcelas mensais come\u00e7am no m\u00eas seguinte ao sinal.",
      "A primeira parcela semestral \u00e9 6 meses ap\u00f3s o sinal.",
      `A construtora permite dividir as mensais em at\u00e9 ${MAX_MONTHLY_INSTALLMENTS} meses e as semestrais em at\u00e9 ${MAX_SEMESTER_INSTALLMENTS} semestrais.`,
      "As parcelas que n\u00e3o couberem at\u00e9 o m\u00eas anterior ao m\u00eas de entrega s\u00e3o integradas ao saldo devedor p\u00f3s habite-se.",
      "O saldo devedor no habite-se pode ser quitado ou financiado com o banco de prefer\u00eancia.",
      "Importante: Os saldos devedores de todas as parcelas ser\u00e3o corrigidos mensalmente pelo INCC (\u00cdndice Nacional de Custo da Constru\u00e7\u00e3o) at\u00e9 o habite-se.",
      `Capta\u00e7\u00e3o m\u00ednima: A capta\u00e7\u00e3o durante as obras deve ser de no m\u00ednimo ${MIN_CAPTATION_PCT}% do valor do im\u00f3vel.`,
      "Os valores, condi\u00e7\u00f5es e disponibilidade apresentados podem sofrer altera\u00e7\u00e3o sem aviso pr\u00e9vio.",
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
      doc.setFontSize(8); doc.setTextColor(150);
      doc.text(`P\u00e1gina ${i} de ${totalPages} - Residencial Vitta`, pageWidth / 2, pageHeight - 10, { align: "center" });
    }

    const fileName = `Simula\u00e7\u00e3o_Vitta_${(unitName || "unidade").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
    try {
      const blob = doc.output("blob");
      if (navigator.msSaveOrOpenBlob) {
        navigator.msSaveOrOpenBlob(blob, fileName);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 1000);
      }
    } catch {
      doc.save(fileName);
    }
  }, [result, unitName, initialArea, propertyValue, inccMode, inccMonthlyRate]);

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
                <p className="text-[11px] text-gray-400 font-medium hidden sm:block">Simulador Residencial Vitta</p>
              </div>
            </div>
            <a href="/vitta" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
              &larr; Voltar ao Residencial Vitta
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Simulador de Fluxo de Pagamento</h2>
          <p className="text-gray-500 mt-2">Residencial Vitta &mdash; Ceil\u00e2ndia, DF &mdash; Calcule o financiamento do seu im\u00f3vel</p>
        </div>

        <div className="flex items-center justify-center mb-10">
          {["Dados B\u00e1sicos", "Sinal", "Mensais", "Semestrais", "Resultado"].map((step, i) => (
            <div key={step} className="flex items-center">
              {i > 0 && <div className="w-8 sm:w-16 h-0.5 bg-gray-200 mx-1" />}
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i < 4 ? "bg-emerald-500 text-white" : "bg-gray-900 text-white"}`}>
                  {i < 4 ? "\u2713" : i + 1}
                </div>
                <span className="text-[10px] sm:text-xs text-gray-500 font-medium text-center hidden sm:block">{step}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Inputs */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4">
                <div className="flex items-center gap-2 text-white">
                  <Calculator className="w-5 h-5" />
                  <h3 className="font-semibold">Informa\u00e7\u00f5es do Im\u00f3vel</h3>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm">
                  <RotateCcw className="w-4 h-4" />
                  <span className="font-medium">C\u00e1lculo autom\u00e1tico em tempo real</span>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border-l-4 border-gray-900 text-gray-700 text-sm">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Entrega Prevista:</strong> Abril de 2029</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Valor do Im\u00f3vel (R$)</label>
                  <input type="text" value={propertyValueInput} onChange={handleCurrencyInput(setPropertyValueInput)} placeholder="Ex: R$ 400.000,00" className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Percentual de Desconto (%)</label>
                  <input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} min="0" max="100" step="0.01" placeholder="Ex: 5" className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Unidade Escolhida</label>
                  <input type="text" value={unitName} onChange={(e) => setUnitName(e.target.value)} placeholder="Ex: A-101" className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Valor do Sinal (R$)</label>
                  <input type="text" value={downPaymentInput} onChange={handleCurrencyInput(setDownPaymentInput)} placeholder="Deixe em branco para 6% do valor final" className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all" />
                  <p className="text-[11px] text-gray-400 mt-1">Padr\u00e3o: 6% do valor final do im\u00f3vel. Pagamento \u00e0 vista.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Data do Pagamento do Sinal</label>
                  <input type="date" value={downPaymentDate} min={getTodayISO()} onChange={(e) => setDownPaymentDate(e.target.value)} className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Valor de Cada Parcela Mensal (R$)</label>
                  <input type="text" value={monthlyValueInput} onChange={handleCurrencyInput(setMonthlyValueInput)} placeholder="Ex: R$ 1.000,00" className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all" />
                  {monthlyVal > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-600">
                        <span className="font-medium">Total mensal: {formatBRL(monthlyVal * MAX_MONTHLY_INSTALLMENTS)} ({MAX_MONTHLY_INSTALLMENTS}x)</span>
                      </div>
                      <p className="text-[11px] text-amber-600">
                        {result.paidMonthlyCount} parcelas durante a obra + {result.remainingMonthlyCount} para o habite-se
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Valor de Cada Parcela Semestral (R$)</label>
                  <input type="text" value={semesterValueInput} onChange={handleCurrencyInput(setSemesterValueInput)} placeholder="Ex: R$ 8.000,00" className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all" />
                  {semesterVal > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-600">
                        <span className="font-medium">Total semestral: {formatBRL(semesterVal * MAX_SEMESTER_INSTALLMENTS)} ({MAX_SEMESTER_INSTALLMENTS}x)</span>
                      </div>
                      <p className="text-[11px] text-amber-600">
                        {result.paidSemesterCount} parcelas durante a obra + {result.remainingSemesterCount} para o habite-se
                      </p>
                    </div>
                  )}
                </div>

                {/* INCC Correction */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setInccMode(inccMode === "none" ? "12m" : "none")}
                    className="flex items-center justify-between w-full p-3 rounded-xl border-2 border-gray-200 hover:border-amber-300 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                      <span className="font-semibold text-sm text-gray-700">Corre\u00e7\u00e3o INCC</span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${inccMode !== "none" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                      {inccMode !== "none" ? "Ativada" : "Desativada"}
                    </span>
                  </button>

                  {inccMode !== "none" && (
                    <div className="pl-4 space-y-2">
                      <label className="block">
                        <input type="radio" name="incc" value="none" checked={inccMode === "none"} onChange={() => setInccMode("none")} className="mr-2" />
                        <span className="text-sm text-gray-600">Sem corre\u00e7\u00e3o</span>
                      </label>
                      <label className="block">
                        <input type="radio" name="incc" value="180m" checked={inccMode === "180m"} onChange={() => setInccMode("180m")} className="mr-2" />
                        <span className="text-sm text-gray-600">M\u00e9dia \u00faltimos 180 meses{!inccData.loading ? ` (${inccData.avg180.toFixed(3)}% a.m.)` : " (carregando...)"}</span>
                      </label>
                      <label className="block">
                        <input type="radio" name="incc" value="12m" checked={inccMode === "12m"} onChange={() => setInccMode("12m")} className="mr-2" />
                        <span className="text-sm text-gray-600">M\u00e9dia \u00faltimos 12 meses{!inccData.loading ? ` (${inccData.avg12.toFixed(3)}% a.m.)` : " (carregando...)"}</span>
                      </label>
                      <label className="block">
                        <input type="radio" name="incc" value="projection" checked={inccMode === "projection"} onChange={() => setInccMode("projection")} className="mr-2" />
                        <span className="text-sm text-gray-600">Proje\u00e7\u00e3o de mercado{!inccData.loading ? ` (${inccData.projection.toFixed(3)}% a.m.)` : " (carregando...)"}</span>
                        {inccData.projectionSource && !inccData.loading && inccMode === "projection" && (
                          <p className="text-[10px] text-gray-400 ml-6 mt-0.5">{inccData.projectionSource}</p>
                        )}
                      </label>
                      {inccData.lastUpdate && (
                        <p className="text-[10px] text-gray-400">Dados atualizados em {inccData.lastUpdate} &mdash; {inccData.isFallback ? "valores de refer\u00eancia" : "fonte: FGV IBRE"}</p>
                      )}
                    </div>
                  )}
                </div>

                {result.isLowCaptation && showResults && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border-l-4 border-red-500 text-red-700 animate-pulse">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="font-bold text-sm">Capta\u00e7\u00e3o durante as obras abaixo de {MIN_CAPTATION_PCT}% n\u00e3o \u00e9 permitida!</span>
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
                <div><p className="text-white/60 text-xs mb-1">Valor do Im\u00f3vel</p><p className="text-xl font-bold">{formatBRL(propertyValue)}</p></div>
                <div><p className="text-white/60 text-xs mb-1">Valor com Desconto</p><p className="text-xl font-bold">{formatBRL(result.finalPropertyValue)}</p></div>
              </div>
              <div className="mt-4">
                <div className="w-full h-3 rounded-full bg-white/20 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${result.captationPercent >= 50 ? "bg-emerald-400" : result.isLowCaptation ? "bg-red-400" : "bg-amber-400"}`} style={{ width: `${Math.min(result.captationPercent, 100)}%` }} />
                </div>
                <p className="text-white/60 text-xs mt-2 text-center">Capta\u00e7\u00e3o durante obras: <span className="text-white font-bold">{result.captationPercent.toFixed(2)}%</span></p>
              </div>

              {inccMode !== "none" && result.inccAccumulatedPercent > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/25">
                  <p className="text-amber-200 text-xs font-semibold uppercase tracking-wider mb-1">Corre\u00e7\u00e3o INCC</p>
                  <p className="text-white text-sm font-medium">
                    Habite-se projetado: <span className="font-bold text-amber-200">{formatBRL(result.habiteseCorrected)}</span>
                  </p>
                  <p className="text-amber-200/70 text-xs mt-0.5">
                    +{formatBRL(result.habiteseCorrected - result.habiteseAmount)} ({result.inccAccumulatedPercent.toFixed(2)}% acumulado)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <Calculator className="w-5 h-5" />
                    <h3 className="font-semibold">Detalhamento do Fluxo de Pagamento</h3>
                  </div>
                  {showResults && propertyValue > 0 && (
                    <button onClick={generatePDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors">
                      <FileDown className="w-3.5 h-3.5" /> PDF
                    </button>
                  )}
                </div>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-900 text-white">
                        <th className="text-left py-3 px-4 rounded-tl-lg font-semibold text-xs uppercase tracking-wider">Descri\u00e7\u00e3o</th>
                        <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider">Valor (R$)</th>
                        <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider">Percentual</th>
                        <th className="text-left py-3 px-4 rounded-tr-lg font-semibold text-xs uppercase tracking-wider">Observa\u00e7\u00e3o</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100"><td className="py-3 px-4 font-medium">Sinal</td><td className="py-3 px-4 text-right font-semibold">{formatBRL(result.downPaymentValue)}</td><td className="py-3 px-4 text-right text-gray-500">{result.downPaymentPercent.toFixed(2)}%</td><td className="py-3 px-4 text-gray-400 text-xs">Pagamento \u00e0 vista</td></tr>
                      <tr className="border-b border-gray-100"><td className="py-3 px-4 font-medium">Mensais (obra)</td><td className="py-3 px-4 text-right font-semibold">{formatBRL(result.monthlyPaidDuringConstruction)}</td><td className="py-3 px-4 text-right text-gray-500">{result.monthlyPaidPercent.toFixed(2)}%</td><td className="py-3 px-4 text-gray-400 text-xs">{result.paidMonthlyCount}x de {MAX_MONTHLY_INSTALLMENTS}</td></tr>
                      <tr className="border-b border-gray-100"><td className="py-3 px-4 font-medium">Semestrais (obra)</td><td className="py-3 px-4 text-right font-semibold">{formatBRL(result.semesterPaidDuringConstruction)}</td><td className="py-3 px-4 text-right text-gray-500">{result.semesterPaidPercent.toFixed(2)}%</td><td className="py-3 px-4 text-gray-400 text-xs">{result.paidSemesterCount}x de {MAX_SEMESTER_INSTALLMENTS}</td></tr>
                      {result.remainingMonthlyCount > 0 && (
                        <tr className="border-b border-gray-100 bg-amber-50/50"><td className="py-3 px-4 font-medium text-amber-700">Mensais (p\u00f3s habite-se)</td><td className="py-3 px-4 text-right font-semibold text-amber-700">{formatBRL(result.remainingMonthlyValue)}</td><td className="py-3 px-4 text-right text-gray-500">&mdash;</td><td className="py-3 px-4 text-amber-600 text-xs">{result.remainingMonthlyCount} parcelas remanescentes</td></tr>
                      )}
                      {result.remainingSemesterCount > 0 && (
                        <tr className="border-b border-gray-100 bg-amber-50/50"><td className="py-3 px-4 font-medium text-amber-700">Semestrais (p\u00f3s habite-se)</td><td className="py-3 px-4 text-right font-semibold text-amber-700">{formatBRL(result.remainingSemesterValue)}</td><td className="py-3 px-4 text-right text-gray-500">&mdash;</td><td className="py-3 px-4 text-amber-600 text-xs">{result.remainingSemesterCount} parcelas remanescentes</td></tr>
                      )}
                      <tr className="border-b border-gray-100 bg-gray-50"><td className="py-3 px-4 font-bold">Habite-se</td><td className="py-3 px-4 text-right font-bold">{formatBRL(result.habiteseAmount)}</td><td className="py-3 px-4 text-right text-gray-500">{result.habitesePercent.toFixed(2)}%</td><td className="py-3 px-4 text-gray-400 text-xs">Saldo devedor p\u00f3s-obra</td></tr>
                      {inccMode !== "none" && result.inccAccumulatedPercent > 0 && (
                        <tr className="border-b border-gray-100 bg-orange-50"><td className="py-3 px-4 font-bold text-orange-700">Habite-se (INCC)</td><td className="py-3 px-4 text-right font-bold text-orange-700">{formatBRL(result.habiteseCorrected)}</td><td className="py-3 px-4 text-right text-gray-500">{((result.habiteseCorrected / result.finalPropertyValue) * 100).toFixed(2)}%</td><td className="py-3 px-4 text-orange-600 text-xs">Proje\u00e7\u00e3o com corre\u00e7\u00e3o</td></tr>
                      )}
                      <tr className="bg-gray-900 text-white"><td className="py-3 px-4 rounded-bl-lg font-bold">Total</td><td className="py-3 px-4 text-right font-bold">{formatBRL(result.finalPropertyValue)}</td><td className="py-3 px-4 text-right font-bold">100%</td><td className="py-3 px-4 rounded-br-lg text-white/60 text-xs"></td></tr>
                    </tbody>
                  </table>
                </div>

                {/* Tabs for schedules */}
                {showResults && propertyValue > 0 && (
                  <div className="mt-6">
                    <div className="flex border-b border-gray-200">
                      {[
                        { key: "sinal", label: "Sinal" },
                        { key: "mensal", label: `Mensais (${result.monthlyRows.length})` },
                        { key: "semestral", label: `Semestrais (${result.semesterRows.length})` },
                        { key: "habitese", label: "Habite-se" },
                      ].map((tab) => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
                          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.key ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 max-h-80 overflow-y-auto">
                      {activeTab === "sinal" && (
                        <table className="w-full text-sm">
                          <thead><tr className="bg-gray-100"><th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Parcela</th><th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Data</th><th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Valor</th></tr></thead>
                          <tbody>{result.sinalRows.map((r, i) => <tr key={i} className="border-b border-gray-50"><td className="py-2 px-3">{r.parcela}</td><td className="py-2 px-3 text-gray-500">{r.data}</td><td className="py-2 px-3 text-right font-medium">{r.valor}</td></tr>)}</tbody>
                        </table>
                      )}

                      {activeTab === "mensal" && result.monthlyRows.length > 0 && (
                        <table className="w-full text-sm">
                          <thead><tr className="bg-gray-100"><th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Parcela</th><th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Data</th><th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Valor</th></tr></thead>
                          <tbody>{result.monthlyRows.map((r, i) => <tr key={i} className="border-b border-gray-50"><td className="py-2 px-3">{r.parcela}</td><td className="py-2 px-3 text-gray-500">{r.data}</td><td className="py-2 px-3 text-right font-medium">{r.valor}</td></tr>)}</tbody>
                          <tfoot><tr className="bg-gray-50 font-bold"><td className="py-2 px-3" colSpan={2}>Total mensais (obra)</td><td className="py-2 px-3 text-right">{formatBRL(result.monthlyPaidDuringConstruction)}</td></tr></tfoot>
                        </table>
                      )}
                      {activeTab === "mensal" && result.monthlyRows.length === 0 && <p className="text-gray-400 text-sm py-4 text-center">Nenhuma parcela mensal durante a obra</p>}

                      {activeTab === "semestral" && result.semesterRows.length > 0 && (
                        <table className="w-full text-sm">
                          <thead><tr className="bg-gray-100"><th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Parcela</th><th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Data</th><th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Valor</th></tr></thead>
                          <tbody>{result.semesterRows.map((r, i) => <tr key={i} className="border-b border-gray-50"><td className="py-2 px-3">{r.parcela}</td><td className="py-2 px-3 text-gray-500">{r.data}</td><td className="py-2 px-3 text-right font-medium">{r.valor}</td></tr>)}</tbody>
                          <tfoot><tr className="bg-gray-50 font-bold"><td className="py-2 px-3" colSpan={2}>Total semestrais (obra)</td><td className="py-2 px-3 text-right">{formatBRL(result.semesterPaidDuringConstruction)}</td></tr></tfoot>
                        </table>
                      )}
                      {activeTab === "semestral" && result.semesterRows.length === 0 && <p className="text-gray-400 text-sm py-4 text-center">Nenhuma parcela semestral durante a obra</p>}

                      {activeTab === "habitese" && (
                        <div className="space-y-3">
                          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                            <h4 className="font-semibold text-gray-900 mb-3">Composi\u00e7\u00e3o do Habite-se</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm"><span className="text-gray-600">Saldo devedor total</span><span className="font-semibold">{formatBRL(result.habiteseAmount)}</span></div>
                              {result.remainingMonthlyCount > 0 && (
                                <div className="flex justify-between text-sm pl-4 border-l-2 border-amber-300"><span className="text-gray-500">{result.remainingMonthlyCount}x mensais remanescentes</span><span className="font-medium text-amber-700">{formatBRL(result.remainingMonthlyValue)}</span></div>
                              )}
                              {result.remainingSemesterCount > 0 && (
                                <div className="flex justify-between text-sm pl-4 border-l-2 border-amber-300"><span className="text-gray-500">{result.remainingSemesterCount}x semestrais remanescentes</span><span className="font-medium text-amber-700">{formatBRL(result.remainingSemesterValue)}</span></div>
                              )}
                              {(() => {
                                const saldoResidual = result.habiteseAmount - result.remainingMonthlyValue - result.remainingSemesterValue;
                                if (saldoResidual > 0) return (
                                  <div className="flex justify-between text-sm pl-4 border-l-2 border-gray-300"><span className="text-gray-500">Saldo residual</span><span className="font-medium">{formatBRL(saldoResidual)}</span></div>
                                );
                                return null;
                              })()}
                            </div>
                          </div>
                          {inccMode !== "none" && result.inccAccumulatedPercent > 0 && (
                            <div className="p-4 rounded-xl bg-orange-50 border border-orange-200">
                              <h4 className="font-semibold text-orange-700 mb-2">Proje\u00e7\u00e3o INCC</h4>
                              <div className="flex justify-between text-sm"><span className="text-gray-600">Habite-se projetado</span><span className="font-bold text-orange-700">{formatBRL(result.habiteseCorrected)}</span></div>
                              <div className="flex justify-between text-sm mt-1"><span className="text-gray-500">Impacto estimado</span><span className="font-medium text-orange-600">+{formatBRL(result.habiteseCorrected - result.habiteseAmount)}</span></div>
                              <p className="text-[10px] text-orange-500 mt-2">* Valores estimados. O INCC \u00e9 vari\u00e1vel e n\u00e3o pode ser previsto com certeza.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SimuladorVittaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full"></div></div>}>
      <SimulatorContent />
    </Suspense>
  );
}