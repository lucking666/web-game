// ===================================================================
// 暗流 — 本地存储层（含云存档同步）
// 本地立即读写；云端在未配置环境或网络异常时静默跳过，不影响运行。
// ===================================================================
import { pushSave, pullSave } from './cloudbase.js?v=20260830';

const KEY = 'anliu_archive';

let _cloudSynced = false; // 本次会话是否已尝试拉取云端存档
let _pushTimer   = null;  // 云推送防抖定时器

function readLocal() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { user: null, cases: {}, _updatedAt: 0 };
  } catch (_) {
    return { user: null, cases: {}, _updatedAt: 0 };
  }
}

function writeLocal(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

/** 首次加载后尝试拉取云端存档；云端较新则覆盖本地并广播刷新页面 */
function syncFromCloud(local) {
  if (_cloudSynced) return;
  _cloudSynced = true;
  pullSave().then(cloud => {
    if (!cloud || !cloud.cases) return;
    const localT = local._updatedAt || 0;
    const cloudT = cloud._updatedAt || 0;
    if (cloudT > localT) {
      writeLocal({
        user: cloud.user !== undefined ? cloud.user : local.user,
        cases: cloud.cases || {},
        _updatedAt: cloudT
      });
      window.dispatchEvent(new CustomEvent('cloud-save-loaded'));
    }
  }).catch(() => {});
}

/** 读取全部数据（本地优先，随后异步合并云端） */
export function loadData() {
  const local = readLocal();
  syncFromCloud(local);
  return local;
}

/** 写入全部数据（本地立即写入，云端防抖推送） */
export function saveData(data) {
  const d = { ...data, _updatedAt: Date.now() };
  writeLocal(d);
  clearTimeout(_pushTimer);
  _pushTimer = setTimeout(() => pushSave(d), 800);
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

/** 密码破译 */
export function savePasswordSolved(caseId) {
  const d = loadData();
  if (!d.cases[caseId]) d.cases[caseId] = { unlocked: [], ending: null };
  d.cases[caseId].puzzleSolved = true;
  saveData(d);
}

export function isPasswordSolved(caseId) {
  const cp = getCaseProgress(caseId);
  return !!cp.puzzleSolved;
}

/** 在线索内部进一步解锁（深层次解锁） */
export function saveDeepUnlock(caseId, keyword) {
  const d = loadData();
  if (!d.cases[caseId]) d.cases[caseId] = { unlocked: [], ending: null };
  if (!d.cases[caseId].deepUnlocked) d.cases[caseId].deepUnlocked = [];
  if (!d.cases[caseId].deepUnlocked.includes(keyword)) {
    d.cases[caseId].deepUnlocked.push(keyword);
  }
  saveData(d);
}

export function isDeepUnlocked(caseId, keyword) {
  const cp = getCaseProgress(caseId);
  return (cp.deepUnlocked || []).includes(keyword);
}

/** 拼图线索解锁（完成拼图后才能查看的线索） */
export function savePuzzleSolved(caseId, keyword) {
  const d = loadData();
  if (!d.cases[caseId]) d.cases[caseId] = { unlocked: [], ending: null };
  if (!d.cases[caseId].puzzleSolved) d.cases[caseId].puzzleSolved = [];
  if (!d.cases[caseId].puzzleSolved.includes(keyword)) {
    d.cases[caseId].puzzleSolved.push(keyword);
  }
  saveData(d);
}

export function isPuzzleSolved(caseId, keyword) {
  const cp = getCaseProgress(caseId);
  return (cp.puzzleSolved || []).includes(keyword);
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
