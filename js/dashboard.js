// ===================================================================
// 暗流 — 档案馆首页（Dashboard）
// ===================================================================
import { $ } from './utils.js';
import { getCaseProgress } from './storage.js';
import { caseDB, caseOrder } from './cases/registry.js?v=20260819';

export function renderDashboard() {
  let solved = 0, totalClues = 0;

  caseOrder.forEach(id => {
    const cp = getCaseProgress(id);
    totalClues += cp.unlocked.length;
    if (cp.ending) solved++;
  });

  $('statTotal').textContent = caseOrder.length;
  $('statSolved').textContent = solved;
  $('statClues').textContent  = totalClues;

  let html = '';
  caseOrder.forEach(id => {
    const c  = caseDB[id];
    const cp = getCaseProgress(id);
    const total = Object.keys(c.clueDB).length;
    const found = cp.unlocked.length;

    let status, badge;
    if (cp.ending) {
      status = '<span class="card-status" style="color:#4a4;">✅ 已结案</span>';
      badge  = '<span class="card-badge badge-done">已破</span>';
    } else if (found > 0) {
      status = `<span class="card-status">⏳ 线索 ${found}/${total}</span>`;
      badge  = '<span class="card-badge badge-going">调查中</span>';
    } else {
      status = '<span class="card-status" style="color:var(--red);">🆕 新案件</span>';
      badge  = '<span class="card-badge badge-new">NEW</span>';
    }

    html += /* html */`
      <div class="case-card" data-case-id="${id}">
        ${badge}
        <div class="card-icon">${c.icon}</div>
        <div class="card-tag ${c.tagClass}">${c.tag}</div>
        <div class="card-name">${c.title.replace(/ /g, '')}</div>
        <div class="card-desc">${c.desc}</div>
        ${status}
      </div>`;
  });

  $('caseGrid').innerHTML = html;

  // 绑定点击跳转
  $('caseGrid').querySelectorAll('.case-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = 'pages/cases/' + card.dataset.caseId + '.html';
    });
  });
}
