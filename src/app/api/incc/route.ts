import { NextResponse } from "next/server";

// ─── Fontes de dados ───
// Bacen SGS - Série 10844 = INCC-M (Índice Nacional de Custo da Construção - Mensal)
// Fonte: FGV IBRE | Período: 1990-01 até presente | Atualização mensal
// Esta é a série oficial mais utilizada para reajuste de contratos de construção civil.
// Série 22589 (INCC-10) também existe mas frequentemente indisponível na API do Bacen.
const BACEN_SERIES = "10844";
const BACEN_BASE_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

// ─── Cache ───
interface InccResult {
  avg180: number;
  avg12: number;
  projection: number;
  lastUpdate: string | null;
  totalMonths: number;
  values: { data: string; valor: number }[];
  source?: string;
  fallback?: boolean;
}

let cache: { data: InccResult | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

function formatBacenDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ─── Helpers de cálculo ───
function calcAverages(monthlyValues: number[]) {
  if (monthlyValues.length === 0) return { avg180: 0, avg12: 0 };

  // Média simples dos últimos 180 meses (ou todos os disponíveis se < 180)
  const last180 = monthlyValues.slice(-180);
  const avg180 = last180.reduce((s, v) => s + v, 0) / last180.length;

  // Média simples dos últimos 12 meses
  const last12 = monthlyValues.slice(-12);
  const avg12 = last12.reduce((s, v) => s + v, 0) / last12.length;

  return {
    avg180: Math.round(avg180 * 10000) / 10000,
    avg12: Math.round(avg12 * 10000) / 10000,
  };
}

// ─── Fonte principal: Bacen SGS API (série 10844 - INCC-M) ───
async function fetchFromBacen(): Promise<InccResult | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 200); // pedir um pouco mais que 180 para garantir margem

    const url = `${BACEN_BASE_URL}.${BACEN_SERIES}/dados?formato=json&dataInicial=${formatBacenDate(startDate)}&dataFinal=${formatBacenDate(endDate)}`;

    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const rawData: { data: string; valor: string }[] = await res.json();
    if (!Array.isArray(rawData) || rawData.length === 0) return null;

    // Converter para números (valores já vêm como "0.40" - ponto decimal)
    const values = rawData
      .map((item) => ({
        data: item.data,
        valor: parseFloat(item.valor),
      }))
      .filter((item) => !isNaN(item.valor) && item.valor !== null);

    if (values.length < 12) return null;

    // Verificar sanidade dos dados INCC-M:
    // - Média mensal típica do INCC-M: entre 0.1% e 1.5%
    // - Valores individuais mensais: entre -1% e 3% (raro mas possível)
    const allValues = values.map((v) => v.valor);
    const rawAvg = allValues.reduce((s, v) => s + v, 0) / allValues.length;
    if (rawAvg < 0.01 || rawAvg > 5) return null; // fora da faixa razoável para INCC

    const { avg180, avg12 } = calcAverages(allValues);

    return {
      avg180,
      avg12,
      projection: avg12,
      lastUpdate: values[values.length - 1]?.data || null,
      totalMonths: values.length,
      values: values.map((v) => ({
        data: v.data,
        valor: Math.round(v.valor * 10000) / 10000,
      })),
      source: "Bacen SGS — INCC-M (FGV IBRE)",
    };
  } catch {
    return null;
  }
}

// ─── Fallback com valores verificados diretamente da API do Bacen (maio/2026) ───
function getFallback(): InccResult {
  // Valores calculados a partir da série 10844 do Bacen SGS em 19/05/2026:
  // Últimos 12 meses (mai/2025 – abr/2026): média = 0.4667% a.m.
  // Últimos 180 meses (jun/2011 – abr/2026): média = 0.4855% a.m.
  return {
    avg180: 0.4855,
    avg12: 0.4667,
    projection: 0.4667,
    lastUpdate: null,
    totalMonths: 0,
    values: [],
    fallback: true,
    source: "Valores de referência INCC-M — Bacen SGS série 10844",
  };
}

// ─── Handler GET ───
export async function GET() {
  // Verificar cache
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  // Tentar fonte principal: Bacen SGS (INCC-M)
  let result = await fetchFromBacen();

  // Fallback com valores verificados
  if (!result) {
    result = getFallback();
  }

  // Atualizar cache
  cache = { data: result, timestamp: Date.now() };

  return NextResponse.json(result);
}
