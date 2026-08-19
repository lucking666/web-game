// ===================================================================
// 暗流 — 案件引擎（两栏布局：左侧搜索/标签，右侧可滚动线索列）
// ===================================================================
import { $, $$, showToast } from './utils.js';
import { getCaseProgress, saveClueUnlock, saveCaseEnding, resetCase, savePasswordSolved, isPasswordSolved, saveDeepUnlock, isDeepUnlocked } from './storage.js';
import { caseDB } from './cases/registry.js?v=20260821';

let _caseId   = null;
let _homeUrl  = '#';
let _activeTab = 'overview';
let _quizIndex = 0;   // 推理问答当前题号（0 起）
const ENDING_TYPE_TEXT = { normal: '🌑 普通结局', regret: '🌥️ 遗憾结局', true: '🔴 真结局' };

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
    const puzzleSolved = isPasswordSolved(_caseId);
    let html = `<div class="overview-text">${c.overview}</div>
      <div class="search-divider"></div>
      <div class="search-area">
        <div class="search-row">
          <input type="text" id="searchInput" placeholder="输入关键词搜索档案……" autocomplete="off">
          <button id="searchBtn">搜索</button>
        </div>
        <div class="search-hint" id="searchHint">${hint}</div>
      </div>`;

    if (allDone) {
      if (puzzleSolved) {
        html += `<div class="password-section solved">
          <div class="password-solved">✅ 密码已破解</div>
          <div class="password-reward">${c.passwordReward}</div>
        </div>`;
      } else {
        html += `<div class="password-section">
          <div class="password-label">🔐 密码破译</div>
          <div class="password-hint">${c.passwordHint}</div>
          <div class="password-row">
            <input type="text" id="passwordInput" placeholder="输入密码……" autocomplete="off">
            <button id="passwordBtn">确认</button>
          </div>
        </div>`;
      }
    }

    el.innerHTML = html;
    bindSearch(c, allKeys);
    if (allDone && !puzzleSolved) bindPassword(c);
    return;
  }

  if (_activeTab === 'reasoning') {
    if (hasEnd) {
      const e = c.endings[cp.ending];
      const color = cp.ending === 'true' ? 'var(--red)' : cp.ending === 'regret' ? 'var(--gold)' : '#999';
      const endingType = ENDING_TYPE_TEXT[e.type] || e.type;
      const endingDesc = e.desc || e.text || '';
      el.innerHTML = /* html */`
        <div class="reasoning-area">
          <div class="ending-result">
            <div class="type">${endingType}</div>
            <div class="title" style="color:${color}">${e.title}</div>
            <div class="desc">${endingDesc}</div>
            <button class="btn-replay" id="btnReplay">重新调查</button>
          </div>
        </div>`;
      $('btnReplay').addEventListener('click', () => {
        resetCase(_caseId);
        _activeTab = 'overview';
        renderCase(_caseId, { homeUrl: _homeUrl });
      });
    } else {
      const puzzleSolved = isPasswordSolved(_caseId);
      const rewardHtml = puzzleSolved ? /* html */`
        <div class="puzzle-reward-hint" style="margin-bottom:16px;">
          <div class="password-solved">🔑 关键发现</div>
          <div class="password-reward">${c.passwordReward}</div>
        </div>` : '';
      const quiz = c.reasoningQuiz || [];

      if (!quiz.length) {
        // 降级：无问答数据的案件沿用旧版「一次选择」
        el.innerHTML = /* html */`
          <div class="reasoning-area">
            <div class="reasoning-question">
              <h3 style="font-weight:400;color:#ccc;margin-bottom:12px;">⚖ 案件最终推理</h3>
              ${c.reasoningQuestion}
            </div>
            ${rewardHtml}
            <div class="reasoning-choices" id="reasoningChoices">
              ${c.choices.map(ch => /* html */`
                <button class="choice-btn" data-ending="${ch.key}"
                  ${!allDone ? 'disabled' : ''}>${ch.text}</button>
              `).join('')}
            </div>
          </div>`;
        bindReasoningBtn(c);
      } else {
        // 问答制：连续提问，全部答对才能定案
        _quizIndex = 0;   // 进入推理视图时从第 1 题开始
        el.innerHTML = /* html */`
          <div class="reasoning-area">
            <div class="reasoning-question">
              <h3 style="font-weight:400;color:#ccc;margin-bottom:12px;">⚖ 案件最终推理</h3>
              ${c.reasoningQuestion}
            </div>
            <div class="quiz-rule">回答以下全部问题，任何一处与档案矛盾，本次推理即告失败。</div>
            ${rewardHtml}
            <div class="quiz-box" id="quizBox">${renderQuizHtml(c, quiz, 0)}</div>
          </div>`;
        bindReasoningQuiz(c);
      }
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

    // 连续子串匹配：输入词与关键词互为连续子串（在全部线索中查找，
    // 已解锁的关键词也要能命中，避免误报"无匹配"）
    const found = allKeys.find(k =>
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

  // 线索找齐后刷新概述面板，显示密码破译区域
  if (allDone && _activeTab === 'overview') {
    renderTabContent(c, cp, allKeys, unlocked, allDone, hasEnd);
  }
}

// ========= 密码破译 =========
function bindPassword(c) {
  const input = $('#passwordInput');
  const btn   = $('#passwordBtn');
  if (!input || !btn) return;

  function check() {
    const val = input.value.trim();
    if (!val) { showToast('请输入密码'); return; }
    if (val === c.password) {
      savePasswordSolved(_caseId);
      showToast('✅ 密码正确！发现关键线索');
      setTimeout(() => {
        input.disabled = true;
        btn.disabled = true;
        const cp = getCaseProgress(_caseId);
        const allKeys = Object.keys(c.clueDB);
        renderTabContent(c, cp, allKeys, cp.unlocked, true, !!cp.ending);
      }, 1200);
    } else {
      showToast('❌ 密码错误，请重新尝试');
      input.value = '';
      setTimeout(() => input.focus(), 100);
    }
  }

  btn.addEventListener('click', check);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
  setTimeout(() => input.focus(), 200);
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
    .map((k, i) => {
      const lockedDef = c.lockedClues && c.lockedClues[k];
      const deepUnlocked = lockedDef ? isDeepUnlocked(_caseId, k) : true;
      if (lockedDef && !deepUnlocked) {
        return /* html */`
          <div class="clue-tag locked" data-clue-key="${k}">
            <div class="clue-tag-bar">
              <span class="clue-tag-icon">🔒</span>
              <span class="clue-tag-name">${k}<span class="clue-locked-label"> （已加密）</span></span>
            </div>
            <div class="clue-tag-body">
              <div class="locked-preview">${lockedDef.lockedPreview}</div>
              <div class="locked-hint">${lockedDef.lockHint}</div>
              <div class="locked-row">
                <input type="text" class="lock-input" placeholder="输入密码……" autocomplete="off">
                <button class="lock-btn">确认</button>
              </div>
            </div>
          </div>`;
      }
      return /* html */`
        <div class="clue-tag" data-clue-key="${k}">
          <div class="clue-tag-bar">
            <span class="clue-tag-icon">▸</span>
            <span class="clue-tag-name">${k}</span>
          </div>
          <div class="clue-tag-body">${c.clueDB[k]}</div>
        </div>`;
    })
    .join('');

  // 点击展开/收起
  $$('.clue-tag-bar').forEach(bar => {
    bar.addEventListener('click', () => {
      bar.parentElement.classList.toggle('expanded');
    });
  });

  // 绑定锁的密码输入
  $$('.lock-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tag    = btn.closest('.clue-tag');
      const keyword = tag.dataset.clueKey;
      const input   = tag.querySelector('.lock-input');
      const lockedDef = c.lockedClues[keyword];
      if (!input || !lockedDef) return;
      const val = input.value.trim();
      if (!val) { showToast('请输入密码'); return; }
      if (val === lockedDef.password) {
        saveDeepUnlock(_caseId, keyword);
        showToast(`✅ 密码正确！「${keyword}」档案已解密`);
        const cp = getCaseProgress(_caseId);
        refreshRight(c, allKeys);
      } else {
        showToast('❌ 密码错误');
        input.value = '';
        input.focus();
      }
    });
  });

  // 密码输入框回车
  $$('.lock-input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const tag = input.closest('.clue-tag');
        const btn = tag.querySelector('.lock-btn');
        if (btn) btn.click();
      }
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

// ========= 推理选项点击（旧版：一次选择） =========
function bindReasoningBtn(c) {
  $$('#reasoningChoices .choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      saveCaseEnding(_caseId, btn.dataset.ending);
      showEndingModal(c, btn.dataset.ending);

      // 弹窗关闭后刷新页面（点「知道了」或点背景均刷新；返回档案馆直接跳走）
      bindEndingModalRefresh();
    });
  });
}

// ========= 推理问答（多题制） =========
// 渲染单道题：进度 + 题目 + 选项
function renderQuizHtml(c, quiz, idx) {
  const item = quiz[idx];
  return /* html */`
    <div class="quiz-progress">第 ${idx + 1} / ${quiz.length} 题</div>
    <div class="quiz-question">${item.q}</div>
    <div class="quiz-options" id="quizOptions">
      ${item.options.map((op, i) => /* html */`
        <button class="quiz-option" data-idx="${i}">${op}</button>
      `).join('')}
    </div>`;
}

// 渲染「推理失败」面板：可重新推理
function renderQuizFailHtml() {
  return /* html */`
    <div class="reasoning-fail">
      <div class="fail-icon">✗</div>
      <div class="fail-title">推理失败</div>
      <div class="fail-desc">你的结论与现场档案存在矛盾，无法自圆其说。<br>真凶仍藏在迷雾之中——请重新审视已掌握的线索，再次推理。</div>
      <button class="btn-retry" id="btnRetryReasoning">重新推理</button>
    </div>`;
}

// 只刷新题区（保留进度，避免整块闪烁）
function renderQuizOnly(c, quiz) {
  const box = $('#quizBox');
  if (!box) return;
  box.innerHTML = renderQuizHtml(c, quiz, _quizIndex);
  bindReasoningQuiz(c);
}

// 渲染失败面板并绑定「重新推理」
function renderQuizFail(c, quiz) {
  const box = $('#quizBox');
  if (!box) return;
  box.innerHTML = renderQuizFailHtml();
  const retry = $('#btnRetryReasoning');
  if (retry) {
    retry.addEventListener('click', () => {
      _quizIndex = 0;
      renderQuizOnly(c, quiz);
    });
  }
}

// 绑定选项点击：答对进下一题，答错判失败
function bindReasoningQuiz(c) {
  const quiz = c.reasoningQuiz || [];
  if (!quiz.length) return;

  $$('#quizOptions .quiz-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx  = parseInt(btn.dataset.idx, 10);
      const item = quiz[_quizIndex];

      // 锁定所有选项，防止连点
      $$('#quizOptions .quiz-option').forEach(b => { b.disabled = true; });

      if (idx === item.answer) {
        btn.classList.add('correct');
        showToast('✅ 回答正确，继续推理');
        setTimeout(() => {
          _quizIndex++;
          if (_quizIndex >= quiz.length) {
            // 全部答对 → 定案成功（真结局）
            saveCaseEnding(_caseId, 'true');
            showEndingModal(c, 'true');
            // 弹窗关闭后刷新页面（点「知道了」或点背景均刷新；返回档案馆直接跳走）
            bindEndingModalRefresh();
          } else {
            renderQuizOnly(c, quiz);
          }
        }, 700);
      } else {
        btn.classList.add('wrong');
        showToast('❌ 回答错误，推理存在矛盾');
        setTimeout(() => {
          renderQuizFail(c, quiz);
        }, 700);
      }
    });
  });
}

// ========= 结局弹窗 =========
// 弹窗关闭后刷新案件视图（点「知道了」或点背景均刷新；返回档案馆直接跳走）
function bindEndingModalRefresh() {
  const doRefresh = () => { renderCase(_caseId, { homeUrl: _homeUrl }); };
  $('modalClose').addEventListener('click', doRefresh, { once: true });
  $('modalOverlay').addEventListener('click', e => {
    if (e.target === $('modalOverlay')) doRefresh();
  }, { once: true });
}

function showEndingModal(c, endingKey) {
  const e   = c.endings[endingKey];
  const box = $('#modalBox');
  box.className = 'modal-box ' + endingKey;
  $('#endingType').textContent  = ENDING_TYPE_TEXT[e.type] || e.type;
  $('#endingTitle').textContent = e.title;
  $('#endingDesc').innerHTML    = e.desc || e.text || '';
  $('modalOverlay').classList.add('show');
}
