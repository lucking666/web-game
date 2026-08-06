// ===================================================================
// 暗流 — 本地存储层
// ===================================================================

const KEY = 'anliu_archive';

/** 读取全部数据 */
export function loadData() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { user: null, cases: {} };
  } catch (_) {
    return { user: null, cases: {} };
  }
}

/** 写入全部数据 */
export function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

/** 当前登录用户 */
export function getUser() {
  return loadData().user;
}

export function setUser(name) {
  const d = loadData();
  d.user = name;
  saveData(d);
}

export function clearUser() {
  const d = loadData();
  d.user = null;
  saveData(d);
}

/** 获取案件进度 */
export function getCaseProgress(caseId) {
  const d = loadData();
  return d.cases[caseId] || { unlocked: [], ending: null };
}

/** 解锁一条线索 */
export function saveClueUnlock(caseId, keyword) {
  const d = loadData();
  if (!d.cases[caseId]) d.cases[caseId] = { unlocked: [], ending: null };
  if (!d.cases[caseId].unlocked.includes(keyword)) {
    d.cases[caseId].unlocked.push(keyword);
  }
  saveData(d);
}

/** 保存案件结局 */
export function saveCaseEnding(caseId, ending) {
  const d = loadData();
  if (!d.cases[caseId]) d.cases[caseId] = { unlocked: [], ending: null };
  d.cases[caseId].ending = ending;
  saveData(d);
}

/** 重置案件（清空进度与结局） */
export function resetCase(caseId) {
  const d = loadData();
  if (d.cases[caseId]) {
    d.cases[caseId] = { unlocked: [], ending: null };
  }
  saveData(d);
}

/** 计算统计信息 */
export function getStats() {
  const d = loadData();
  const ids = Object.keys(d.cases);
  let solved = 0, clues = 0;
  ids.forEach(id => {
    const c = d.cases[id];
    clues += (c.unlocked || []).length;
    if (c.ending) solved++;
  });
  return { total: ids.length, solved, clues };
}
