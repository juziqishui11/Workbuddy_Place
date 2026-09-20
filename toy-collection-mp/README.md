# 口袋卡牌助手 · 小程序（toy-collection-mp）

> 宝可梦主题的卡牌收藏与开包模拟小程序（微信原生）。
> 一个帮你记录「拥有什么、还差什么、值多少钱、想要什么」的私人卡牌册。

## 一、功能一览

| 模块 | 说明 |
| --- | --- |
| 🃏 卡牌（首页） | 收藏墙卡片流 + 顶部概览（拥有数 / 估值 / 图鉴完成度） |
| 📖 卡册 | 关都 151 全图鉴浏览，进度条显示「已集 X/N」，标「只看未收集」快速查漏 |
| 🎁 开包 | 模拟拆包，每包 5 张，传说 / 幻之稀有掉落，抽到的卡自动点亮收藏册 |
| 👤 我的 | 持有 / 完成度 / 心愿统计，清空数据、复制仓库地址 |

- **宝可梦单 IP 主题**：对标「口袋卡牌助手」，蓝黄卡牌风，关都 151 图鉴。
- **纯本地**：收藏记录存在微信本机存储（`wx.setStorageSync`），**不上传任何服务器**，无需账号、无需后端。
- **远程精灵图**：卡牌图取自 PokeAPI 官方精灵图（缩略图 + 高清立绘），加载失败自动兜底。

## 二、目录结构

```
toy-collection-mp/
├── app.js / app.json / app.wxss      # 全局：主题、tabBar
├── project.config.json / sitemap.json
├── data/
│   └── pokemon.js                    # 宝可梦数据（关都 151）
├── utils/
│   ├── source.js                     # 数据抽象层（查找/进度/稀有度映射）
│   └── store.js                      # 本地收藏 / 心愿的增删改查
├── scripts/
│   └── gen_pokemon.py                # 数据生成脚本（不进上传包）
└── pages/
    ├── index/  卡牌   ├── dex/  卡册   ├── detail/ 详情
    ├── add/    录入   ├── gacha/ 开包  └── settings/ 我的
```

## 三、如何运行（真机 / 模拟器预览）

1. 下载安装 **微信开发者工具**（稳定版）。
2. 「导入项目」→ 选择本文件夹 `toy-collection-mp`。
3. **AppID**：个人预览可选「测试号 / touristappid」；要真机调试需填你自己的小程序 AppID（公众平台注册）。
4. 编译即可在模拟器看到「卡牌」首页；进「卡册」点任意卡牌 → 标记入手 → 回首页看收藏墙；或进「开包」点拆包抽卡。
5. 真机预览：开发者工具点「预览」扫码即可（个人主体小程序即可）。

> 远程图需在微信公众平台配置 `downloadFile` 合法域名（`raw.githubusercontent.com` 等）；开发工具勾选「不校验合法域名」即可直接预览。

## 四、数据 Schema

```js
// data/pokemon.js
{
  ip, brand, accent, accent2, unit,
  series: [{
    id, name, desc,
    figures: [{
      id, code, name, sub, types, rarity,
      sprite, art, color,
      height_m, weight_kg,
      abilities: [{ name, hidden }],
      base: { hp, atk, def, spa, spd, spe },
      moves: [{ name, power, type, cls, acc }]
    }]
  }]
}
```
- 宝可梦 `rarity`：`普通 | 传说 | 幻之`；`types` 为属性（如 `草/毒`）。
- `sprite` 为缩略图、`art` 为高清立绘（均来自 PokeAPI，远程 URL）。
- `height_m` / `weight_kg`：真实身高体重（来自 veekun 图鉴）。
- `abilities`：特性（含隐藏特性 `hidden:true`），中文名来自 veekun。
- `base`：六维种族值（HP/攻击/防御/特攻/特防/速度），来自 fanzeyi pokedex。
- `moves`：升级招式 Top3（含 `power` 威力 / `type` 属性 / `cls` 物理·特殊·变化 / `acc` 命中），来自 veekun。
- 卡牌详情页（`pages/detail`）渲染为 **宝可梦 TCG 卡牌风格**：卡框/能量色按属性变化，展示 HP、特性、招式与种族值。数据由 `scripts/build_data.mjs` 从 fanzeyi + veekun 合并生成。

本地收藏记录（`utils/store.js`）：

```js
{ id, seriesId, figureId, own, wish,
  buyPrice, curValue, acquiredAt, condition, note, photo, createdAt }
```

## 五、如何扩充藏品库

宝可梦数据就是普通 JS 数组，按上面的 schema 往 `figures` 里加条目即可：

- 在 `data/pokemon.js` 的 `kanto` 系列里继续补全到全国图鉴，或新增 `series`（如 `johto`）。
- `scripts/gen_pokemon.py` 可从 fanzeyi/pokedex 自动生成数据（需联网）。

无需改任何页面逻辑——`utils/source.js` 会自动把新数据接进图鉴、进度、统计。

## 六、技术说明

- 框架：微信原生小程序（WXML / WXSS / JS / JSON），无第三方依赖。
- 存储：`wx.getStorageSync` / `setStorageSync`，key = `toycol_collection_v1`。
- 主题：页面根节点用 inline `style="--accent:...;--accent2:..."` 注入主色，WXSS 用 `var()` 取色；`onShow` 里 `wx.setNavigationBarColor` 同步导航栏。
- 分享：`onShareAppMessage` 可后续在页面补（本版聚焦收藏管理，暂未加分享）。
