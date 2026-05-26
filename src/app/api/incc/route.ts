import { NextResponse } from "next/server";

// ─── Fontes de dados INCC ───
// O Bacen SGS NÃO disponibiliza INCC-M (variação mensal).
// Série 192 = INCC-DI (Índice Nacional de Custo da Construção – Disponibilidade Interna)
// Fonte: FGV IBRE | Período: jan/1990 até presente | Atualização mensal
// INCC-DI acompanha de perto o INCC-M e é o único INCC disponível na API do Bacen.
const BACEN_SERIES_DI = "192";
const BACEN_BASE_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

// brasilindicadores.com.br publica INCC-M (FGV) via tabela HTML acessível por AJAX.
const BRASIL_INDICADORES_URL =
  "https://brasilindicadores.com.br/incc-m?handler=HistoricoValoresIndicadorPartial";

// ─── Cache ───
interface InccResult {
  avg180: number;
  avg12: number;
  projection: number;
  lastUpdate: string | null;
  totalMonths: number;
  values: { data: string; valor: number }[];
  source: string;
  indicator: string; // "INCC-M" ou "INCC-DI"
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

  const last180 = monthlyValues.slice(-180);
  const avg180 = last180.reduce((s, v) => s + v, 0) / last180.length;

  const last12 = monthlyValues.slice(-12);
  const avg12 = last12.reduce((s, v) => s + v, 0) / last12.length;

  return {
    avg180: Math.round(avg180 * 10000) / 10000,
    avg12: Math.round(avg12 * 10000) / 10000,
  };
}

// ─── Fonte 1 (principal): INCC-M via brasilindicadores.com.br ───
// Retorna os valores oficiais do INCC-M publicados pela FGV IBRE.
// Estrutura: tabela HTML com linhas por ano e colunas por mês (jan..dez + acumulado).
async function fetchINCCmFromBrasilIndicadores(): Promise<InccResult | null> {
  try {
    const res = await fetch(BRASIL_INDICADORES_URL, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Extrair linhas da tabela: cada <tr> tem um ano e 13 colunas (jan-dez + anual)
    const rows = html.match(/<tr[^>]*>(.*?)<\/tr>/gis);
    if (!rows || rows.length === 0) return null;

    interface MonthlyEntry {
      date: Date;
      data: string;
      valor: number;
    }

    const monthlyEntries: MonthlyEntry[] = [];

    for (const row of rows) {
      const cells = row.match(/<td[^>]*>(.*?)<\/td>/gis);
      if (!cells || cells.length < 2) continue;

      // Limpar HTML das células
      const cleanCells = cells.map((c) =>
        c.replace(/<[^>]+>/g, "").trim()
      );

      // Primeira célula = ano
      const yearStr = cleanCells[0];
      if (!/^\d{4}$/.test(yearStr)) continue;

      const year = parseInt(yearStr, 10);

      // Colunas 1-12 = variação mensal de jan a dez
      for (let m = 0; m < 12; m++) {
        const valStr = cleanCells[m + 1]
          ?.replace("%", "")
          .replace(",", ".")
          .trim();

        if (!valStr || valStr === "") continue;

        const valor = parseFloat(valStr);
        if (isNaN(valor)) continue;

        monthlyEntries.push({
          date: new Date(year, m, 1),
          data: `01/${String(m + 1).padStart(2, "0")}/${year}`,
          valor,
        });
      }
    }

    if (monthlyEntries.length < 12) return null;

    // Ordenar cronologicamente (mais antigo primeiro)
    monthlyEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Filtrar apenas a partir de 2011 (180 meses = 15 anos)
    const since2011 = monthlyEntries.filter(
      (e) => e.date >= new Date(2011, 0, 1)
    );
    if (since2011.length < 12) return null;

    const allValues = since2011.map((e) => e.valor);

    // Sanidade: média geral deve estar entre 0.1% e 2%
    const rawAvg = allValues.reduce((s, v) => s + v, 0) / allValues.length;
    if (rawAvg < 0.1 || rawAvg > 2) return null;

    const { avg180, avg12 } = calcAverages(allValues);
    const lastEntry = since2011[since2011.length - 1];

    return {
      avg180,
      avg12,
      projection: avg12,
      lastUpdate: lastEntry.data,
      totalMonths: allValues.length,
      values: since2011.map((e) => ({
        data: e.data,
        valor: Math.round(e.valor * 10000) / 10000,
      })),
      source: "brasilindicadores.com.br — INCC-M (FGV IBRE)",
      indicator: "INCC-M",
    };
  } catch {
    return null;
  }
}

// ─── Fonte 2 (fallback): INCC-DI via Bacen SGS série 192 ───
// INCC-DI é o único INCC disponível na API do Bacen.
// Valores muito próximos ao INCC-M (diferença < 0.1 p.p. nas médias).
async function fetchINCCdFromBacen(): Promise<InccResult | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 200);

    const url = `${BACEN_BASE_URL}.${BACEN_SERIES_DI}/dados?formato=json&dataInicial=${formatBacenDate(startDate)}&dataFinal=${formatBacenDate(endDate)}`;

    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const rawData: { data: string; valor: string }[] = await res.json();
    if (!Array.isArray(rawData) || rawData.length === 0) return null;

    const values = rawData
      .map((item) => ({
        data: item.data,
        valor: parseFloat(item.valor),
      }))
      .filter((item) => !isNaN(item.valor) && item.valor !== null);

    if (values.length < 12) return null;

    // Sanidade: média do INCC-DI tipicamente entre 0.2% e 1.5%
    const allValues = values.map((v) => v.valor);
    const rawAvg = allValues.reduce((s, v) => s + v, 0) / allValues.length;
    if (rawAvg < 0.1 || rawAvg > 3) return null;

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
      source: "Bacen SGS série 192 — INCC-DI (FGV IBRE)",
      indicator: "INCC-DI",
    };
  } catch {
    return null;
  }
}

// ─── Fallback com valores verificados (maio/2026) ───
function getFallback(): InccResult {
  // Valores verificados em 19/05/2026:
  // INCC-M (brasilindicadores/FGV): 12m=0.5092%, 180m=0.5570%
  // INCC-DI (Bacen série 192):       12m=0.5158%, 180m=0.5577%
  return {
    avg180: 0.5570,
    avg12: 0.5092,
    projection: 0.5092,
    lastUpdate: null,
    totalMonths: 0,
    values: [],
    fallback: true,
    source: "Valores de referência INCC-M (FGV IBRE) — fontes indisponíveis",
    indicator: "INCC-M",
  };
}

// ─── Handler GET ───
export async function GET() {
  // Verificar cache
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  // 1) Tentar INCC-M via brasilindicadores (fonte principal — dados oficiais FGV)
  let result = await fetchINCCmFromBrasilIndicadores();

  // 2) Fallback: INCC-DI via Bacen série 192 (API confiável do Banco Central)
  if (!result) {
    result = await fetchINCCdFromBacen();
  }

  // 3) Último recurso: valores estáticos verificados manualmente
  if (!result) {
    result = getFallback();
  }

  // Atualizar cache
  cache = { data: result, timestamp: Date.now() };

  return NextResponse.json(result);
}
