// ===================================================================
// 暗流 — 侦探榜（排行榜页）
// 展示全站最快 + 各案件 Top，按结案用时升序。
// ===================================================================
import { $ } from './utils.js';
import { caseDB, caseOrder } from './cases/registry.js?v=20260830';
import { fetchLeaderboard, fmtTime, isConfigured } from './cloudbase.js?v=20260830';

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
}

function boardHtml(rows) {
  if (!rows.length) return '<div class="lb-empty">暂无记录，等你来破案</div>';
  return `<ol class="lb-list">${rows.map((r, i) => /* html */`
    <li class="lb-item">
      <span class="lb-rank">${i + 1}</span>
      <span class="lb-name">${escapeHtml(r.nickname || '匿名馆员')}</span>
      <span class="lb-time">${fmtTime(r.time_used)}</span>
    </li>`).join('')}</ol>`;
}

export async function renderLeaderboard() {
  const wrap = $('#leaderboard');
  if (!wrap) return;

  if (!isConfigured()) {
    wrap.innerHTML = '<div class="lb-offline">云端未接入：在 <code>js/cloudbase-config.js</code> 填入环境 ID 后启用侦探榜。</div>';
    return;
  }

  wrap.innerHTML = '<div class="lb-loading">档案同步中……</div>';

  const overall = await fetchLeaderboard(null, 10);
  const perCase = await Promise.all(caseOrder.map(id => fetchLeaderboard(id, 5)));

  let html = '<section class="lb-section"><h2>⚡ 全站最快</h2>' + boardHtml(overall) + '</section>';
  caseOrder.forEach((id, i) => {
    const c = caseDB[id];
    html += `<section class="lb-section"><h2>${c.icon} ${c.title.replace(/ /g, '')}</h2>${boardHtml(perCase[i])}</section>`;
  });
  wrap.innerHTML = html;
}
