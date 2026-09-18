# 潮玩收藏册 · 小程序（toy-collection-mp）

> 双 IP 可切换的潮玩 / 宝可梦收藏管理小程序（微信原生）。
> 一个帮你记录「拥有什么、还差什么、值多少钱、想要什么」的私人收藏册。

## 一、功能一览

| 模块 | 说明 |
| --- | --- |
| 🧸 娃柜（首页） | 收藏墙卡片流 + 顶部概览（拥有数 / 估值 / 图鉴完成度） |
| 📖 图鉴 | 按 IP 系列浏览，进度条显示「已集 X/N」，标「仅看缺失」快速查漏 |
| ⭐ 心愿单 | 种草清单，可一键「标记为已入手」或移除 |
| 📊 统计 | 总估值 / 累计投入 / 账面盈亏 + 系列完成度 + 稀有度分布 |
| ⚙️ 设置 | 切换收藏 IP（泡泡玛特 / 宝可梦）、清空数据、复制仓库地址 |

- **双 IP 可切换**：泡泡玛特（潮玩，系列进度 + 隐藏款）、宝可梦（关都图鉴）。切换在「设置」里完成，数据各自独立。
- **纯本地**：收藏记录存在微信本机存储（`wx.setStorageSync`），**不上传任何服务器**，无需账号、无需后端。
- **泡泡玛特潮玩风**：圆角卡片、柔阴影、马卡龙渐变；切到宝可梦自动换成蓝黄主题色。

## 二、目录结构

```
toy-collection-mp/
├── app.js / app.json / app.wxss      # 全局：当前 IP、主题、tabBar
├── project.config.json / sitemap.json
├── data/
│   ├── popmart.js                    # 泡泡玛特示例库（3 系列 / 21 娃）
│   └── pokemon.js                    # 宝可梦示例库（关都 34 只）
├── utils/
│   ├── source.js                     # 双 IP 数据抽象层（查找/进度/稀有度映射）
│   └── store.js                      # 本地收藏 / 心愿的增删改查
└── pages/
    ├── index/  娃柜   ├── dex/  图鉴   ├── detail/ 详情
    ├── add/    录入   ├── wish/ 心愿   ├── stats/  统计   └── settings/ 设置
```

## 三、如何运行（真机 / 模拟器预览）

1. 下载安装 **微信开发者工具**（稳定版）。
2. 「导入项目」→ 选择本文件夹 `toy-collection-mp`。
3. **AppID**：个人预览可选「测试号 / touristappid」；要真机调试需填你自己的小程序 AppID（公众平台注册）。
4. 编译即可在模拟器看到「娃柜」首页；切到「图鉴」点任意藏品 → 加入收藏 → 回首页看收藏墙。
5. 真机预览：开发者工具点「预览」扫码即可（个人主体小程序即可）。

> 注：`tabBar` 目前为纯文字（未带图标二进制），如需图标可在 `app.json` 的 `tabBar.list` 每项补 `iconPath` / `selectedIconPath`。

## 四、数据 Schema（双 IP 同构）

```js
// data/popmart.js / data/pokemon.js 共用此结构
{
  ip, brand, accent, accent2, unit,
  series: [{
    id, name, desc,
    figures: [{ id, code, name, sub, rarity, emoji, color, type? }]
  }]
}
```
- 泡泡玛特 `rarity`：`常规 | 隐藏 | 大娃 | MEGA`
- 宝可梦 `rarity`：`普通 | 传说 | 幻之`；附带 `type`（属性）

本地收藏记录（`utils/store.js`）：

```js
{ id, ip, seriesId, figureId, own, wish,
  buyPrice, curValue, acquiredAt, condition, note, photo, createdAt }
```

## 五、如何扩充藏品库

两个 IP 的数据都是普通 JS 数组，按上面的 schema 往 `figures` 里加条目即可：

- **泡泡玛特**：在 `data/popmart.js` 的对应 `series` 下加 `figures`（emoji 作占位图，可换真图 URL）。
- **宝可梦**：在 `data/pokemon.js` 的 `kanto` 系列里继续补全到全国图鉴，或新增 `series`（如 `johto`）。

无需改任何页面逻辑——`utils/source.js` 会自动把新数据接进图鉴、进度、统计。

## 六、技术说明

- 框架：微信原生小程序（WXML / WXSS / JS / JSON），无第三方依赖。
- 存储：`wx.getStorageSync` / `setStorageSync`，key = `toycol_collection_v1`，另存当前 IP 于 `toycol_active_ip`。
- 主题：页面根节点用 inline `style="--accent:...;--accent2:..."` 注入当前 IP 主色，WXSS 用 `var()` 取色；`onShow` 里 `wx.setNavigationBarColor` 同步导航栏。
- 分享：`onShareAppMessage` 可后续在页面补（本版聚焦收藏管理，暂未加分享）。
