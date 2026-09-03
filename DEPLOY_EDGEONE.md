# 部署到腾讯云 EdgeOne Pages

本项目已改造为 **EdgeOne Pages** 全栈应用：静态页面（`index.html`）+ 边缘函数（`edge-functions/`）+ 边缘 KV（排行榜存储）。无需自备服务器。

## 目录结构

```
2048/
├── index.html                 # 游戏前端（静态，托管在边缘节点）
├── edge-functions/            # 边缘函数（对应 /api/* 路由）
│   ├── api/
│   │   ├── config.js          # GET  /api/config
│   │   ├── rank.js            # GET/POST /api/rank
│   │   ├── rank/clear.js      # POST /api/rank/clear
│   │   └── wx/login.js        # GET  /api/wx/login?code=xxx
├── server.js                  # 仅本地 Node 开发用，EdgeOne 不会运行它
├── config.example.json        # 本地 Node 版的微信配置模板
└── package.json
```

## 部署步骤

### 1. 推到 GitHub
将 `2048/` 整个目录提交到你的 GitHub 仓库（已含 `.gitignore`，不会上传 `data.json`、`config.json`）。

### 2. 创建 EdgeOne Pages 项目
1. 登录 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone) → 左侧 **Pages 服务** → 立即开通。
2. **创建项目** → 绑定 GitHub 仓库 → 选择本仓库。
3. 构建配置：
   - 构建命令：**留空**（本项目无需构建）
   - 输出目录：**`.`**（根目录，直接托管 `index.html`）
   - 部署分支：`main`
4. 保存，平台自动部署，获得 `*.edgeone.app` 域名。

### 3. 创建并绑定 KV（排行榜存储）
> 边缘 KV 目前为内测/企业版能力。若未开通，排行榜会自动降级为**本机榜**（仍可正常游戏），见文末说明。

1. 控制台 → **KV 存储** → 创建命名空间，名称填 `rankkv`，区域选「全球分布式」。
2. 进入命名空间 → **绑定至边缘函数 / Pages 项目**，选择本 Pages 项目。
3. 绑定后，函数内通过 `env['rankkv']` 读写；命名空间名也可用环境变量 `KV_NS` 覆盖（默认即 `rankkv`）。

### 4. 配置环境变量（可选）
项目 **设置 → 环境变量** 添加：
| 变量 | 说明 | 必填 |
|---|---|---|
| `KV_NS` | KV 命名空间名，默认 `rankkv` | 否 |
| `WX_APPID` | 微信公众号 AppID（网页授权） | 否* |
| `WX_SECRET` | 微信公众号 AppSecret | 否* |
| `ADMIN_TOKEN` | 清空榜单口令，调 `/api/rank/clear` 时校验 | 否 |

\* 配了 `WX_APPID`+`WX_SECRET` 才会启用真·微信登录（无需扫码，见下）。

### 5. 微信登录（可选，无需扫码）
1. 公众号后台 → **公众号设置 → 功能设置 → 网页授权域名**，填你的 EdgeOne 域名（如 `game.example.com`，不含 http）。
2. 用该域名在**微信内置浏览器**打开游戏 → 点「微信登录」→ 微信弹出确认框 → 点一下，昵称头像自动进榜。
3. 测试号可在 https://mp.weixin.qq.com/debug 申请。

### 6. 自定义域名（可选）
Pages 项目 → **自定义域名** → 绑定你的域名并自动配置 HTTPS。建议用自定义域名以通过微信网页授权校验。

## 本地开发

- 边缘函数本地预览（需 Node）：
  ```bash
  npm install -g edgeone
  edgeone pages dev
  ```
- 或仅用本地 Node 后端（非边缘）：
  ```bash
  node server.js     # 访问 http://localhost:8080
  ```

## 接口一览
| 路由 | 方法 | 说明 |
|---|---|---|
| `/api/config` | GET | `{ wxEnabled, appId }` |
| `/api/rank` | GET | 榜单 Top50 |
| `/api/rank` | POST | 提交成绩（同用户仅留最高分） |
| `/api/rank/clear` | POST | `{ token }` 清空（需 `ADMIN_TOKEN`） |
| `/api/wx/login?code=` | GET | code 换微信昵称/头像 |

## 注意事项
- **KV 未开通时的降级**：若未绑定 KV，接口返回 `{error:'kv_not_bound'}`，前端自动切回**本机排行榜**（localStorage），游戏照常玩；但成绩不跨设备共享。
- 如需无 KV 的云端榜：改用 **EdgeOne Cloud Functions（Node.js 运行时）** + 腾讯云数据库（如 TDSQL-C / Redis），把 `server.js` 逻辑迁入云函数即可。
