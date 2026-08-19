// ===================================================================
// 临时检测脚本 v2：检查每个线索关键词是否"可发现"
// 引导来源 = 玩家在解锁全部线索前一定读得到的文本：
//   overview / desc / passwordHint / 全部 lockHint / lockedPreview / 非锁定线索的正文
// 排除：passwordReward（解主密码后才显示）、锁定线索正文（解密前不可见）
// 标准：关键词必须作为子串出现在上述任一文本中
// ===================================================================
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cases = ['ward','theater','snowtrain','qingwushan','library','huaishu','highway444','gumu','fogport','belltower'];

async function loadCase(file) {
  const code = readFileSync(file, 'utf8');
  const mod = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
  return mod.caseData;
}

let fail = 0;
let total = 0;
for (const id of cases) {
  const file = path.resolve(__dirname, 'js', 'cases', `${id}.js`);
  const c = await loadCase(file);
  const lockKeys = Object.keys(c.lockedClues || {});

  // —— 引导池 ——
  const guides = [];
  guides.push({ src: 'overview', text: String(c.overview) });
  guides.push({ src: 'desc', text: c.desc || '' });
  guides.push({ src: 'passwordHint', text: c.passwordHint || '' });
  for (const [k, def] of Object.entries(c.lockedClues || {})) {
    guides.push({ src: `lockHint[${k}]`, text: def.lockHint || '' });
    guides.push({ src: `lockedPreview[${k}]`, text: def.lockedPreview || '' });
  }
  for (const [k, v] of Object.entries(c.clueDB)) {
    if (!lockKeys.includes(k)) guides.push({ src: `正文[${k}]`, text: v });
  }
  const pool = guides.map(g => g.text).join('\n');

  console.log(`\n===== ${id}（${c.title}）=====`);
  for (const k of Object.keys(c.clueDB)) {
    total++;
    if (pool.includes(k)) {
      const hit = guides.find(g => g.text.includes(k));
      const idx = hit.text.indexOf(k);
      const ctx = hit.text.slice(Math.max(0, idx - 8), idx + k.length + 8).replace(/\n/g, ' ');
      console.log(`  ok 「${k}」 <- ${hit.src}：...${ctx}...`);
    } else {
      console.log(`  FAIL 「${k}」 —— 引导池中未出现`);
      fail++;
    }
  }
}
console.log(`\n===== 汇总：${fail} / ${total} 个关键词不可发现 =====`);
process.exit(fail ? 1 : 0);
