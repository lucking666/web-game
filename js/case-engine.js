// ===================================================================
// 暗流 — 案件引擎（两栏布局：左侧搜索/标签，右侧可滚动线索列）
// ===================================================================
import { $, $$, showToast } from './utils.js';
import { getCaseProgress, saveClueUnlock, saveCaseEnding, resetCase } from './storage.js';
import { caseDB } from './cases/registry.js';

let _caseId   = null;
let _homeUrl  = '#';
let _activeTab = 'overview';

// ========= 弹窗 =========
(function setupModal() {
  $('modalClose').addEventListener('click', () => $('modalOverlay').classList.remove('show'));
  $('modalBackHome').addEventListener('click', () => {
    $('modalOverlay').classList.remove('show');
    window.location.href = _homeUrl;
  });
  $('modalOverlay').addEventListener('click', e => {
    if (e.target === $('modalOverlay')) $('modalOverlay').classList.remove('show');
  });
})();

// ========= 主入口 =========
export function renderCase(caseId, opts = {}) {
  if (opts.homeUrl) _homeUrl = opts.homeUrl;

  const c = caseDB[caseId];
  if (!c) { window.location.href = _homeUrl; return; }

  // 切案件时重置 tab
  if (_caseId !== caseId) { _activeTab = 'overview'; }
  _caseId = caseId;

  const cp       = getCaseProgress(caseId);
  const allKeys  = Object.keys(c.clueDB);
  const unlocked = cp.unlocked;
  const allDone  = unlocked.length === allKeys.length;
  const hasEnd   = !!cp.ending;

  // ① 顶部标题
  renderTop(c);

  // ② 标签导航
  renderTabs(allDone, hasEnd);

  // ③ 左侧标签内容
  renderTabContent(c, cp, allKeys, unlocked, allDone, hasEnd);

  // ④ 右侧线索标签列
  renderClueTags(c, allKeys, unlocked);

  // ⑤ 右侧进度条 + 推理按钮
  updateProgress(allKeys, unlocked);
  updateReasoningBtn(c, allDone, hasEnd);
}

// ========= 顶部标题 =========
function renderTop(c) {
  $('#caseTop').innerHTML = /* html */`
    <span class="case-badge" style="background:${c.badgeColor}">${c.badgeText}</span>
    <h1 class="case-title-main">${c.title}</h1>
    <p class="case-sub">${c.sub}</p>`;
}

// ========= 标签导航 =========
function renderTabs(allDone, hasEnd) {
  // 激活正确的 tab
  $$('.case-tab').forEach(t => {
    t.classList.remove('active');
    if (t.dataset.tab === _activeTab) t.classList.add('active');
  });

  // 推理标签状态
  const rt = $('#tabReasoning');
  if (!rt) return;
  const unlocked = !allDone && !hasEnd;
  if (unlocked) {
    rt.setAttribute('data-locked', '1');
    rt.innerHTML = '🔒 推理';
  } else {
    rt.removeAttribute('data-locked');
    rt.innerHTML = '⚖ 推理';
  }

  // 重新绑定点击（先清除旧的）
  $$('.case-tab').forEach(t => {
    const clone = t.cloneNode(true);
    t.parentNode.replaceChild(clone, t);
  });

  $$('.case-tab').forEach(t => {
    t.addEventListener('click', () => {
      const tab = t.dataset.tab;
      const locked = t.getAttribute('data-locked') === '1';
      if (locked) {
        const c = caseDB[_caseId];
        const cp = getCaseProgress(_caseId);
        showToast(`请先解锁全部线索（${cp.unlocked.length}/${Object.keys(c.clueDB).length}）`);
        return;
      }
      _activeTab = tab;

      // 只刷新左侧 + tab 高亮 + 顶部标签状态
      const c = caseDB[_caseId];
      const cp = getCaseProgress(_caseId);
      const allKeys = Object.keys(c.clueDB);
      const ul = cp.unlocked;
      const ad = ul.length === allKeys.length;
      const he = !!cp.ending;

      $$('.case-tab').forEach(tt => tt.classList.remove('active'));
      t.classList.add('active');
      renderTabs(ad, he);
      renderTabContent(c, cp, allKeys, ul, ad, he);
    });
  });
}

// ========= 左侧标签内容 =========
function renderTabContent(c, cp, allKeys, unlocked, allDone, hasEnd) {
  const el = $('#tabContent');

  if (_activeTab === 'overview') {
    const hint = unlocked.length
      ? `已解锁 ${unlocked.length}/${allKeys.length} 条线索`
      : '';
    el.innerHTML = `<div class="overview-text">${c.overview}</div>
      <div class="search-divider"></div>
      <div class="search-area">
        <div class="search-row">
          <input type="text" id="searchInput" placeholder="输入关键词搜索档案……" autocomplete="off">
          <button id="searchBtn">搜索</button>
        </div>
        <div class="search-hint" id="searchHint">${hint}</div>
      </div>`;
    bindSearch(c, allKeys);
    return;
  }

  if (_activeTab === 'reasoning') {
    if (hasEnd) {
      const e = c.endings[cp.ending];
      const color = cp.ending === 'true' ? 'var(--red)' : cp.ending === 'regret' ? 'var(--gold)' : '#999';
      el.innerHTML = /* html */`
        <div class="reasoning-area">
          <div class="ending-result">
            <div class="type">${e.type}</div>
            <div class="title" style="color:${color}">${e.title}</div>
            <div class="desc">${e.desc}</div>
            <button class="btn-replay" id="btnReplay">重新调查</button>
          </div>
        </div>`;
      $('btnReplay').addEventListener('click', () => {
        resetCase(_caseId);
        _activeTab = 'overview';
        renderCase(_caseId, { homeUrl: _homeUrl });
      });
    } else {
      el.innerHTML = /* html */`
        <div class="reasoning-area">
          <div class="reasoning-question">
            <h3 style="font-weight:400;color:#ccc;margin-bottom:12px;">⚖ 案件最终推理</h3>
            ${c.reasoningQuestion}
          </div>
          <div class="reasoning-choices" id="reasoningChoices">
            ${c.choices.map(ch => /* html */`
              <button class="choice-btn" data-ending="${ch.key}"
                ${!allDone ? 'disabled' : ''}>${ch.text}</button>
            `).join('')}
          </div>
        </div>`;
      bindReasoningBtn(c);
    }
  }
}

// ========= 搜索交互 =========
function bindSearch(c, allKeys) {
  const input = $('#searchInput');
  const btn   = $('#searchBtn');

  function doSearch() {
    const raw = input.value.trim();
    if (!raw) { showToast('请输入关键词'); return; }

    const cp = getCaseProgress(_caseId);
    const remaining = allKeys.filter(k => !cp.unlocked.includes(k));

    // 连续子串匹配：输入词与关键词互为连续子串
    const found = remaining.find(k =>
      k.includes(raw) || raw.includes(k)
    );

    if (!found) {
      showToast(`「${raw}」—— 档案库中无匹配记录`);
      return;
    }

    if (cp.unlocked.includes(found)) {
      showToast(`「${found}」—— 档案已调取`);
      return;
    }

    saveClueUnlock(_caseId, found);
    showToast(`✅ 解锁线索：「${found}」`);
    input.value = '';

    refreshRight(c, allKeys);
    setTimeout(() => { if (input) input.focus(); }, 100);
  }

  btn.addEventListener('click', doSearch);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  setTimeout(() => input.focus(), 150);
}

// ========= 刷新右侧面板 =========
function refreshRight(c, allKeys) {
  const cp       = getCaseProgress(_caseId);
  const unlocked = cp.unlocked;
  const allDone  = unlocked.length === allKeys.length;
  const hasEnd   = !!cp.ending;

  renderClueTags(c, allKeys, unlocked);
  updateProgress(allKeys, unlocked);
  updateReasoningBtn(c, allDone, hasEnd);
  renderTabs(allDone, hasEnd);

  const hintEl = $('#searchHint');
  if (hintEl) {
    hintEl.textContent = unlocked.length > 0
      ? `已解锁 ${unlocked.length}/${allKeys.length} 条线索`
      : '';
  }

  // 滚动到最新线索
  setTimeout(() => {
    const tags = $$('.clue-tag');
    if (tags.length) tags[tags.length - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// ========= 右侧线索标签 =========
function renderClueTags(c, allKeys, unlocked) {
  const el = $('#clueTagList');

  if (unlocked.length === 0) {
    el.innerHTML = '<div class="clue-empty">🔍 在左侧输入关键词搜索线索</div>';
    return;
  }

  el.innerHTML = allKeys
    .filter(k => unlocked.includes(k))
    .map((k, i) => /* html */`
      <div class="clue-tag" data-clue-key="${k}">
        <div class="clue-tag-bar">
          <span class="clue-tag-icon">▸</span>
          <span class="clue-tag-name">${k}</span>
        </div>
        <div class="clue-tag-body">${c.clueDB[k]}</div>
      </div>`)
    .join('');

  // 点击展开/收起
  $$('.clue-tag-bar').forEach(bar => {
    bar.addEventListener('click', () => {
      bar.parentElement.classList.toggle('expanded');
    });
  });
}

// ========= 进度条 =========
function updateProgress(allKeys, unlocked) {
  const pct = allKeys.length ? Math.round(unlocked.length / allKeys.length * 100) : 0;
  $('#clueProgressFill').style.width = pct + '%';
  $('#clueProgressText').textContent = `${unlocked.length} / ${allKeys.length}`;
}

// ========= 推理按钮（右侧底部） =========
function updateReasoningBtn(c, allDone, hasEnd) {
  const oldBtn = $('#btnReasoningMain');
  const newBtn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(newBtn, oldBtn);

  const found     = getCaseProgress(_caseId).unlocked.length;
  const total     = Object.keys(c.clueDB).length;

  if (hasEnd) {
    newBtn.textContent = '✅ 已结案';
    newBtn.disabled    = true;
  } else if (allDone) {
    newBtn.textContent = '⚖ 开始推理';
    newBtn.disabled    = false;
    newBtn.addEventListener('click', () => {
      _activeTab = 'reasoning';
      const cp = getCaseProgress(_caseId);
      const allKeys = Object.keys(c.clueDB);
      const ul = cp.unlocked;
      const ad = ul.length === allKeys.length;
      const he = !!cp.ending;
      $$('.case-tab').forEach(tc => tc.classList.remove('active'));
      const rTab = document.querySelector('.case-tab[data-tab="reasoning"]');
      if (rTab) rTab.classList.add('active');
      renderTabs(ad, he);
      renderTabContent(c, cp, allKeys, ul, ad, he);
    });
  } else {
    newBtn.textContent = `🔒 线索不足 (${found}/${total})`;
    newBtn.disabled    = true;
  }
}

// ========= 推理选项点击 =========
function bindReasoningBtn(c) {
  $$('#reasoningChoices .choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      saveCaseEnding(_caseId, btn.dataset.ending);
      showEndingModal(c, btn.dataset.ending);

      // 弹窗关闭后刷新页面
      const doRefresh = () => { renderCase(_caseId, { homeUrl: _homeUrl }); };
      $('modalClose').addEventListener('click', doRefresh, { once: true });
      // 返回档案馆按钮不刷新（直接跳走了）
    });
  });
}

// ========= 结局弹窗 =========
function showEndingModal(c, endingKey) {
  const e   = c.endings[endingKey];
  const box = $('#modalBox');
  box.className = 'modal-box ' + endingKey;
  $('#endingType').textContent  = e.type;
  $('#endingTitle').textContent = e.title;
  $('#endingDesc').innerHTML    = e.desc;
  $('modalOverlay').classList.add('show');
}
