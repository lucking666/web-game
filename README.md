# 暗流 · 民间悬案推理档案馆

一个**纯前端**的文字推理解谜小游戏。玩家扮演档案馆调查员，通过关键词搜索解锁线索、破译密码、完成问答推理，逐步揭开 10 桩民间悬案的真相。

可选接入腾讯 **CloudBase**（云开发）启用云端功能：**访问统计 / 云存档 / 侦探榜 / 档案留言**。未接入时全部功能自动降级，游戏照常纯本地运行。

## 快速开始

无需安装依赖、无需构建、无需后端。直接用浏览器打开 `index.html` 即可游玩（建议用本地静态服务器，如 VS Code Live Server，避免 ES Modules（ECMAScript Modules）的跨域限制）。

```bash
# 任选一种方式启动本地静态服务
npx serve .
# 或
python -m http.server 8080
```

## 核心玩法

1. **馆藏首页**：展示 10 张案件卡片，实时统计「已破案件 / 解锁线索 / 来访次数 / 今日来访」，点击卡片进入对应案件。
2. **线索搜索**：在概述页输入关键词解锁线索档案，线索正文中暗藏下一个关键词，形成环环相扣的搜索链。
3. **密码破译**：部分线索被密码锁保护，需从已有档案中推理出楼层、年份等数字密码方可调取。
4. **问答推理**：收集全部线索后解锁「推理」页，连续答对 3 道推理题即可定案。
5. **多结局设计**：每案内置普通 / 遗憾 / 真 三种结局（数据层已就绪）。
6. **进度存档**：线索解锁、密码破译、结案状态自动保存在浏览器本地存储（localStorage，本地存储）中，刷新不丢失；接入云端后可跨浏览器 / 设备同步。
7. **侦探榜**：每次结案自动记录用时并提交排行（同一案件保留个人最佳成绩），可在「侦探榜」页查看全站最快与各案 Top。
8. **档案留言**：每个案件底部可留言交流推理与感想。

## 技术架构

- **语言**：原生 JavaScript（ES Modules（ECMAScript Modules）模块化组织）
- **样式**：原生 CSS，暗黑档案馆风格
- **无框架依赖**：不引入框架，全部手写；仅云端功能按需 CDN（内容分发网络，Content Delivery Network）加载 CloudBase SDK

| 模块 | 文件 | 职责 |
|---|---|---|
| 案件引擎 | `js/case-engine.js` | 两栏布局渲染、线索搜索、密码验证、问答判题、结局弹窗、结案上报 |
| 首页看板 | `js/dashboard.js` | 案件卡片渲染、进度统计、访问统计展示、点击跳转 |
| 存储层 | `js/storage.js` | localStorage（本地存储）进度读写 + 云存档同步 |
| 云端接入 | `js/cloudbase.js` | CloudBase SDK 加载、匿名登录、统计 / 云存档 / 排行 / 留言接口（含降级容错） |
| 云端配置 | `js/cloudbase-config.js` | 环境 ID 与集合名配置（留空即关闭云端功能） |
| 留言组件 | `js/comments.js` | 案件页留言区渲染与提交 |
| 排行榜页 | `js/leaderboard.js` + `pages/leaderboard.html` | 侦探榜渲染 |
| 工具库 | `js/utils.js` | DOM（文档对象模型）查询、Toast（轻提示）等通用工具 |
| 案件数据 | `js/cases/*.js` | 10 个案件的线索库、密码、问答、结局数据 |
| 案件注册表 | `js/cases/registry.js` | 案件数据汇总与展示顺序 |

## 目录结构

```
web-game/
├── index.html            # 档案馆首页（案件看板）
├── css/
│   └── style.css         # 全局样式
├── js/
│   ├── case-engine.js    # 案件引擎
│   ├── dashboard.js      # 首页看板
│   ├── storage.js        # 进度存储（含云存档同步）
│   ├── cloudbase.js      # CloudBase 接入层
│   ├── cloudbase-config.js  # 云端配置（环境 ID）
│   ├── comments.js       # 案件留言组件
│   ├── leaderboard.js    # 侦探榜渲染
│   ├── utils.js          # 工具函数
│   └── cases/            # 案件数据（10 案 + 注册表）
└── pages/
    ├── leaderboard.html  # 侦探榜页面
    └── cases/            # 10 个案件页面
```

## 馆藏目录（10 案）

| # | 案件 ID | 案件名 | 题材 |
|---|---|---|---|
| 1 | `qingwushan` | 青雾山失踪案 | 山野失踪 |
| 2 | `gumu` | 古墓诡影 | 考古疑云 |
| 3 | `huaishu` | 槐树村 · 纸人抬轿 | 民俗怪谈 |
| 4 | `highway444` | 444号公路 · 夜行公交 | 都市怪谈 |
| 5 | `ward` | 静默病房 | 医院疑案 |
| 6 | `fogport` | 雾港笛声 | 港口悬案 |
| 7 | `snowtrain` | 雪夜列车 | 列车谜案 |
| 8 | `theater` | 旧戏院 | 剧院怪谈 |
| 9 | `library` | 闭馆之后 | 校园怪谈 |
| 10 | `belltower` | 钟楼回声 | 小镇悬案 |

## 接入云端（CloudBase，免费）

> 可跳过：不接入时，进度仅存本地，统计 / 榜 / 留言相关入口显示「未接入」提示，游戏不受影响。

### 1. 开通环境

1. 注册并登录腾讯云，在控制台开通 **云开发 CloudBase**（免费基础套餐即可）；
2. 创建一个环境，记下 **环境 ID**（形如 `xxx-1a2b3c`）；
3. 在「环境 → 登录授权」确认 **匿名登录** 已开启（默认开启）。

### 2. 创建数据库集合

在 CloudBase 控制台「数据库」中创建以下 5 个集合（类型默认即可）：

| 集合 | 用途 |
|---|---|
| `stats` | 全局访问统计（计数器） |
| `visit_logs` | 访问日志（IP / 时间 / 页面） |
| `player_saves` | 云存档 |
| `leaderboard` | 侦探榜 |
| `comments` | 档案留言 |

### 3. 配置安全规则

在「数据库 → 每个集合 → 权限设置 → 自定义安全规则」中填入：

**`stats`**（所有人可读可写，用于原子自增计数）
```json
{ "read": true, "write": true }
```

**`visit_logs`**（可写，不可读）
```json
{ "read": false, "write": true }
```

**`player_saves`**（仅创建者可读写自己的存档）
```json
{ "read": "auth.openid == doc._openid", "write": "auth.openid == doc._openid" }
```

**`leaderboard`**（所有人可读，仅创建者可写）
```json
{ "read": true, "write": "auth.openid == doc._openid" }
```

**`comments`**（所有人可读，仅创建者可写）
```json
{ "read": true, "write": "auth.openid == doc._openid" }
```

> 若排行榜 / 留言查询提示「缺少索引」，按控制台报错提示为对应集合创建 `case_id + created_at` / `case_id + time_used` 复合索引即可。

### 4. 配置安全域名

在「环境 → 安全配置 → Web 安全域名」中添加你的站点域名：

- GitHub Pages：`https://<你的用户名>.github.io`
- 本地联调：可临时在浏览器关闭安全域名校验，或使用 HTTPS 的本地隧道

### 5. 填入环境 ID

打开 `js/cloudbase-config.js`，把环境 ID 填入：

```js
export const CONFIG = {
  envId: '你的环境ID', // ← 填这里
  ...
};
```

保存后 **Ctrl+F5 强制刷新**，首页「来访次数」开始计数，侦探榜与留言即可使用。

## 版本与缓存

- 所有 JS 与 CSS 引用带版本号参数（如 `?v=20260822`），每次发布改动后统一 bump（递增）版本号，强制浏览器加载新文件。
- 新增模块（`cloudbase.js` / `comments.js` 等）的版本号随其被引用处的版本一起 bump。

## 后续规划

- 让问答答错时引导至普通 / 遗憾结局分支（当前答对固定触发真结局）
- 增加游客昵称自定义入口（当前为随机「馆员」+ 4 位编号）
- 新增更多案件与结局分支
