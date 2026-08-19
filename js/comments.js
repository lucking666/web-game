// ===================================================================
// 暗流 — 案件留言区
// 页面存在 #comments 容器时自动挂载；未接入云端时显示离线提示。
// ===================================================================
import { $, showToast } from './utils.js';
import { getUser } from './storage.js?v=20260830';
import { fetchComments, submitComment, getNickname, isConfigured } from './cloudbase.js?v=20260830';

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
}

function fmtWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export async function renderComments(caseId) {
  const host = $('#comments');
  if (!host) return;

  host.innerHTML = /* html */`
    <div class="comments">
      <div class="comments-title">📜 档案留言</div>
      <div class="comment-list" id="commentList"><div class="comment-empty">加载中……</div></div>
      <div class="comment-form">
        <input type="text" id="commentInput" placeholder="留下你的推理或感想（300 字内）" autocomplete="off" maxlength="300">
        <button id="commentSubmit">留言</button>
      </div>
    </div>`;

  const listEl = $('#commentList');
  const input  = $('#commentInput');
  const btn    = $('#commentSubmit');

  async function refresh() {
    if (!isConfigured()) {
      listEl.innerHTML = '<div class="comment-empty">云端未接入，留言暂不可用</div>';
      return;
    }
    const rows = await fetchComments(caseId, 50);
    if (!rows.length) {
      listEl.innerHTML = '<div class="comment-empty">暂无留言，来抢沙发～</div>';
      return;
    }
    listEl.innerHTML = rows.map(r => /* html */`
      <div class="comment-item">
        <div class="comment-head">
          <span class="comment-nick">${escapeHtml(r.nickname || '匿名馆员')}</span>
          <span class="comment-time">${fmtWhen(r.created_at)}</span>
        </div>
        <div class="comment-body">${escapeHtml(r.content)}</div>
      </div>`).join('');
  }

  btn.addEventListener('click', async () => {
    const content = input.value.trim();
    if (!content) { showToast('先写点什么再留言'); return; }
    const nickname = getUser() || getNickname();
    const ok = await submitComment(caseId, nickname, content);
    if (ok) {
      input.value = '';
      showToast('✅ 留言成功');
      refresh();
    } else {
      showToast('❌ 留言失败：未接入云端或网络异常');
    }
  });

  input.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });

  refresh();
}
