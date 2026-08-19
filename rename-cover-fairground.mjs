import fs from 'node:fs';
const dir = 'images/covers';
for (const f of fs.readdirSync(dir)) {
  if (f.startsWith('悬疑推理游戏封面插画_废弃游乐园') && f.endsWith('.png')) {
    fs.renameSync(`${dir}/${f}`, `${dir}/fairground.png`);
    console.log('renamed ->', 'fairground.png');
  }
}
