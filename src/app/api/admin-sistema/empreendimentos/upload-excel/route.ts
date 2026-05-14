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

// Mapeamento de nomes de colunas em português para campos do banco
const COLUMN_MAP: Record<string, string> = {
  andar: "andar",
  pavimento: "andar",
  floor: "andar",
  unidade: "unidade",
  "nº unidade": "unidade",
  numero: "unidade",
  apto: "unidade",
  apartamento: "unidade",
  area: "area",
  "área": "area",
  "área privativa": "area",
  area_privativa: "area",
  m2: "area",
  "m²": "area",
  metragem: "area",
  quartos: "quartos",
  dormitorios: "quartos",
  "dormitórios": "quartos",
  quartos_dormitorios: "quartos",
  suites: "quartos",
  "suítes": "quartos",
  vagas: "vagas",
  garagem: "vagas",
  "vagas garagem": "vagas",
  "vaga": "vagas",
  valor: "valor_venda",
  "valor de venda": "valor_venda",
  valor_venda: "valor_venda",
  preco: "valor_venda",
  "preço": "valor_venda",
  "preço de venda": "valor_venda",
  status: "status",
  "posição solar": "posicao_solar",
  posicao_solar: "posicao_solar",
  "posição": "posicao_solar",
  posicao: "posicao_solar",
  solar: "posicao_solar",
  sol: "posicao_solar",
  face: "posicao_solar",
  tipologia: "tipologia",
  tipo: "tipologia",
  "tipo unidade": "tipologia",
  planta: "tipologia",
  bloco: "bloco",
  "torre": "bloco",
  cobertura: "is_cobertura",
  "cobertura?": "is_cobertura",
  garden: "is_garden",
  "garden?": "is_garden",
};

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

function mapColumns(headers: string[]): { mapped: Record<string, string>; unmapped: string[] } {
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
  if (str === "disponível" || str === "disponivel" || str === "disponivel" || str === "available") return "disponivel";
  if (str === "reservada" || str === "reservado" || str === "reserved") return "reservado";
  if (str === "vendida" || str === "vendido" || str === "sold") return "vendido";
  return "disponivel";
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, error } = await requireAdminSistema();
    if (error) return error;

    const formData = await request.formData();
    const empreendimentoId = formData.get("empreendimentoId") as string;
    const file = formData.get("file") as File | null;

    if (!empreendimentoId || !file) {
      return NextResponse.json({ error: "Campos 'empreendimentoId' e 'file' são obrigatórios" }, { status: 400 });
    }

    // Validar tipo do arquivo
    const validExtensions = [".xlsx", ".xls"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(ext)) {
      return NextResponse.json({ error: "O arquivo deve estar em formato Excel (.xlsx ou .xls)" }, { status: 400 });
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
      return NextResponse.json({
        error: "Não foi possível identificar as colunas do Excel. Use nomes como: andar, unidade, área, quartos, vagas, valor, status, tipologia",
        detectedHeaders: headers,
      }, { status: 400 });
    }

    // Limpar unidades existentes
    await supabase.from("projeto_units").delete().eq("empreendimento_id", empreendimentoId);

    // Processar e inserir unidades
    const validStatuses = ["disponivel", "reservado", "vendido"];
    let inserted = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const unit: Record<string, unknown> = {
        empreendimento_id: empreendimentoId,
        ordem: i + 1,
      };

      for (const [header, dbField] of Object.entries(columnMapping)) {
        const value = row[header];

        if (dbField === "andar") {
          unit.andar = parseBrazilianNumber(value);
        } else if (dbField === "unidade") {
          unit.unidade = String(value ?? "");
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
          unit.status = validStatuses.includes(statusVal) ? statusVal : "disponivel";
        } else if (dbField === "posicao_solar") {
          unit.posicao_solar = String(value ?? "");
        } else if (dbField === "tipologia") {
          unit.tipologia = String(value ?? "");
        } else if (dbField === "bloco") {
          unit.bloco = String(value ?? "");
        } else if (dbField === "is_cobertura") {
          unit.is_cobertura = parseBoolean(value);
        } else if (dbField === "is_garden") {
          unit.is_garden = parseBoolean(value);
        }
      }

      const { error: insertErr } = await supabase.from("projeto_units").insert(unit);
      if (!insertErr) inserted++;
      else console.error(`Erro ao inserir linha ${i + 1}:`, insertErr.message);
    }

    return NextResponse.json({
      inserted,
      total_rows: rows.length,
      columns: columnMapping,
    });
  } catch (err) {
    console.error("Erro no upload de Excel:", err);
    return NextResponse.json({ error: "Erro interno no processamento do Excel" }, { status: 500 });
  }
}
