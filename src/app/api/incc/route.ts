import { NextResponse } from "next/server";

// ─── Fontes de dados INCC ───
// O Bacen SGS NÃO disponibiliza INCC-M (variação mensal).
// Série 192 = INCC-DI (Índice Nacional de Custo da Construção – Disponibilidade Interna)
// Fonte: FGV IBRE | Período: jan/1990 até presente | Atualização mensal
// INCC-DI acompanha de perto o INCC-M e é o único INCC disponível na API do Bacen.
const BACEN_SERIES_DI = "192";
const BACEN_SERIES_IGPM = "189"; // IGP-M (variação mensal)
const BACEN_BASE_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

// brasilindicadores.com.br publica INCC-M (FGV) via tabela HTML acessível por AJAX.
const BRASIL_INDICADORES_URL =
  "https://brasilindicadores.com.br/incc-m?handler=HistoricoValoresIndicadorPartial";

// Bacen Olinda API — Expectativas de Mercado (Focus)
const OLINDA_IGPM_12M_URL =
  "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoInflacao12Meses";

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
  projectionSource?: string;
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

// ─── Projeção INCC via Expectativas de Mercado ───
// Estratégia:
// 1. Buscar expectativa de mercado para IGP-M (12 meses à frente) via Bacen Olinda
// 2. Converter a expectativa anual em média mensal equivalente
// 3. Calcular fator de proporcionalidade histórico INCC / IGP-M (últimos 60 meses)
// 4. Aplicar o fator à expectativa mensal do IGP-M para obter a projeção INCC
//
// Justificativa: O INCC não possui expectativas de mercado no relatório Focus,
// mas o IGP-M (FGV) possui forte correlação com o INCC — o próprio INCC é um
// dos componentes do IGP-M (peso de 10%). O IGP-M é amplamente coberto por
// analistas no relatório Focus, com dezenas de respondentes.
async function fetchInccProjection(): Promise<{
  value: number;
  source: string;
}> {
  try {
    // ── Passo 1: Obter expectativa 12 meses à frente do IGP-M ──
    const olindaUrl = `${OLINDA_IGPM_12M_URL}?\$filter=Indicador%20eq%20'IGP-M'%20and%20Suavizada%20eq%20'S'%20and%20baseCalculo%20eq%200&\$top=1&\$orderby=Data%20desc&\$format=json`;

    const olindaRes = await fetch(olindaUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!olindaRes.ok) return { value: 0, source: "" };

    const olindaData = await olindaRes.json();
    const entries = olindaData?.value;
    if (!Array.isArray(entries) || entries.length === 0) {
      return { value: 0, source: "" };
    }

    // Usar a mediana suavizada (remove outliers) — baseCalculo 0 = total
    const latestEntry = entries[0];
    const igpmAnnualMedian = latestEntry.Mediana; // % anual

    // Sanidade: expectativa IGP-M anual acima de 20% é cenário extremo — rejeitar
    if (!igpmAnnualMedian || igpmAnnualMedian <= 0 || igpmAnnualMedian > 20) {
      return { value: 0, source: "" };
    }

    // Converter expectativa anual em média mensal equivalente
    // Ex: 4.19% a.a. → ~0.349% a.m. (divisão simples, consistente com médias mensais)
    const igpmMonthlyExpectation = igpmAnnualMedian / 12;

    // Sanidade: expectativa mensal do IGP-M tipicamente entre 0% e 1.5%
    if (igpmMonthlyExpectation < 0 || igpmMonthlyExpectation > 1.5) {
      return { value: 0, source: "" };
    }

    // ── Passo 2: Obter dados históricos do IGP-M (últimos 60 meses) ──
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 65);

    const igpmHistoryUrl = `${BACEN_BASE_URL}.${BACEN_SERIES_IGPM}/dados?formato=json&dataInicial=${formatBacenDate(startDate)}&dataFinal=${formatBacenDate(endDate)}`;

    const igpmRes = await fetch(igpmHistoryUrl, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000),
    });

    if (!igpmRes.ok) return { value: 0, source: "" };

    const igpmRaw: { data: string; valor: string }[] = await igpmRes.json();
    if (!Array.isArray(igpmRaw) || igpmRaw.length < 24) {
      return { value: 0, source: "" };
    }

    const igpmValues = igpmRaw
      .map((item) => parseFloat(item.valor))
      .filter((v) => !isNaN(v));

    if (igpmValues.length < 24) return { value: 0, source: "" };

    // Média IGP-M dos últimos 60 meses (variação mensal)
    const last60Igpm = igpmValues.slice(-60);
    const avgIgpm60 =
      last60Igpm.reduce((s, v) => s + v, 0) / last60Igpm.length;

    // Sanidade: média mensal do IGP-M tipicamente entre -0.5% e 2%
    if (avgIgpm60 < -0.5 || avgIgpm60 > 2) {
      return { value: 0, source: "" };
    }

    // ── Passo 3: Obter média INCC dos últimos 60 meses ──
    // Buscar da fonte primária (brasilindicadores) ou secundária (Bacen)
    const inccLast60 = await fetchInccLast60Months();

    if (inccLast60.length < 24) return { value: 0, source: "" };

    const avgIncc60 =
      inccLast60.reduce((s, v) => s + v, 0) / inccLast60.length;

    // Sanidade: média mensal do INCC tipicamente entre 0.1% e 2%
    if (avgIncc60 < 0.1 || avgIncc60 > 2) return { value: 0, source: "" };

    // ── Passo 4: Calcular fator de proporcionalidade ──
    // Fator = razão entre a média mensal INCC e a média mensal IGP-M no mesmo período
    const factor = avgIncc60 / avgIgpm60;

    // Sanidade: o fator deve estar entre 0.5 e 5 (INCC costuma ser 1.5-3× o IGP-M)
    if (factor < 0.5 || factor > 5) return { value: 0, source: "" };

    // ── Passo 5: Calcular projeção INCC ──
    // Aplicar o fator à expectativa mensal do IGP-M para derivar a expectativa INCC
    const projection = igpmMonthlyExpectation * factor;

    // Sanidade final: projeção INCC mensal fora de 0.1%-2.0% é irrealista → rejeitar
    if (projection < 0.1 || projection > 2.0) {
      return { value: 0, source: "" };
    }

    const projectionRounded =
      Math.round(projection * 100000) / 100000; // 5 casas decimais

    return {
      value: projectionRounded,
      source: `Expectativa Focus IGP-M ${igpmAnnualMedian.toFixed(2)}% a.a. (${latestEntry.numeroRespondentes || "?"} respondentes) → ${igpmMonthlyExpectation.toFixed(3)}% a.m. × fator INCC/IGP-M ${factor.toFixed(2)}x (60 meses)`,
    };
  } catch {
    return { value: 0, source: "" };
  }
}

// Busca os últimos 60 meses de dados INCC (usando as mesmas fontes da API)
async function fetchInccLast60Months(): Promise<number[]> {
  // Tentar brasilindicadores primeiro
  try {
    const res = await fetch(BRASIL_INDICADORES_URL, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (res.ok) {
      const html = await res.text();
      const rows = html.match(/<tr[^>]*>(.*?)<\/tr>/gis);
      if (rows && rows.length > 0) {
        const monthlyEntries: number[] = [];

        for (const row of rows) {
          const cells = row.match(/<td[^>]*>(.*?)<\/td>/gis);
          if (!cells || cells.length < 2) continue;

          const cleanCells = cells.map((c) =>
            c.replace(/<[^>]+>/g, "").trim()
          );

          const yearStr = cleanCells[0];
          if (!/^\d{4}$/.test(yearStr)) continue;

          const year = parseInt(yearStr, 10);
          if (year < 2021) continue; // últimos ~60 meses a partir de 2021

          for (let m = 0; m < 12; m++) {
            const valStr = cleanCells[m + 1]
              ?.replace("%", "")
              .replace(",", ".")
              .trim();
            if (!valStr || valStr === "") continue;
            const valor = parseFloat(valStr);
            if (!isNaN(valor)) monthlyEntries.push(valor);
          }
        }

        if (monthlyEntries.length >= 24) return monthlyEntries.slice(-60);
      }
    }
  } catch {
    // fallback to Bacen
  }

  // Fallback: Bacen série 192 (INCC-DI)
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 65);

    const url = `${BACEN_BASE_URL}.${BACEN_SERIES_DI}/dados?formato=json&dataInicial=${formatBacenDate(startDate)}&dataFinal=${formatBacenDate(endDate)}`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const rawData: { data: string; valor: string }[] = await res.json();
      if (Array.isArray(rawData) && rawData.length >= 24) {
        const values = rawData
          .map((item) => parseFloat(item.valor))
          .filter((v) => !isNaN(v));
        if (values.length >= 24) return values.slice(-60);
      }
    }
  } catch {
    // não disponível
  }

  return [];
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
      projection: 0, // será preenchido pela expectativa de mercado
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
      projection: 0, // será preenchido pela expectativa de mercado
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
    projection: 0, // será preenchido pela expectativa de mercado
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

  // 4) Calcular projeção baseada em expectativas de mercado (Bacen Focus / Olinda API)
  const projection = await fetchInccProjection();
  if (projection.value > 0) {
    result.projection = projection.value;
    result.projectionSource = projection.source;
  } else {
    // Fallback da projeção: usar média dos últimos 12 meses
    result.projection = result.avg12;
    result.projectionSource = "Média dos últimos 12 meses (expectativas de mercado indisponíveis)";
  }

  // Atualizar cache
  cache = { data: result, timestamp: Date.now() };

  return NextResponse.json(result);
}
