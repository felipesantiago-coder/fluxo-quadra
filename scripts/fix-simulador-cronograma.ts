import { readFileSync, writeFileSync } from 'fs';

const filePath = '/home/z/my-project/src/app/simulador/page.tsx';
let content = readFileSync(filePath, 'utf-8');

// Marcar o texto que precisa ser substituído (tudo de Schedule Tabs até Info Card)
const startMarker = '                {/* Schedule Tabs — sempre visível quando há dados */';
const endMarker = '                {/* Important Info Card */';

const startIdx = content.indexOf(startMarker);
if (startIdx === -1) { console.error('Marcador não encontrado'); process.exit(1); }
const endIdx = content.indexOf(endMarker);
if (endIdx === -1) { console.error('Fim do marcador não encontrado'); process.exit(1); }

const before = content.substring(0, startIdx);
const after = content.substring(endIdx);

const replacement = after;

writeFileSync(filePath, before + replacement, 'utf-8');
console.log('Substituição concluída com sucesso');
process.exit(0);
