import csv
import json

rows = []
with open('/home/z/my-project/upload/Residencial Vitta.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for r in reader:
        rows.append(r)

# Floor ordering
floor_order = {
    'Lojas': 0,
    'Térreo': 1,
    'Área Especial': 1,
    '2º Andar': 2,
    '3º Andar': 3,
    '4º Andar': 4,
    '5º Andar': 5,
    '6º Andar': 6,
    '7º Andar': 7,
    '8º Andar': 8,
    '9º Andar': 9,
    '10º Andar': 10,
    '11º Andar': 11,
    '12º Andar': 12,
    '13º Andar': 13,
}

def get_tipo(area: float, andar: str, unidade: int) -> str:
    if 'Loja' in andar:
        return 'Loja'
    if area < 35:
        return 'Studio'
    if area < 46:
        return '1 Suíte'
    if area < 49:
        return '1 Suíte'
    if area < 55:
        return '2 Suítes'
    return 'Apartamento'

units = []
for r in rows:
    bloco = r['Bloco'].strip()
    andar = r['Andar'].strip()
    unidade = int(r['Unidade'].strip())
    status_raw = r['Status'].strip()
    area_str_raw = r['Área Privativa (m²)'].strip()
    valor_raw = r['Valor Total (R$)'].strip()
    
    area = float(area_str_raw.replace('.', '').replace(',', '.'))
    valor = float(valor_raw.replace('.', ''))
    status = 'disponivel' if status_raw == 'Livre' else 'vendido'
    tipo = get_tipo(area, andar, unidade)
    andar_num = floor_order.get(andar, 99)
    
    # Format area string properly
    area_formatted = f'{area:.2f}'.replace('.', ',') + ' m\u00b2'
    
    units.append({
        'bloco': bloco,
        'andar': andar,
        'andarNum': andar_num,
        'unidade': unidade,
        'area': round(area, 2),
        'areaStr': area_formatted,
        'valorVenda': valor,
        'status': status,
        'tipo': tipo,
    })

# Sort by bloco, andarNum, unidade
units.sort(key=lambda u: (u['bloco'], u['andarNum'], u['unidade']))

# Get unique tipos
tipos = sorted(set(u['tipo'] for u in units))

# Get unique blocos
blocos = sorted(set(u['bloco'] for u in units))

# Get unique andar labels (sorted)
andar_labels = sorted(set(u['andar'] for u in units), key=lambda a: floor_order.get(a, 99))

# Generate TypeScript
lines = []
lines.append('// Residencial Vitta - Dados est\u00e1ticos das unidades')
lines.append('// Gerado a partir do CSV: Residencial Vitta.csv')
lines.append('// Ceil\u00e2ndia - DF | Entrega: Abril 2029')
lines.append('')
lines.append('export interface VittaUnit {')
lines.append('  bloco: "A" | "B";')
lines.append('  andar: string;')
lines.append('  andarNum: number;')
lines.append('  unidade: number;')
lines.append('  area: number;')
lines.append('  areaStr: string;')
lines.append('  valorVenda: number;')
lines.append('  valorStr: string;')
lines.append('  valorFormatado: string;')
lines.append('  status: "disponivel" | "vendido";')
lines.append('  tipo: string;')
lines.append('}')
lines.append('')
lines.append(f'export const vittaBlocos = {json.dumps(blocos)} as const;')
lines.append(f'export const vittaTipos = {json.dumps(tipos)} as const;')
lines.append('')
lines.append('export const vittaAndares: string[] = ' + json.dumps(andar_labels) + ';')
lines.append('')
lines.append('export const vittaAndarLabels: Record<string, string> = {')
for a in andar_labels:
    lines.append(f'  {json.dumps(a)}: {json.dumps(a)},')
lines.append('};')
lines.append('')
lines.append('function fmtCurrency(value: number): string {')
lines.append('  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);')
lines.append('}')
lines.append('')
lines.append('export function formatVittaCurrency(value: number): string {')
lines.append('  return fmtCurrency(value);')
lines.append('}')
lines.append('')
lines.append('const rawData: Omit<VittaUnit, "valorStr" | "valorFormatado">[] = [')

for u in units:
    lines.append(f'  {{ bloco: {json.dumps(u["bloco"])}, andar: {json.dumps(u["andar"])}, andarNum: {u["andarNum"]}, unidade: {u["unidade"]}, area: {u["area"]}, areaStr: {json.dumps(u["areaStr"])}, valorVenda: {u["valorVenda"]}, status: {json.dumps(u["status"])}, tipo: {json.dumps(u["tipo"])} }},')

lines.append('];')
lines.append('')
lines.append('export const vittaUnits: VittaUnit[] = rawData.map((u) => ({')
lines.append('  ...u,')
lines.append('  valorStr: u.valorVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),')
lines.append('  valorFormatado: fmtCurrency(u.valorVenda),')
lines.append('}));')
lines.append('')
lines.append('export function getVittaUnitsByBloco(bloco: string): VittaUnit[] {')
lines.append('  return vittaUnits.filter((u) => u.bloco === bloco);')
lines.append('}')
lines.append('')
lines.append('export function getVittaStats() {')
lines.append('  const total = vittaUnits.length;')
lines.append('  const disponiveis = vittaUnits.filter((u) => u.status === "disponivel").length;')
lines.append('  const vendidos = vittaUnits.filter((u) => u.status === "vendido").length;')
lines.append('  const valorMin = Math.min(...vittaUnits.filter((u) => u.valorVenda > 0).map((u) => u.valorVenda));')
lines.append('  const valorMax = Math.max(...vittaUnits.filter((u) => u.valorVenda > 0).map((u) => u.valorVenda));')
lines.append('  return { total, disponiveis, vendidos, valorMin, valorMax };')
lines.append('}')

output = '\n'.join(lines)
with open('/home/z/my-project/src/lib/vitta-data.ts', 'w', encoding='utf-8') as f:
    f.write(output)

print(f'Generated vitta-data.ts with {len(units)} units')
print(f'Blocos: {blocos}')
print(f'Tipos: {tipos}')
print(f'Andares: {andar_labels}')