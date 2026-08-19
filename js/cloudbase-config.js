// ===================================================================
// 暗流 — CloudBase 云端服务配置
// ===================================================================
// 接入步骤详见 README「接入云端」章节。
//
// 1. 在腾讯云控制台开通「云开发 CloudBase」并创建一个环境；
// 2. 把环境 ID 填入下方 envId，例如 'anliu-1a2b3c'；
// 3. 在控制台「数据库」中创建以下 5 个集合并按 README 配置安全规则；
// 4. 在「环境 → 安全配置」中添加本站安全域名（GitHub Pages 域名）。
//
// envId 留空时，全部云端功能自动关闭（降级为纯本地），游戏照常运行。

export const CONFIG = {
  envId: 'anliu-d3glcrqjvd86ed03d', // ← 在这里填入你的 CloudBase 环境 ID
  cols: {
    stats: 'stats',              // 全局访问统计（单文档 global）
    visits: 'visit_logs',        // 访问日志（IP / 时间 / 页面）
    saves: 'player_saves',       // 云存档
    leaderboard: 'leaderboard',  // 排行榜
    comments: 'comments'         // 留言
  }
};
