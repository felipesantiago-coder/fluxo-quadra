import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

async function requireAdminSistema() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin_sistema") {
    return { supabase, error: NextResponse.json({ error: "Acesso restrito" }, { status: 403 }) };
  }
  return { supabase, error: null };
}

// ─── Normalização de colunas ───────────────────────────────────────────────────
// Converte um cabeçalho Excel para uma chave normalizada usada no COLUMN_MAP.
// Ex: "Preço de Venda" → "preco_de_venda", "Área Privativa" → "area_privativa"
function normalizeColumnName(col: string): string {
  return col
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

// ─── Mapeamento de colunas (chaves já normalizadas) ───────────────────────────
// Todas as chaves estão normalizadas (sem acentos, sem espaços, tudo minúsculo).
// A função mapColumns normaliza o cabeçalho do Excel e compara com essas chaves.
const COLUMN_MAP: Record<string, string> = {
  andar: "andar",
  pavimento: "andar",
  floor: "andar",
  unidade: "unidade",
  no_unidade: "unidade",
  numero: "unidade",
  apto: "unidade",
  apartamento: "unidade",
  area: "area",
  area_privativa: "area",
  m2: "area",
  m2_: "area",
  metragem: "area",
  quartos: "quartos",
  dormitorios: "quartos",
  quartos_dormitorios: "quartos",
  suites: "quartos",
  vagas: "vagas",
  garagem: "vagas",
  vagas_garagem: "vagas",
  vaga: "vagas",
  valor: "valor_venda",
  valor_de_venda: "valor_venda",
  valor_venda: "valor_venda",
  preco: "valor_venda",
  preco_de_venda: "valor_venda",
  status: "status",
  posicao_solar: "posicao_solar",
  posicao: "posicao_solar",
  solar: "posicao_solar",
  sol: "posicao_solar",
  face: "posicao_solar",
  tipologia: "tipologia",
  tipo: "tipologia",
  tipo_unidade: "tipologia",
  planta: "tipologia",
  bloco: "bloco",
  torre: "bloco",
  cobertura: "is_cobertura",
  cobertura_: "is_cobertura",
  garden: "is_garden",
  garden_: "is_garden",
};

function mapColumns(
  headers: string[]
): { mapped: Record<string, string>; unmapped: string[] } {
  const mapped: Record<string, string> = {};
  const unmapped: string[] = [];

  for (const header of headers) {
    const normalized = normalizeColumnName(header);
    const dbField = COLUMN_MAP[normalized];
    if (dbField) {
      mapped[header] = dbField;
    } else {
      unmapped.push(header);
    }
  }

  return { mapped, unmapped };
}

// ─── Parsers de valores ────────────────────────────────────────────────────────
function parseBrazilianNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const str = String(value).trim();
  if (str === "") return null;

  // Brazilian format: 1.234.567,89
  if (str.includes(",") && str.includes(".")) {
    const cleaned = str.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  if (str.includes(",")) {
    const cleaned = str.replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const str = String(value).toLowerCase().trim();
  return ["sim", "s", "yes", "y", "true", "1", "x"].includes(str);
}

function parseStatus(value: unknown): string {
  if (!value || value === "" || value === null || value === undefined) return "disponivel";
  const str = String(value).toLowerCase().trim();
  if (str === "disponível" || str === "disponivel" || str === "available") return "disponivel";
  if (str === "reservada" || str === "reservado" || str === "reserved") return "reservado";
  if (str === "vendida" || str === "vendido" || str === "sold") return "vendido";
  return "disponivel";
}

// ─── Processamento de uma linha do Excel → campos do banco ────────────────────
function buildUnitFromRow(
  row: Record<string, unknown>,
  columnMapping: Record<string, string>,
  empreendimentoId: string,
  ordem: number
): Record<string, unknown> {
  const unit: Record<string, unknown> = {
    empreendimento_id: empreendimentoId,
    ordem,
  };

  for (const [header, dbField] of Object.entries(columnMapping)) {
    const value = row[header];

    if (dbField === "andar") {
      unit.andar = parseBrazilianNumber(value);
    } else if (dbField === "unidade") {
      unit.unidade = String(value ?? "").trim();
    } else if (dbField === "area") {
      const areaVal = parseBrazilianNumber(value);
      unit.area = areaVal;
      unit.area_str = areaVal ? `${areaVal} m²` : "";
    } else if (dbField === "quartos") {
      unit.quartos = parseBrazilianNumber(value) || 1;
    } else if (dbField === "vagas") {
      unit.vagas = parseBrazilianNumber(value) || 1;
    } else if (dbField === "valor_venda") {
      unit.valor_venda = parseBrazilianNumber(value);
    } else if (dbField === "status") {
      const statusVal = parseStatus(value);
      unit.status = ["disponivel", "reservado", "vendido"].includes(statusVal) ? statusVal : "disponivel";
    } else if (dbField === "posicao_solar") {
      unit.posicao_solar = String(value ?? "").trim();
    } else if (dbField === "tipologia") {
      unit.tipologia = String(value ?? "").trim();
    } else if (dbField === "bloco") {
      unit.bloco = String(value ?? "").trim();
    } else if (dbField === "is_cobertura") {
      unit.is_cobertura = parseBoolean(value);
    } else if (dbField === "is_garden") {
      unit.is_garden = parseBoolean(value);
    }
  }

  return unit;
}

// ─── Endpoint POST ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { supabase, error } = await requireAdminSistema();
    if (error) return error;

    const formData = await request.formData();
    const empreendimentoId = formData.get("empreendimentoId") as string;
    const file = formData.get("file") as File | null;

    if (!empreendimentoId || !file) {
      return NextResponse.json(
        { error: "Campos 'empreendimentoId' e 'file' são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar tipo do arquivo
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (![".xlsx", ".xls"].includes(ext)) {
      return NextResponse.json(
        { error: "O arquivo deve estar em formato Excel (.xlsx ou .xls)" },
        { status: 400 }
      );
    }

    // Parsear Excel
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    if (rows.length === 0) {
      return NextResponse.json({ error: "O arquivo Excel está vazio" }, { status: 400 });
    }

    // Mapear colunas
    const headers = Object.keys(rows[0]);
    const { mapped: columnMapping } = mapColumns(headers);

    if (Object.keys(columnMapping).length === 0) {
      return NextResponse.json(
        {
          error: "Não foi possível identificar as colunas do Excel. Use nomes como: andar, unidade, área, quartos, vagas, valor, status, tipologia",
          detectedHeaders: headers,
        },
        { status: 400 }
      );
    }

    // Verificar se a coluna 'unidade' está presente
    const hasUnidade = Object.values(columnMapping).includes("unidade");
    if (!hasUnidade) {
      return NextResponse.json(
        {
          error: "A coluna 'unidade' é obrigatória para identificar cada unidade. Adicione uma coluna com cabeçalho 'unidade', 'apto', 'nº unidade' ou 'apartamento'.",
          detectedHeaders: headers,
        },
        { status: 400 }
      );
    }

    // Processar linhas com UPSERT (não exclui unidades existentes)
    const results = { inserted: 0, updated: 0, skipped: 0, errors: 0 };
    const errorDetails: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const unit = buildUnitFromRow(row, columnMapping, empreendimentoId, i + 1);

      const unitName = String(unit.unidade ?? "").trim();
      if (!unitName) {
        results.skipped++;
        errorDetails.push(`Linha ${i + 1}: unidade vazia, ignorada`);
        continue;
      }

      // Upsert: se já existir (empreendimento_id + unidade), atualiza; senão insere
      const { error: upsertErr } = await supabase
        .from("projeto_units")
        .upsert(unit, {
          onConflict: "empreendimento_id,unidade",
          count: "exact",
        });

      if (upsertErr) {
        results.errors++;
        errorDetails.push(`Linha ${i + 1} (${unitName}): ${upsertErr.message}`);
        console.error(`Erro ao upsert linha ${i + 1}:`, upsertErr.message);
      }
    }

    // Contar totais após o upsert
    const { count: totalUnits } = await supabase
      .from("projeto_units")
      .select("*", { count: "exact", head: true })
      .eq("empreendimento_id", empreendimentoId);

    return NextResponse.json({
      ...results,
      total_units: totalUnits ?? 0,
      total_rows: rows.length,
      columns: columnMapping,
      errors: errorDetails.length > 0 ? errorDetails : undefined,
    });
  } catch (err) {
    console.error("Erro no upload de Excel:", err);
    return NextResponse.json(
      { error: "Erro interno no processamento do Excel" },
      { status: 500 }
    );
  }
}
