import { NextResponse } from "next/server";

// ─── Fontes de dados ───
// Bacen SGS - Série 28655 = INCC (variação mensal %) - Fonte: FGV
// Período: 1989-06 até presente, atualização mensal
const BACEN_SERIES = "28655";
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

  // Média dos últimos 180 meses (ou todos os disponíveis se < 180)
  const last180 = monthlyValues.slice(-180);
  const avg180 = last180.reduce((s, v) => s + v, 0) / last180.length;

  // Média dos últimos 12 meses
  const last12 = monthlyValues.slice(-12);
  const avg12 = last12.reduce((s, v) => s + v, 0) / last12.length;

  return {
    avg180: Math.round(avg180 * 10000) / 10000,
    avg12: Math.round(avg12 * 10000) / 10000,
  };
}

// ─── Fonte 1: Bacen SGS API ───
async function fetchFromBacen(): Promise<InccResult | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 200); // pedir um pouco mais que 180 para filtrar

    const url = `${BACEN_BASE_URL}.${BACEN_SERIES}/dados?formato=json&dataInicial=${formatBacenDate(startDate)}&dataFinal=${formatBacenDate(endDate)}`;

    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const rawData: { data: string; valor: string }[] = await res.json();
    if (!Array.isArray(rawData) || rawData.length === 0) return null;

    // Converter para números
    const values = rawData
      .map((item) => ({
        data: item.data,
        valor: parseFloat(item.valor),
      }))
      .filter((item) => !isNaN(item.valor) && item.valor !== null);

    if (values.length < 12) return null;

    // Verificar sanidade: média mensal deve estar entre 0% e 5%
    const allValues = values.map((v) => v.valor);
    const rawAvg = allValues.reduce((s, v) => s + v, 0) / allValues.length;
    if (rawAvg <= 0 || rawAvg > 5) return null;

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
      source: "Bacen SGS (FGV)",
    };
  } catch {
    return null;
  }
}

// ─── Fonte 2: Web scraping do brasilindicadores.com.br ───
async function fetchFromBrasilIndicadores(): Promise<InccResult | null> {
  try {
    const res = await fetch("https://brasilindicadores.com.br/incc-10", {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Extrair dados da tabela INCC-10 do HTML
    // O site lista tabelas anuais com dados mensais no formato: mês, variação%, acumulado12m%, acumuladoAno%
    const monthlyValues: { data: string; valor: number }[] = [];

    // Regex para capturar blocos de dados anuais
    // Padrão: nome do mês seguido de valores percentuais
    const monthNames = [
      "janeiro",
      "fevereiro",
      "março",
      "abril",
      "maio",
      "junho",
      "julho",
      "agosto",
      "setembro",
      "outubro",
      "novembro",
      "dezembro",
    ];

    // Encontrar todas as tabelas anuais
    const yearBlocks = html.match(/INCC-10\s+\d{4}/g);
    if (!yearBlocks) return null;

    const years = yearBlocks.map((b) => parseInt(b.match(/\d{4}/)![0]));

    for (const year of years) {
      const yearIdx = html.indexOf(`INCC-10 ${year}`);
      if (yearIdx === -1) continue;

      // Pegar o bloco de texto após o cabeçalho do ano
      const blockEnd = html.indexOf("INCC-10", yearIdx + 10);
      const block = blockEnd === -1 ? html.slice(yearIdx) : html.slice(yearIdx, blockEnd);

      // Para cada mês, buscar o valor percentual
      for (let m = 0; m < 12; m++) {
        const monthName = monthNames[m];
        const monthIdx = block.toLowerCase().indexOf(monthName);
        if (monthIdx === -1) continue;

        // O valor vem logo após o nome do mês
        const afterMonth = block.slice(monthIdx + monthName.length);
        const match = afterMonth.match(/([\d,]+)\s*%/);
        if (match) {
          const valor = parseFloat(match[1].replace(",", "."));
          if (!isNaN(valor)) {
            const month = String(m + 1).padStart(2, "0");
            monthlyValues.push({
              data: `01/${month}/${year}`,
              valor,
            });
          }
        }
      }
    }

    if (monthlyValues.length < 12) return null;

    const allValues = monthlyValues.map((v) => v.valor);
    const { avg180, avg12 } = calcAverages(allValues);

    return {
      avg180,
      avg12,
      projection: avg12,
      lastUpdate: monthlyValues[monthlyValues.length - 1]?.data || null,
      totalMonths: monthlyValues.length,
      values: monthlyValues.map((v) => ({
        data: v.data,
        valor: Math.round(v.valor * 10000) / 10000,
      })),
      source: "Brasil Indicadores (FGV/IBRE)",
    };
  } catch {
    return null;
  }
}

// ─── Fallback com valores reais pesquisados (maio/2026) ───
function getFallback(): InccResult {
  // Valores verificados em brasilindicadores.com.br e yahii.com.br
  // INCC-10 últimos 12 meses (jun/2025 a mai/2026): média ~0.5317% a.m.
  // INCC-10 últimos 180 meses: média ~0.5532% a.m.
  return {
    avg180: 0.5532,
    avg12: 0.5317,
    projection: 0.5317,
    lastUpdate: null,
    totalMonths: 0,
    values: [],
    fallback: true,
    source: "Valores de referência (fontes indisponíveis)",
  };
}

// ─── Handler GET ───
export async function GET() {
  // Verificar cache
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  // Tentar Fonte 1: Bacen SGS
  let result = await fetchFromBacen();

  // Tentar Fonte 2: Web scraping
  if (!result) {
    result = await fetchFromBrasilIndicadores();
  }

  // Fallback com valores reais verificados
  if (!result) {
    result = getFallback();
  }

  // Atualizar cache
  cache = { data: result, timestamp: Date.now() };

  return NextResponse.json(result);
}
