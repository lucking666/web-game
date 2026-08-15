// 临时校验脚本：检查所有密码锁提示（lockHint）引用的档案是否存在且未被加密
// 提取"调取「xxx」档案"中的 xxx，校验其是否在 clueDB 且不在 lockedClues 中
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const root = path.resolve();
const tmpRoot = path.join(root, '.tmp-check');
const srcDir = path.join(root, 'js/cases');
const tmpDir = path.join(tmpRoot, 'cases');
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });
fs.writeFileSync(path.join(tmpRoot, 'package.json'), '{ "type": "module" }\n', 'utf8');

for (const f of fs.readdirSync(srcDir)) {
  if (!f.endsWith('.js')) continue;
  let src = fs.readFileSync(path.join(srcDir, f), 'utf8');
  src = src.replace(/\?v=\d+/g, '');
  fs.writeFileSync(path.join(tmpDir, f), src);
}

const { caseDB, caseOrder } = await import(pathToFileURL(path.join(tmpDir, 'registry.js')).href);

let issues = 0;
for (const id of caseOrder) {
  const c = caseDB[id];
  const keys = Object.keys(c.clueDB);
  const locked = Object.keys(c.lockedClues || {});
  for (const lk of locked) {
    const def = c.lockedClues[lk];
    const refs = [...def.lockHint.matchAll(/调取「([^」]+)」/g)].map(m => m[1]);
    for (const ref of refs) {
      if (!keys.includes(ref)) {
        issues++;
        console.log(`⚠️  ${id}.「${lk}」提示引用「${ref}」——该档案不在线索库中`);
      } else if (locked.includes(ref)) {
        issues++;
        console.log(`❌  ${id}.「${lk}」提示引用「${ref}」——而「${ref}」自身是加密线索，形成死循环`);
      } else {
        console.log(`✅  ${id}.「${lk}」→ 提示可调取「${ref}」（未加密）`);
      }
    }
  }
}

console.log('\n==========');
if (issues) {
  console.log(`发现 ${issues} 处问题`);
  process.exit(1);
}
console.log('✅ 所有密码锁提示引用的档案均可直接调取，无死循环');
