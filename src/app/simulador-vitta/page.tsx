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
const DELIVERY_MONTH = 7; // August (0-indexed: 0=Jan, 7=Aug)
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
  unicaValue: number;
  unicaPercent: number;
  unicaDate: string;
  habiteseAmount: number;
  habitesePercent: number;
  captationPercent: number;
  sinalRows: InstallmentRow[];
  monthlyRows: InstallmentRow[];
  semesterRows: InstallmentRow[];
  unicaScheduleRows: InstallmentRow[];
  isLowCaptation: boolean;
  inccMonthlyRate: number;
  inccCorrectionFactor: number;
  inccAccumulatedPercent: number;
  inccMode: string;
  habiteseCorrected: number;
  monthlyRemainingCorrected: number;
  semesterRemainingCorrected: number;
  habiteseBalanceCorrected: number;
  totalMonthlyCommitted: number;
  totalMonthlyCommittedPercent: number;
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
  const [unicaValueInput, setUnicaValueInput] = useState("");
  const [activeTab, setActiveTab] = useState<"sinal" | "mensal" | "semestral" | "unica" | "habitese">("sinal");
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
  const unicaManual = parseVal(unicaValueInput);
  const discount = parseFloat(discountPercent) || 0;
  const finalPropertyValue = propertyValue * (1 - discount / 100);
  const downPaymentValue = downPaymentManual > 0 ? downPaymentManual : finalPropertyValue * 0.06;
  const unicaValue = unicaManual > 0 ? unicaManual : finalPropertyValue * 0.05;

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

    // Quantas parcelas cabem durante a obra vs ficam para o financiamento
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
    const unicaScheduleRows: InstallmentRow[] = [];

    // Parcela única: mês de entrega
    const unicaMonth = totalMonthsUntilDelivery + 1;
    const unicaDate = totalMonthsUntilDelivery > 0 ? addMonthsToDate(dpDate, unicaMonth) : dpDate;
    const inccFactorUnica = inccMonthlyRate > 0 && unicaMonth > 0 ? Math.pow(1 + inccMonthlyRate / 100, unicaMonth) : 1;
    if (unicaValue > 0) {
      unicaScheduleRows.push({
        parcela: "1/1",
        data: formatDateBR(unicaDate),
        valor: formatBRL(unicaValue * inccFactorUnica),
      });
    }
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

    const totalMonthlyCommitted = (paidMonthlyCount + remainingMonthlyCount) * monthlyVal;
    const totalCaptation = downPaymentValue + totalMonthlyCommitted + semesterPaidDuringConstruction + unicaValue;
    const captPct = finalPropertyValue > 0 ? (totalCaptation / finalPropertyValue) * 100 : 0;

    // Habite-se = saldo devedor pós-obra
    const habitese = Math.max(0, finalPropertyValue - totalCaptation);

    // ── Fase 2: Aplicar correção INCC aos saldos remanescentes ──
    // Remaining monthly is now captação, not financing. Only semester remaining + residual go to financing.
    const saldoResidual = habitese - remainingSemesterValue;
    // Nota: a parcela única é durante a obra, então NÃO entra no financiamento
    // Nota: parcelas mensais remanescentes compõem a captação, NÃO entram no financiamento
    const monthlyRemainingCorrected = 0;
    const semesterRemainingCorrected = remainingSemesterValue * inccCorrectionFactor;
    const habiteseBalanceCorrected = Math.max(0, saldoResidual) * inccCorrectionFactor;
    const habiteseCorrected = semesterRemainingCorrected + habiteseBalanceCorrected;

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
      totalMonthlyCommitted,
      totalMonthlyCommittedPercent: finalPropertyValue > 0 ? (totalMonthlyCommitted / finalPropertyValue) * 100 : 0,
      semesterPaidDuringConstruction,
      semesterPaidPercent: finalPropertyValue > 0 ? (semesterPaidDuringConstruction / finalPropertyValue) * 100 : 0,
      remainingMonthlyValue,
      remainingSemesterValue,
      habiteseAmount: habitese,
      habitesePercent: finalPropertyValue > 0 ? (habitese / finalPropertyValue) * 100 : 0,
      captationPercent: captPct,
      unicaValue: unicaValue,
      unicaPercent: finalPropertyValue > 0 ? (unicaValue / finalPropertyValue) * 100 : 0,
      unicaDate: formatDateBR(unicaDate),
      sinalRows,
      monthlyRows,
      semesterRows,
      unicaScheduleRows,
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
  }, [propertyValue, discount, downPaymentValue, downPaymentDate, monthlyVal, semesterVal, unicaValue, finalPropertyValue, inccMonthlyRate, inccMode]);

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
    setUnicaValueInput("");
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
    doc.text("Simulação de Fluxo de Pagamento", margin, 30);
    const today = new Date().toLocaleDateString("pt-BR");
    doc.setFontSize(10);
    doc.text(`Gerado em: ${today}`, pageWidth - margin - 30, 30, { align: "right" });
    yPos = 50;

    // Info table
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
        ["Entrega Prevista", "Agosto de 2029"],
        ["Máx. Mensais Contratadas", `${MAX_MONTHLY_INSTALLMENTS} parcelas`],
        ["Máx. Semestrais Contratadas", `${MAX_SEMESTER_INSTALLMENTS} parcelas`],
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
      ["Sinal", formatBRL(result.downPaymentValue), `${result.downPaymentPercent.toFixed(2)}%`, "Pagamento à vista"],
      [`Mensais (captação)`, formatBRL(result.totalMonthlyCommitted), `${result.totalMonthlyCommittedPercent.toFixed(2)}%`, `${MAX_MONTHLY_INSTALLMENTS} parcelas (${result.paidMonthlyCount} durante a obra + ${result.remainingMonthlyCount} pós-entrega)`],
      [`Semestrais (obra)`, formatBRL(result.semesterPaidDuringConstruction), `${result.semesterPaidPercent.toFixed(2)}%`, `${result.paidSemesterCount} parcelas durante a obra`],
    ];

    if (result.unicaValue > 0) {
      summaryBody.push(["Única (mês de entrega)", formatBRL(result.unicaValue), `${result.unicaPercent.toFixed(2)}%`, `1 parcela em ${result.unicaDate}`]);
    }


    if (result.remainingSemesterCount > 0) {
      summaryBody.push([`Semestrais (pós financiamento)`, formatBRL(result.remainingSemesterValue), "—", `${result.remainingSemesterCount} parcelas remanescentes`]);
    }

    summaryBody.push(["Financiamento", formatBRL(result.habiteseAmount), `${result.habitesePercent.toFixed(2)}%`, "Saldo devedor pós-obra"]);

    if (inccMode !== "none" && result.inccAccumulatedPercent > 0) {
      summaryBody.push(["Financiamento (projeção INCC)", formatBRL(result.habiteseCorrected), `${((result.habiteseCorrected / result.finalPropertyValue) * 100).toFixed(2)}%`, "Valor projetado com correção"]);
    }

    summaryBody.push(["Total", formatBRL(result.finalPropertyValue), "100%", ""]);

    autoTable(doc, {
      startY: yPos,
      head: [["Etapa", "Valor", "%", "Observação"]],
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

    // Única schedule table (rendered after Mensais, before Semestrais)
    if (result.unicaScheduleRows.length > 0) {
      if (yPos > 220) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.text("Cronograma: Parcela Única", margin, yPos); yPos += 10;
      autoTable(doc, { startY: yPos, head: [["Parcela", "Data", "Valor"]], body: result.unicaScheduleRows.map((r) => [r.parcela, r.data, r.valor]), theme: "grid", headStyles: { fillColor: primaryColor, textColor: 255 }, margin: { top: 10, left: margin, right: margin } });
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
    doc.text("Detalhes do Financiamento", margin, yPos); yPos += 10;

    const habiteBody: (string | number)[][] = [
      ["Saldo Devedor Total (Financiamento)", formatBRL(result.habiteseAmount)],
    ];
    if (result.remainingSemesterCount > 0) {
      habiteBody.push([`  Parcelas semestrais remanescentes (${result.remainingSemesterCount}x)`, formatBRL(result.remainingSemesterValue)]);
    }
    const saldoResidual = result.habiteseAmount - result.remainingSemesterValue;
    if (saldoResidual > 0) {
      habiteBody.push(["  Saldo residual", formatBRL(saldoResidual)]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [["Descrição", "Valor"]],
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
      doc.text("Projeção de Correção INCC (Estimativa)", margin, yPos);
      yPos += 10;
      const inccMetricLabel = inccMode === "180m"
        ? "Média dos últimos 180 meses do INCC"
        : inccMode === "12m"
          ? "Média dos últimos 12 meses do INCC"
          : inccMode === "projection"
            ? "Projeção de mercado"
            : "N/A";
      const inccSourceLabel = inccData.isFallback
        ? "Dados de referência (valores estimados)"
        : "FGV IBRE";
      autoTable(doc, {
        startY: yPos,
        head: [["Descrição", "Valor"]],
        body: [
          ["Taxa Mensal Utilizada", `${inccMonthlyRate.toFixed(3)}% ao mês`],
          ["Métrica Utilizada", inccMetricLabel],
          ["Fonte dos Dados", inccSourceLabel],
          ["Período de Correção", `${result.totalMonthsUntilDelivery} meses`],
          ["Correção Acumulada", `${result.inccAccumulatedPercent.toFixed(2)}%`],
          ["Financiamento Original", formatBRL(result.habiteseAmount)],
          ["Financiamento Projetado", formatBRL(result.habiteseCorrected)],
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
        "AVISO: Os valores de correção INCC apresentados acima são meras projeções estimativas e não garantem o resultado final. O INCC é um índice variável cujos valores futuros não podem ser previstos com certeza. A taxa utilizada é baseada em dados históricos/projetados e poderá divergir significativamente do índice efetivamente apurado durante o período de obras. Consulte o contrato para as condições definitivas de reajuste.",
        pageWidth - margin * 2
      );
      doc.text(disclaimerLines, margin, yPos);
      yPos += disclaimerLines.length * 3.5 + 10;
    }

    // Notes
    if (yPos > 210) { doc.addPage(); yPos = 20; }
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
    doc.text("Observações Importantes", margin, yPos); yPos += 8;
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60);
    const notes = [
      "O sinal é pago à vista.",
      "As parcelas mensais começam no mês seguinte ao sinal.",
      "A parcela única é paga no mês de entrega do empreendimento.",
      "A primeira parcela semestral é 6 meses após o sinal.",
      `A construtora permite dividir as mensais em até ${MAX_MONTHLY_INSTALLMENTS} meses e as semestrais em até ${MAX_SEMESTER_INSTALLMENTS} semestrais.`,
      "Todas as parcelas mensais contratadas compõem a captação da obra, inclusive as remanescentes que são pagas após a entrega. O cliente pode pagá-las diretamente à construtora ou integrá-las ao financiamento bancário.",
      "As parcelas semestrais que não couberem até o mês de entrega são integradas ao saldo devedor pós financiamento.",
      "O saldo devedor no financiamento pode ser quitado ou financiado com o banco de preferência.",
      "Importante: Os saldos devedores de todas as parcelas serão corrigidos mensalmente pelo INCC (Índice Nacional de Custo da Construção) até o financiamento.",
      `Captação mínima: A captação durante as obras deve ser de no mínimo ${MIN_CAPTATION_PCT}% do valor do imóvel.`,
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
      doc.setFontSize(8); doc.setTextColor(150);
      doc.text(`Página ${i} de ${totalPages} - Residencial Vitta`, pageWidth / 2, pageHeight - 10, { align: "center" });
    }

    const fileName = `Simulação_Vitta_${(unitName || "unidade").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
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
          <p className="text-gray-500 mt-2">Residencial Vitta &mdash; Ceilândia, DF &mdash; Calcule o financiamento do seu imóvel</p>
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
          {/* Left Column - Inputs */}
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
                  <span><strong>Entrega Prevista:</strong> Agosto de 2029</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Valor do Imóvel (R$)</label>
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
                  <p className="text-[11px] text-gray-400 mt-1">Padrão: 6% do valor final do imóvel. Pagamento à vista.</p>
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
                        {result.paidMonthlyCount} parcelas durante a obra + {result.remainingMonthlyCount} pós-entrega (captação)
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
                        {result.paidSemesterCount} parcelas durante a obra + {result.remainingSemesterCount} para o financiamento
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Valor da Parcela Única (R$)</label>
                  <input type="text" value={unicaValueInput} onChange={handleCurrencyInput(setUnicaValueInput)} placeholder="Deixe em branco para 5% do valor final" className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all" />
                  <p className="text-[11px] text-gray-400 mt-1">Padrão: 5% do valor final do imóvel. Paga no mês de entrega. Compõe a captação da obra.</p>
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
                      <span className="font-semibold text-sm text-gray-700">Correção INCC</span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${inccMode !== "none" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                      {inccMode !== "none" ? "Ativada" : "Desativada"}
                    </span>
                  </button>

                  {inccMode !== "none" && (
                    <div className="pl-4 space-y-2">
                      <label className="block">
                        <input type="radio" name="incc" value="none" checked={inccMode === "none"} onChange={() => setInccMode("none")} className="mr-2" />
                        <span className="text-sm text-gray-600">Sem correção</span>
                      </label>
                      <label className="block">
                        <input type="radio" name="incc" value="180m" checked={inccMode === "180m"} onChange={() => setInccMode("180m")} className="mr-2" />
                        <span className="text-sm text-gray-600">Média últimos 180 meses{!inccData.loading ? ` (${inccData.avg180.toFixed(3)}% a.m.)` : " (carregando...)"}</span>
                      </label>
                      <label className="block">
                        <input type="radio" name="incc" value="12m" checked={inccMode === "12m"} onChange={() => setInccMode("12m")} className="mr-2" />
                        <span className="text-sm text-gray-600">Média últimos 12 meses{!inccData.loading ? ` (${inccData.avg12.toFixed(3)}% a.m.)` : " (carregando...)"}</span>
                      </label>
                      <label className="block">
                        <input type="radio" name="incc" value="projection" checked={inccMode === "projection"} onChange={() => setInccMode("projection")} className="mr-2" />
                        <span className="text-sm text-gray-600">Projeção de mercado{!inccData.loading ? ` (${inccData.projection.toFixed(3)}% a.m.)` : " (carregando...)"}</span>
                        {inccData.projectionSource && !inccData.loading && inccMode === "projection" && (
                          <p className="text-[10px] text-gray-400 ml-6 mt-0.5">{inccData.projectionSource}</p>
                        )}
                      </label>
                      {inccData.lastUpdate && (
                        <p className="text-[10px] text-gray-400">Dados atualizados em {inccData.lastUpdate} &mdash; {inccData.isFallback ? "valores de referência" : "fonte: FGV IBRE"}</p>
                      )}
                    </div>
                  )}
                </div>

                {result.isLowCaptation && showResults && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border-l-4 border-red-500 text-red-700 animate-pulse">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="font-bold text-sm">Captação durante as obras abaixo de {MIN_CAPTATION_PCT}% não é permitida!</span>
                  </div>
                )}

                <button onClick={clearAll} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all">
                  <Trash2 className="w-4 h-4" /> Limpar Todos os Campos
                </button>

                {showResults && (
                  <button
                    onClick={generatePDF}
                    className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors shadow-lg"
                  >
                    <FileDown className="w-4 h-4" />
                    Gerar PDF da Simulação
                  </button>
                )}
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
                    Financiamento projetado: <span className="font-bold text-amber-200">{formatBRL(result.habiteseCorrected)}</span>
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
                      <tr className="border-b border-gray-100"><td className="py-3 px-4 font-medium">Sinal</td><td className="py-3 px-4 text-right font-semibold">{formatBRL(result.downPaymentValue)}</td><td className="py-3 px-4 text-right text-gray-500">{result.downPaymentPercent.toFixed(2)}%</td><td className="py-3 px-4 text-gray-400 text-xs">Pagamento à vista</td></tr>
                      <tr className="border-b border-gray-100"><td className="py-3 px-4 font-medium">Mensais</td><td className="py-3 px-4 text-right font-semibold">{formatBRL(result.totalMonthlyCommitted)}</td><td className="py-3 px-4 text-right text-gray-500">{result.totalMonthlyCommittedPercent.toFixed(2)}%</td><td className="py-3 px-4 text-gray-400 text-xs">{MAX_MONTHLY_INSTALLMENTS} parcelas ({result.paidMonthlyCount} durante a obra + {result.remainingMonthlyCount} pós-entrega)</td></tr>
                      <tr className="border-b border-gray-100"><td className="py-3 px-4 font-medium">Semestrais (obra)</td><td className="py-3 px-4 text-right font-semibold">{formatBRL(result.semesterPaidDuringConstruction)}</td><td className="py-3 px-4 text-right text-gray-500">{result.semesterPaidPercent.toFixed(2)}%</td><td className="py-3 px-4 text-gray-400 text-xs">{result.paidSemesterCount}x de {MAX_SEMESTER_INSTALLMENTS}</td></tr>
                      {result.remainingMonthlyCount > 0 && (
                        <tr className="border-b border-gray-100 bg-blue-50/50"><td className="py-3 px-4 font-medium text-blue-700" colSpan={4}><div className="flex items-center gap-2"><Info className="w-4 h-4" /><span>As {result.remainingMonthlyCount} parcelas mensais remanescentes ({formatBRL(result.remainingMonthlyValue)}) compõem a captação e podem ser pagas diretamente à construtora após a entrega ou integradas ao financiamento bancário.</span></div></td></tr>
                      )}
                      {result.remainingSemesterCount > 0 && (
                        <tr className="border-b border-gray-100 bg-amber-50/50"><td className="py-3 px-4 font-medium text-amber-700">Semestrais (pós financiamento)</td><td className="py-3 px-4 text-right font-semibold text-amber-700">{formatBRL(result.remainingSemesterValue)}</td><td className="py-3 px-4 text-right text-gray-500">&mdash;</td><td className="py-3 px-4 text-amber-600 text-xs">{result.remainingSemesterCount} parcelas remanescentes</td></tr>
                      )}
                      {result.unicaValue > 0 && (
                        <tr className="border-b border-gray-100"><td className="py-3 px-4 font-medium text-blue-700">Única</td><td className="py-3 px-4 text-right font-semibold text-blue-700">{formatBRL(result.unicaValue)}</td><td className="py-3 px-4 text-right text-gray-500">{result.unicaPercent.toFixed(2)}%</td><td className="py-3 px-4 text-blue-600 text-xs">1 parcela em {result.unicaDate}</td></tr>
                      )}
                      <tr className="border-b border-gray-100 bg-gray-50"><td className="py-3 px-4 font-bold">Financiamento</td><td className="py-3 px-4 text-right font-bold">{formatBRL(result.habiteseAmount)}</td><td className="py-3 px-4 text-right text-gray-500">{result.habitesePercent.toFixed(2)}%</td><td className="py-3 px-4 text-gray-400 text-xs">Saldo devedor pós-obra</td></tr>
                      {inccMode !== "none" && result.inccAccumulatedPercent > 0 && (
                        <tr className="border-b border-gray-100 bg-orange-50"><td className="py-3 px-4 font-bold text-orange-700">Financiamento (INCC)</td><td className="py-3 px-4 text-right font-bold text-orange-700">{formatBRL(result.habiteseCorrected)}</td><td className="py-3 px-4 text-right text-gray-500">{((result.habiteseCorrected / result.finalPropertyValue) * 100).toFixed(2)}%</td><td className="py-3 px-4 text-orange-600 text-xs">Projeção com correção</td></tr>
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
                        { key: "unica", label: `Única${result.unicaScheduleRows.length > 0 ? ` (${result.unicaScheduleRows.length})` : ""}` },
                        { key: "habitese", label: "Financiamento" },
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

                      {activeTab === "unica" && result.unicaScheduleRows.length > 0 && (
                        <div className="space-y-3">
                          <table className="w-full text-sm">
                            <thead><tr className="bg-gray-100"><th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Parcela</th><th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Data</th><th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Valor</th></tr></thead>
                            <tbody>{result.unicaScheduleRows.map((r, i) => <tr key={i} className="border-b border-gray-50"><td className="py-2 px-3">{r.parcela}</td><td className="py-2 px-3 text-gray-500">{r.data}</td><td className="py-2 px-3 text-right font-medium">{r.valor}</td></tr>)}</tbody>
                            <tfoot><tr className="bg-gray-50 font-bold"><td className="py-2 px-3" colSpan={2}>Total parcela única</td><td className="py-2 px-3 text-right">{formatBRL(result.unicaValue)}</td></tr></tfoot>
                          </table>
                          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border-l-4 border-blue-500 text-blue-700 text-xs">
                            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>Paga no mês de entrega do empreendimento. Este valor compõe o percentual de captação durante as obras.</span>
                          </div>
                        </div>
                      )}
                      {activeTab === "unica" && result.unicaScheduleRows.length === 0 && <p className="text-gray-400 text-sm py-4 text-center">Nenhuma parcela única informada</p>}

                      {activeTab === "habitese" && (
                        <div className="space-y-3">
                          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                            <h4 className="font-semibold text-gray-900 mb-3">Composição do Financiamento</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm"><span className="text-gray-600">Saldo devedor total</span><span className="font-semibold">{formatBRL(result.habiteseAmount)}</span></div>
                              {result.remainingSemesterCount > 0 && (
                                <div className="flex justify-between text-sm pl-4 border-l-2 border-amber-300"><span className="text-gray-500">{result.remainingSemesterCount}x semestrais remanescentes</span><span className="font-medium text-amber-700">{formatBRL(result.remainingSemesterValue)}</span></div>
                              )}
                              {(() => { const sr = result.habiteseAmount - result.remainingSemesterValue; return sr > 0 ? (
                                  <div className="flex justify-between text-sm pl-4 border-l-2 border-gray-300"><span className="text-gray-500">Saldo residual</span><span className="font-medium">{formatBRL(sr)}</span></div>
                              ) : null; })()}
                            </div>
                          </div>
                          {result.remainingMonthlyCount > 0 && (
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border-l-4 border-blue-500 text-blue-700 text-xs">
                              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span>As {result.remainingMonthlyCount} parcelas mensais remanescentes ({formatBRL(result.remainingMonthlyValue)}) compõem a captação da obra. O cliente pode optar por pagá-las diretamente à construtora após a entrega do empreendimento ou integrar esse saldo ao financiamento bancário, conforme sua renda permita.</span>
                            </div>
                          )}
                          {inccMode !== "none" && result.inccAccumulatedPercent > 0 && (
                            <div className="p-4 rounded-xl bg-orange-50 border border-orange-200">
                              <h4 className="font-semibold text-orange-700 mb-2">Projeção INCC</h4>
                              <div className="flex justify-between text-sm"><span className="text-gray-600">Financiamento projetado</span><span className="font-bold text-orange-700">{formatBRL(result.habiteseCorrected)}</span></div>
                              <div className="flex justify-between text-sm mt-1"><span className="text-gray-500">Impacto estimado</span><span className="font-medium text-orange-600">+{formatBRL(result.habiteseCorrected - result.habiteseAmount)}</span></div>
                              <p className="text-[10px] text-orange-500 mt-2">* Valores estimados. O INCC é variável e não pode ser previsto com certeza.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {showResults && propertyValue > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-gray-600">
                  <strong className="text-gray-800">Observação:</strong> O valor do Financiamento inclui:
                  <ul className="mt-2 space-y-1 list-disc list-inside text-gray-500">
                    <li>Parcelas semestrais restantes</li>
                    <li>Saldo final do imóvel</li>
                  </ul>
                  <p className="mt-2 text-blue-700 text-xs font-medium">Todas as parcelas mensais contratadas (incluindo as remanescentes pós-entrega) compõem a captação da obra e não são incluídas no saldo devedor do financiamento.</p>
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