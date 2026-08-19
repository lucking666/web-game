// ===================================================================
// 暗流 — CloudBase 接入层
// 负责：SDK 加载 / 匿名登录 / 访问统计 / 云存档 / 排行榜 / 留言。
// 所有方法都做了容错：未配置环境 ID 或网络异常时静默降级，
// 返回 false / null / []，绝不抛错、绝不阻塞游戏运行。
// ===================================================================
import { CONFIG } from './cloudbase-config.js?v=20260822';

// CloudBase JS SDK（优先本地 vendor 同域加载，失败回退官方静态托管 CDN）
const SDK_URLS = [
  new URL('./vendor/cloudbase.full.js', import.meta.url).href,
  'https://static.cloudbase.net/cloudbase-js-sdk/2.32.0/cloudbase.full.js'
];

let _app  = null;   // CloudBase 应用实例
let _db   = null;   // 数据库实例
let _ready = null;  // Promise<boolean>，初始化成功与否

/** 是否已配置环境 ID */
export function isConfigured() {
  return !!CONFIG.envId;
}

/** 加载 SDK（Promise 化，全局变量为 window.cloudbase） */
function loadSdk() {
  return new Promise((resolve, reject) => {
    if (window.cloudbase) return resolve(window.cloudbase);
    let idx = 0;
    const tryNext = () => {
      if (idx >= SDK_URLS.length) return reject(new Error('SDK 加载失败'));
      const s = document.createElement('script');
      s.src = SDK_URLS[idx++];
      s.onload  = () => resolve(window.cloudbase);
      s.onerror = tryNext;
      document.head.appendChild(s);
    };
    tryNext();
  });
}

/** 初始化并匿名登录（幂等）。成功返回 true，未配置/失败返回 false。 */
export function ensureReady() {
  if (!isConfigured()) return Promise.resolve(false);
  if (_ready) return _ready;
  _ready = (async () => {
    try {
      const cloudbase = await loadSdk();
      const app = cloudbase.init({ env: CONFIG.envId });
      const auth = app.auth({ persistence: 'local' });
      let loginState = await auth.getLoginState();
      if (!loginState) loginState = await auth.signInAnonymously();
      if (!loginState) return false;
      _app = app;
      _db = app.database();
      return true;
    } catch (_) {
      _ready = null; // 失败不缓存，允许下次重试
      return false;
    }
  })();
  return _ready;
}

/** 数据库更新操作符 */
function cmd() {
  return _db ? _db.command : null;
}

// ===================================================================
// 小工具
// ===================================================================
function fmtDate(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * 获取公网 IP。
 * 用 <script> 标签加载 JSONP 接口（搜狐 cityjson），
 * script 标签不受 CORS 限制，不会在 Network 面板制造跨域报错。
 * 全部失败返回 'unknown'。
 */
function getPublicIp() {
  return new Promise((resolve) => {
    let settled = false;
    const done = ip => {
      if (settled) return;
      settled = true;
      try { document.head.removeChild(s); } catch (_) {}
      resolve(ip);
    };

    const s = document.createElement('script');
    s.src = 'https://pv.sohu.com/cityjson?ie=utf-8&t=' + Date.now();
    s.onload = () => {
      try {
        const ip = window.returnCitySN && window.returnCitySN.cip;
        if (ip && /^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return done(ip);
      } catch (_) {}
      done('unknown');
    };
    s.onerror = () => done('unknown');
    document.head.appendChild(s);
  });
}

/** 秒数 → "X分Y秒" */
export function fmtTime(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}

/** 获取展示昵称：优先本地自定义，否则随机生成一个并记住 */
export function getNickname() {
  let n = localStorage.getItem('anliu_nick');
  if (!n) {
    n = '馆员' + String(Math.floor(1000 + Math.random() * 9000));
    localStorage.setItem('anliu_nick', n);
  }
  return n;
}

/** 自定义昵称（截断到 12 字） */
export function setNickname(name) {
  const v = String(name || '').trim();
  localStorage.setItem('anliu_nick', v ? v.slice(0, 12) : getNickname());
  return getNickname();
}

// ===================================================================
// 访问统计
// ===================================================================
/**
 * 上报一次访问（首页调用）。
 * stats 集合的 global 文档维护 visits / today 计数器（原子自增），
 * visit_logs 集合逐条记录 IP、页面与时间。
 */
export async function reportVisit(page) {
  if (!(await ensureReady())) return;
  try {
    const _ = cmd();
    const now  = new Date();
    const today = fmtDate(now);
    const iso  = now.toISOString();
    const ip   = await getPublicIp();
    const col  = _db.collection(CONFIG.cols.stats);
    const docRef = col.doc('global');
    // 注意：CloudBase 对不存在的 doc 执行 get() 返回 { data: [] }（空数组），
    // 不能用 cur.data 判断存在性，必须看数组长度。
    const cur = await docRef.get().catch(() => null);
    const docs = cur && Array.isArray(cur.data) ? cur.data : [];
    const data = docs.length ? docs[0] : null;

    if (!data) {
      await docRef.set({ visits: 1, today: 1, lastDate: today, lastIp: ip, lastVisit: iso });
    } else {
      if (data.lastDate !== today) {
        await docRef.update({ today: 0, lastDate: today });
      }
      await docRef.update({ visits: _.inc(1), today: _.inc(1), lastIp: ip, lastVisit: iso });
    }

    // 访问日志（失败不影响计数）
    _db.collection(CONFIG.cols.visits).add({
      ip,
      page,
      ua: (navigator.userAgent || '').slice(0, 200),
      created_at: iso
    }).catch(() => {});
  } catch (_) { /* 静默降级 */ }
}

/** 读取全局访问统计（未接入或尚无数据返回 null） */
export async function fetchStats() {
  if (!(await ensureReady())) return null;
  try {
    const res = await _db.collection(CONFIG.cols.stats).doc('global').get();
    const docs = res && Array.isArray(res.data) ? res.data : [];
    return docs.length ? docs[0] : null;
  } catch (_) {
    return null;
  }
}

// ===================================================================
// 云存档
// ===================================================================
/** 把本地数据推送为云存档（每个匿名用户仅一份，覆盖旧档） */
export async function pushSave(data) {
  if (!(await ensureReady())) return false;
  try {
    const payload = JSON.parse(JSON.stringify(data));
    payload._updatedAt = Date.now();
    delete payload._id;
    delete payload._openid;
    const col = _db.collection(CONFIG.cols.saves);
    const res = await col.limit(1).get(); // 安全规则限定为当前用户自己的文档
    if (res && res.data && res.data.length) {
      await col.doc(res.data[0]._id).update(payload);
    } else {
      await col.add(payload);
    }
    return true;
  } catch (_) {
    return false;
  }
}

/** 拉取云存档（无则返回 null） */
export async function pullSave() {
  if (!(await ensureReady())) return null;
  try {
    const res = await _db.collection(CONFIG.cols.saves).limit(1).get();
    if (!res || !res.data || !res.data.length) return null;
    const d = res.data[0];
    return {
      user: d.user ?? null,
      cases: d.cases || {},
      _updatedAt: d._updatedAt || 0
    };
  } catch (_) {
    return null;
  }
}

// ===================================================================
// 排行榜
// ===================================================================
/**
 * 提交一次结案成绩（同一用户同一案件只保留用时更短的一次）。
 * entry: { case_id, case_name, nickname, time_used, ending }
 */
export async function submitLeaderboard(entry) {
  if (!(await ensureReady())) return false;
  try {
    const col = _db.collection(CONFIG.cols.leaderboard);
    const payload = {
      case_id: entry.case_id,
      case_name: entry.case_name,
      nickname: entry.nickname,
      time_used: Math.max(0, Math.round(entry.time_used || 0)),
      ending: entry.ending,
      created_at: new Date().toISOString()
    };
    const res = await col.where({ case_id: entry.case_id }).limit(1).get();
    if (res && res.data && res.data.length) {
      const old = res.data[0];
      if (payload.time_used < (old.time_used || Infinity)) {
        await col.doc(old._id).update(payload);
      }
    } else {
      await col.add(payload);
    }
    return true;
  } catch (_) {
    return false;
  }
}

/** 拉取排行榜（caseId 为空则取全站，按用时升序） */
export async function fetchLeaderboard(caseId, limit = 10) {
  if (!(await ensureReady())) return [];
  try {
    const col = _db.collection(CONFIG.cols.leaderboard);
    const q = caseId ? col.where({ case_id: caseId }) : col;
    const res = await q.orderBy('time_used', 'asc').limit(limit).get();
    return (res && res.data ? res.data : []).map(d => ({
      nickname: d.nickname,
      case_id: d.case_id,
      case_name: d.case_name,
      time_used: d.time_used,
      ending: d.ending,
      created_at: d.created_at
    }));
  } catch (_) {
    return [];
  }
}

// ===================================================================
// 留言
// ===================================================================
/** 提交一条留言 */
export async function submitComment(caseId, nickname, content) {
  if (!(await ensureReady())) return false;
  try {
    const text = String(content || '').trim().slice(0, 300);
    if (!text) return false;
    await _db.collection(CONFIG.cols.comments).add({
      case_id: caseId,
      nickname: String(nickname || '').slice(0, 12),
      content: text,
      created_at: new Date().toISOString()
    });
    return true;
  } catch (_) {
    return false;
  }
}

/** 拉取某案件留言（按时间倒序） */
export async function fetchComments(caseId, limit = 50) {
  if (!(await ensureReady())) return [];
  try {
    const res = await _db.collection(CONFIG.cols.comments)
      .where({ case_id: caseId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get();
    return (res && res.data ? res.data : []).map(d => ({
      nickname: d.nickname,
      content: d.content,
      created_at: d.created_at
    }));
  } catch (_) {
    return [];
  }
}
