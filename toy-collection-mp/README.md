# 口袋卡牌助手 · 小程序（toy-collection-mp）

> 宝可梦主题的卡牌收藏与开包模拟小程序（微信原生）。
> 一个帮你记录「拥有什么、还差什么、值多少钱、想要什么」的私人卡牌册。

## 一、功能一览

| 模块 | 说明 |
| --- | --- |
| 🃏 卡牌（首页） | 收藏墙卡片流 + 顶部概览（拥有数 / 估值 / 图鉴完成度） |
| 📖 卡册 | 全国图鉴前五代（649 只）浏览，可按系列切换，进度条显示「已集 X/N」，标「只看未收集」快速查漏 |
| 🎁 开包 | 模拟拆包，每包 5 张，可限定某代或全图鉴，传说 / 幻之稀有掉落，抽到的卡自动点亮收藏册 |
| 👤 我的 | 持有 / 完成度 / 心愿统计，清空数据、复制仓库地址、版权声明 |

- **宝可梦单 IP 主题**：对标「口袋卡牌助手」，蓝黄卡牌风，**全国图鉴 1-649**（关都 / 城都 / 丰缘 / 神奥 / 合众）。
- **官方 TCG 卡面**：卡图取自**宝可梦集换式卡牌（TCG）官方简体中文版**，详情页直接展示整张卡牌，并列出该卡面的**中文招式 / 特性（含规则说明、能量、伤害）**。
- **卡面版本 + 进化关系**：详情页可看同一只宝可梦在不同系列 / 不同样子的中文卡面（点击放大），并可查看进化前 / 进化后 / 同族全链（如伊布 8 只分支进化），点击直接跳转。
- **纯本地**：收藏记录存在微信本机存储（`wx.setStorageSync`），**不上传任何服务器**，无需账号、无需后端。

## 二、目录结构

```
toy-collection-mp/
├── app.js / app.json / app.wxss      # 全局：主题、tabBar、按需注入
├── project.config.json / sitemap.json
├── data/
│   └── pokemon.js                    # 宝可梦数据（五代 649 只，含 TCG 卡图 URL）
├── utils/
│   ├── source.js                     # 数据抽象层（查找/进度/稀有度映射）
│   └── store.js                      # 本地收藏 / 心愿的增删改查
├── scripts/                          # 数据生成脚本（不进上传包）
│   ├── fetch_tcg_sets.mjs            # 下载 pokemon-tcg-data 英文系列 JSON（兜底卡图）
│   ├── fetch_desc_zh.mjs             # 下载 42arch 中文图鉴（描述/分类/弱点）
│   ├── fetch_chs_tcg.mjs             # 下载官方简体中文版 TCG 数据集（20MB）
│   ├── analyze_chs.mjs / inspect_chs.mjs   # 中文卡数据集结构 / 覆盖率探查
│   ├── check_wxss.mjs                # WXSS 大括号配平 + 关键声明校验
│   ├── smoke_detail.mjs              # 详情页数据链路冒烟测试
│   └── build_data.mjs                # 合并 fanzeyi + veekun + 中文图鉴 + 中文 TCG → data/pokemon.js
└── pages/
    ├── index/  卡牌   ├── dex/  卡册   ├── detail/ 详情
    ├── add/    录入   ├── gacha/ 开包  └── settings/ 我的
```

## 三、如何运行（真机 / 模拟器预览）

1. 下载安装 **微信开发者工具**（稳定版）。
2. 「导入项目」→ 选择本文件夹 `toy-collection-mp`。
3. **AppID**：个人预览可选「测试号 / touristappid」；要真机调试需填你自己的小程序 AppID（公众平台注册）。
4. 编译即可在模拟器看到「卡牌」首页；进「卡册」切换系列浏览 → 点任意卡牌 → 标记入手 → 回首页看收藏墙；或进「开包」点拆包抽卡。
5. 真机预览：开发者工具点「预览」扫码即可（个人主体小程序即可）。

> 远程图需在微信公众平台配置 `downloadFile` 合法域名（`raw.githubusercontent.com`、`images.pokemontcg.io`）；开发工具勾选「不校验合法域名」即可直接预览。

## 四、数据 Schema

```js
// data/pokemon.js
{
  ip, brand, accent, accent2, unit,
  cnSets: { 商品代号: '中文系列名' },     // 中文卡商品表（232 条）
  series: [{
    id, name, desc,
    figures: [{
      id, code, name, sub, types, rarity,
      sprite, art, color,
      cn: {                              // 官方简体中文版 TCG「代表卡」
        n: 卡名, no: 卡号, s: 商品代号, img: 'img/515/136.png',
        hp, a: 属性, r: 稀有度,
        atk: [{ n: 招式名, d: 中文说明, c: '2,2', p: 伤害 }],   // c = 能量编号
        ft:  [{ n: 特性名, d: 中文说明 }]
      },
      cvs: [[img, 卡号, 商品代号, 稀有度], ...],   // 同一只的其他中文卡面（最多 6）
      enArt,                             // 少数无中文版者用英文卡图兜底
      ef, et, ec,                        // 进化前 / 进化后 / 同族全链（图鉴号）
      height_m, weight_kg,
      category, desc, weak, resist,
      abilities: [{ name, hidden }],
      base: { hp, atk, def, spa, spd, spe },
      moves: [{ name, power, type, cls, acc }]     // 游戏数据（等级招式 Top3）
    }]
  }]
}
```
- 系列 `id`：`kanto`(1-151) / `johto`(152-251) / `hoenn`(252-386) / `sinnoh`(387-493) / `unova`(494-649)。
- 宝可梦 `rarity`：`普通 | 传说 | 幻之`；`types` 为属性（如 `草/毒`）。
- `cn`：**官方简体中文版 TCG 卡面**（来自 `duanxr/PTCG-CHS-Datasets`，非商业 / 研究用途）。
  - 覆盖 **645/649**（缺 496 / 497 / 504 / 505，用 `enArt` 英文卡图兜底）。
  - `atk` / `ft` 是**该卡面自己的中文招式与特性**（含中文规则说明、能量需求、伤害），与卡图一一对应 —— 与 `moves`（游戏数据）是两回事。
  - 卡图地址 = `https://raw.githubusercontent.com/duanxr/PTCG-CHS-Datasets/main/` + `img`。
- `cvs`：同一只宝可梦在**不同商品 / 系列**里的其他中文卡面，详情页「卡面版本」横向展示、点击全屏放大。
- `ef` / `et` / `ec`：**进化关系**（进化前 / 进化后 / 同族全链，按血缘排序，含伊布这类分支进化）。545/649 有进化关系。
- `sprite` 为缩略图、`art` 为高清立绘（均来自 PokeAPI，作为兜底）。
- `height_m` / `weight_kg`：真实身高体重（来自 veekun 图鉴）。
- `category` / `desc` / `weak` / `resist`：**中文分类、中文图鉴描述、弱点、抵抗**（来自 `42arch/pokemon-dataset-zh`，649/649 全覆盖）。
- `abilities`：特性（含隐藏特性 `hidden:true`），中文名来自 veekun。
- `base`：六维种族值（HP/攻击/防御/特攻/特防/速度），来自 fanzeyi pokedex。
- `moves`：升级招式 Top3（含 `power` 威力 / `type` 属性 / `cls` 物理·特殊·变化 / `acc` 命中），来自 veekun。
- 数据由 `scripts/build_data.mjs` 从 fanzeyi + veekun + pokemon-tcg-data + 42arch 中文图鉴合并生成。

本地收藏记录（`utils/store.js`）：

```js
{ id, seriesId, figureId, own, wish,
  buyPrice, curValue, acquiredAt, condition, note, photo, createdAt }
```

## 五、如何扩充藏品库

- 数据由脚本自动生成：先跑 `scripts/fetch_tcg_sets.mjs` 更新 TCG 卡图缓存，再跑 `scripts/build_data.mjs` 重新生成 `data/pokemon.js`。
- 要新增世代（如 `gen6` 第六世代），在 `build_data.mjs` 的 `series` 数组里加一段 `rangeFigures(650, 721)`，并在 `fetch_tcg_sets.mjs` 补上对应 TCG 系列即可。

无需改任何页面逻辑——`utils/source.js` 会自动把新数据接进图鉴、进度、统计、开包。

## 六、技术说明

- 框架：微信原生小程序（WXML / WXSS / JS / JSON），无第三方依赖。
- 存储：`wx.getStorageSync` / `setStorageSync`，key = `toycol_collection_v1`。
- 主题：页面根节点用 inline `style="--accent:...;--accent2:..."` 注入主色，WXSS 用 `var()` 取色；`onShow` 里 `wx.setNavigationBarColor` 同步导航栏。
- 性能：`app.json` 开启 `lazyCodeLoading: requiredComponents`（组件按需注入）。

## 七、版权声明

本小程序中图片、文字等版权归属均为 Nintendo inc. / Creatures inc. / GAME FREAK inc. / DeNA inc. 及相关企业所有，仅供个人学习、交流、参考使用。严禁用于各种商业用途，违者作者保留追究法律责任的权力。
