// ===================================================================
// 暗流 — 工具函数
// ===================================================================

/** 快捷选取单个元素（自动去掉 # 前缀） */
export function $(id) {
  if (typeof id === 'string' && id.startsWith('#')) id = id.slice(1);
  return document.getElementById(id);
}

/** 快捷选取多个元素 */
export function $$(selector, scope) {
  return (scope || document).querySelectorAll(selector);
}

/** Toast 提示 */
let _toastTimer;
export function showToast(msg) {
  clearTimeout(_toastTimer);
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/** 洗牌 */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 哈希导航 */
export function navigateTo(route) {
  window.location.hash = route;
}
