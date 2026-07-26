const fs = require('fs');
const content = fs.readFileSync('src/lib/vitta-data.ts', 'utf8');

// Parse rawData array - find the array content
const rawMatch = content.match(/const rawData[^=]*=\s*\[([\s\S]*?)\];/);
if (!rawMatch) { console.error('Could not find rawData'); process.exit(1); }

const rawStr = rawMatch[1]
  .replace(/valorVenda:/g, 'valor_venda:')
  .replace(/areaStr:/g, 'area_str:')
  .replace(/andarNum:/g, 'andar_num:');

const data = eval('[' + rawStr + ']');

// Generate SQL for ALL units
const values = data.map(u => {
  const andarNum = u.andar === 'Lojas' ? -1 : (u.andar === 'Térreo' ? 0 : u.andar_num);
  const areaStr = u.area_str.replace(/'/g, "''");
  const tipologia = u.tipo.replace(/'/g, "''");
  const andar = u.andar.replace(/'/g, "''");
  return `  ('${u.bloco}', '${andar}', ${andarNum}, ${u.unidade}, ${u.area}, '${areaStr}', ${u.valor_venda.toFixed(2)}, '${tipologia}', '${u.status}')`;
});

console.log('INSERT INTO vitta_units (bloco, andar, andar_num, unidade, area, area_str, valor_venda, tipologia, status) VALUES');
console.log(values.join(',\n') + ';');
console.log('ON CONFLICT (bloco, unidade) DO NOTHING;');
console.log('');
console.log('-- Total rows:', data.length);
