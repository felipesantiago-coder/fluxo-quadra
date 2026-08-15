import fs

const fp = '/home/z/my-project/src/app/simulador/page.tsx';
let raw = '';
let found = false;

for (let i = 0; i < 10000; i++) {
  const line = raw.slice(i, i + 50);
  if (line.includes('{activeTab === "sinal"') || line.includes('{/* Important Info Card */')) {
    if (line.includes('{/* Important Info Card*/')) {
      found = true;
      const before = raw.substring(0, i);
      const after = raw.substring(i + 50, line.length);
      raw = before + after;
      break;
    }
  }
}
if (!found) { process.exit(1) }
fs.writeFileSync(fp, raw, 'utf-8');
process.exit(0);
