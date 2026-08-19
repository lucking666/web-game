// 临时语法检查脚本（用 SourceTextModule 校验 ESM 语法）
// 运行：node --experimental-vm-modules check-syntax.mjs
import { readFileSync } from 'fs';
import vm from 'vm';

const files = [
  'js/cloudbase-config.js',
  'js/cloudbase.js',
  'js/comments.js',
  'js/leaderboard.js',
  'js/dashboard.js',
  'js/storage.js',
  'js/case-engine.js',
  'js/utils.js'
];

let bad = 0;
for (const f of files) {
  try {
    new vm.SourceTextModule(readFileSync(f, 'utf8'), { identifier: f });
    console.log('OK  ' + f);
  } catch (e) {
    bad++;
    console.log('ERR ' + f + '  ' + e.message);
  }
}
console.log(bad ? 'FAIL: ' + bad : 'ALL OK');
process.exit(bad ? 1 : 0);
