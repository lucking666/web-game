// ===================================================================
// 暗流 — 档案馆首页（Dashboard）
// ===================================================================
import { $ } from './utils.js';
import { getCaseProgress } from './storage.js?v=20260830';
import { caseDB, caseOrder } from './cases/registry.js?v=20260830';
import { CONFIG } from './cloudbase-config.js?v=20260830';
import { reportVisit, fetchStats } from './cloudbase.js?v=20260830';

let _stats = null; // 云端访问统计缓存

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

  // 访问统计（云端）：未配置显示 —，已配置未加载显示 …，加载后显示数值
  $('statVisits').textContent = _stats ? _stats.visits : (CONFIG.envId ? '…' : '—');
  $('statToday').textContent  = _stats ? _stats.today  : (CONFIG.envId ? '…' : '—');

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
        <div class="card-icon"><img src="images/covers/${id}.png" alt="${c.title}" loading="lazy"></div>
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

/** 云端功能初始化：上报访问 + 拉取统计 + 云端存档回填后重渲染 */
export async function initCloudFeatures() {
  if (!CONFIG.envId) return;
  reportVisit('index');
  const s = await fetchStats();
  if (s) {
    _stats = s;
    renderDashboard();
  }
  // 云端存档比本地新时，storage 会广播事件，这里重渲染卡片状态
  window.addEventListener('cloud-save-loaded', () => renderDashboard());
}
