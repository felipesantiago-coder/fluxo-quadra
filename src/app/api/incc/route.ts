import { NextResponse } from "next/server";

// INCC-10: Série 22589 do Bacen SGS
// Índice Nacional de Custo da Construção - variações mensais (%)
const BACEN_SERIES = "22589";
const BACEN_BASE_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

// Cache simples em memória (reseta a cada cold start do serverless)
let cache: {
  data: {
    avg180: number;
    avg12: number;
    projection: number;
    lastUpdate: string | null;
    values: { data: string; valor: number }[];
  } | null;
  timestamp: number;
} = { data: null, timestamp: 0 };

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

function formatBacenDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export async function GET() {
  // Verificar cache
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 180);

    const url = `${BACEN_BASE_URL}.${BACEN_SERIES}/dados?formato=json&dataInicial=${formatBacenDate(startDate)}&dataFinal=${formatBacenDate(endDate)}`;

    const res = await fetch(url, {
      next: { revalidate: 3600 }, // cache do Next.js por 1 hora
    });

    if (!res.ok) {
      throw new Error(`Bacen API returned ${res.status}`);
    }

    const rawData: { data: string; valor: string }[] = await res.json();

    if (!Array.isArray(rawData) || rawData.length === 0) {
      throw new Error("Empty INCC data from Bacen");
    }

    // Converter para números, remover valores inválidos
    const values = rawData
      .map((item) => ({
        data: item.data,
        valor: parseFloat(item.valor),
      }))
      .filter((item) => !isNaN(item.valor));

    // Média dos últimos 180 meses
    const avg180 =
      values.length > 0
        ? values.reduce((sum, item) => sum + item.valor, 0) / values.length
        : 0;

    // Média dos últimos 12 meses
    const last12 = values.slice(-12);
    const avg12 =
      last12.length > 0
        ? last12.reduce((sum, item) => sum + item.valor, 0) / last12.length
        : 0;

    // Projeção: usa média dos 12 meses
    const projection = avg12;

    const result = {
      avg180: Math.round(avg180 * 1000) / 1000,
      avg12: Math.round(avg12 * 1000) / 1000,
      projection: Math.round(projection * 1000) / 1000,
      lastUpdate: values[values.length - 1]?.data || null,
      totalMonths: values.length,
      values: values.map((v) => ({
        data: v.data,
        valor: Math.round(v.valor * 1000) / 1000,
      })),
    };

    // Atualizar cache
    cache = { data: result, timestamp: Date.now() };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao buscar dados INCC:", error);

    // Valores fallback baseados em média histórica do INCC-10 (~0,45% a.m.)
    const fallback = {
      avg180: 0.450,
      avg12: 0.400,
      projection: 0.400,
      lastUpdate: null,
      totalMonths: 0,
      values: [],
      fallback: true,
    };

    return NextResponse.json(fallback, {
      status: 200, // Retorna 200 com fallback para não quebrar a UI
      headers: {
        "X-INCC-Fallback": "true",
      },
    });
  }
}
