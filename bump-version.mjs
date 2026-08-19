import fs from 'node:fs';
import path from 'node:path';

const NEW = 'v=20260830';
const files = [];
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(html|js|css)$/.test(e.name) && !e.name.endsWith('.mjs')) files.push(p);
  }
}
walk('.');
let n = 0;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const s2 = s.replace(/v=20\d{6}/g, NEW);
  if (s2 !== s) { fs.writeFileSync(f, s2); n++; console.log('bumped', f); }
}
console.log('total files bumped:', n);
