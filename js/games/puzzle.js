// ===================================================================
// 暗流 — 拼图小游戏（N×N 滑动拼图，弹窗形式）
// 用于「拼图线索」玩法：线索被锁定，完成拼图后解锁。
// 用法：
//   import { openPuzzleGame } from './games/puzzle.js';
//   openPuzzleGame({
//     title: '🧩「监控」拼图解锁',
//     hint: '将画面碎片拼回原图，还原线索。',
//     image: 'images/covers/fairground.png',
//     size: 3,
//     onComplete: () => { ... }
//   });
// 尺寸自适应：拼图板按弹窗实际可用宽度动态计算边长，
// 任何屏幕尺寸下都能完整显示，无需滚动。窗口缩放时自动跟随重排。
// ===================================================================

const GAP = 4; // 格间缝隙（px）

let _overlay = null; // 当前打开的拼图弹窗

/** 根据容器可用宽度计算格子边长，保证拼图完整放进弹窗 */
function calcCell(availPx, size) {
  const inner = Math.max(0, availPx - GAP * (size + 1));
  return Math.max(34, Math.floor(inner / size));
}

/** 打开拼图弹窗 */
export function openPuzzleGame(opts) {
  closePuzzleGame();
  const size = Math.max(2, Math.min(4, opts.size || 3));

  const overlay = document.createElement('div');
  overlay.className = 'puzzle-overlay';
  overlay.innerHTML = /* html */`
    <div class="puzzle-box">
      <div class="puzzle-head">
        <span class="puzzle-title">${opts.title || '🧩 拼图解锁'}</span>
        <button type="button" class="puzzle-close" aria-label="关闭">✕</button>
      </div>
      ${opts.hint ? `<div class="puzzle-hint">${opts.hint}</div>` : ''}
      <div class="puzzle-stage"><div class="puzzle-board"></div></div>
      <div class="puzzle-foot">
        <span class="puzzle-moves">步数 0</span>
        <button type="button" class="puzzle-reset">重新打乱</button>
      </div>
      <div class="puzzle-done" hidden>
        <div class="puzzle-done-icon">🎉</div>
        <div class="puzzle-done-text">拼图完成！画面已还原</div>
        <button type="button" class="puzzle-claim">领取线索</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const boardEl = overlay.querySelector('.puzzle-board');
  const stageEl = overlay.querySelector('.puzzle-stage');
  const doneEl  = overlay.querySelector('.puzzle-done');
  const moveEl  = overlay.querySelector('.puzzle-moves');

  const state = { size, n: size * size, board: [], empty: 0, moves: 0, done: false, cell: 80 };

  function boardPx() { return state.cell * state.size + GAP * (state.size + 1); }
  function rc(pos)   { return { r: Math.floor(pos / state.size), c: pos % state.size }; }

  /** 按弹窗当前可用宽度重新计算格子边长（打开时 & 窗口缩放时调用） */
  function applyLayout() {
    const avail = Math.max(120, stageEl.clientWidth || 320);
    state.cell = calcCell(avail, state.size);
    const px = boardPx();
    boardEl.style.width  = px + 'px';
    boardEl.style.height = px + 'px';
  }

  function placeTile(t, pos) {
    const { r, c } = rc(pos);
    t.style.left = (c * state.cell + GAP) + 'px';
    t.style.top  = (r * state.cell + GAP) + 'px';
  }

  function buildTiles() {
    boardEl.innerHTML = '';
    const px   = boardPx();
    const cell = state.cell;
    for (let pos = 0; pos < state.n; pos++) {
      const tileId = state.board[pos];
      if (tileId === 0) continue; // 空位不渲染
      const t = document.createElement('div');
      t.className = 'puzzle-tile';
      t.dataset.tile = tileId;
      if (opts.image) {
        const f = rc(tileId - 1); // 该块最终位置 → 决定背景取样
        t.style.backgroundImage = `url("${opts.image}")`;
        t.style.backgroundSize = `${px}px ${px}px`;
        t.style.backgroundPosition = `-${f.c * cell}px -${f.r * cell}px`;
      } else {
        t.textContent = tileId; // 无图时降级为数字拼图
      }
      t.style.width  = (cell - GAP) + 'px';
      t.style.height = (cell - GAP) + 'px';
      placeTile(t, pos);
      boardEl.appendChild(t);
    }
  }

  function updateMoves() { moveEl.textContent = '步数 ' + state.moves; }

  function isWin() {
    return state.board.every((v, i) => v === (i + 1) % state.n);
  }

  function finish() {
    state.done = true;
    doneEl.hidden = false;
    doneEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /** 洗牌：从完成态随机走 n*40 步合法移动，保证必然可解 */
  function shuffle() {
    const board = Array.from({ length: state.n }, (_, i) => (i + 1) % state.n);
    let empty = state.n - 1;
    for (let step = 0; step < state.n * 40; step++) {
      const { r, c } = rc(empty);
      const cands = [];
      if (r > 0) cands.push(empty - state.size);
      if (r < state.size - 1) cands.push(empty + state.size);
      if (c > 0) cands.push(empty - 1);
      if (c < state.size - 1) cands.push(empty + 1);
      const pick = cands[(Math.random() * cands.length) | 0];
      board[empty] = board[pick];
      board[pick] = 0;
      empty = pick;
    }
    state.board = board;
    state.empty = empty;
    state.moves = 0;
    state.done = false;
    doneEl.hidden = true;
    updateMoves();
    buildTiles();
  }

  // 点击移动
  boardEl.addEventListener('click', e => {
    const t = e.target.closest('.puzzle-tile');
    if (!t || state.done) return;
    const tileId = parseInt(t.dataset.tile, 10);
    const pos    = state.board.indexOf(tileId);
    const { r, c }  = rc(pos);
    const er = Math.floor(state.empty / state.size);
    const ec = state.empty % state.size;
    if (Math.abs(r - er) + Math.abs(c - ec) !== 1) return; // 非相邻块忽略
    state.board[state.empty] = tileId;   // 空格 ← 点击块
    state.board[pos] = 0;                // 原位置变空格
    placeTile(t, state.empty);
    state.empty = pos;
    state.moves++;
    updateMoves();
    if (isWin()) finish();
  });

  overlay.querySelector('.puzzle-reset').addEventListener('click', shuffle);
  overlay.querySelector('.puzzle-claim').addEventListener('click', () => {
    closePuzzleGame();
    if (typeof opts.onComplete === 'function') opts.onComplete();
  });
  overlay.querySelector('.puzzle-close').addEventListener('click', closePuzzleGame);
  overlay.addEventListener('click', e => { if (e.target === overlay) closePuzzleGame(); });

  // 打开时布局一次，窗口缩放时跟随重排
  applyLayout();
  const onResize = () => {
    if (!_overlay) return;
    applyLayout();
    buildTiles();
  };
  window.addEventListener('resize', onResize);
  overlay._onResize = onResize;

  _overlay = overlay;
  shuffle();
}

/** 关闭拼图弹窗 */
export function closePuzzleGame() {
  if (_overlay) {
    if (_overlay._onResize) window.removeEventListener('resize', _overlay._onResize);
    if (_overlay.parentNode) _overlay.parentNode.removeChild(_overlay);
  }
  _overlay = null;
}
