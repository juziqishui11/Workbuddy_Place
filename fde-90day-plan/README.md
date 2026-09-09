# 90 天 FDE 学习计划 · 工作区

主文件：`fde-90day-plan.html`（双击打开，无需联网，进度存在浏览器本地）。

---

## 第 0 天：环境搭建（开工前必做，约 30 分钟）

```bash
# 1. 建虚拟环境
python -m venv .venv
.venv\Scripts\activate            # Windows

# 2. 装依赖
pip install openai python-dotenv httpx pydantic pytest

# 3. 建 .env（复制下面四行，换成你自己的 key，DeepSeek 示例）
OPENAI_API_KEY=sk-你的密钥
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat

# 4. 建 .gitignore（必须先做，再 git init）
.env
.venv/
__pycache__/
*.pyc
data/
logs/
.emb_cache.json
```

```bash
# 5. 初始化仓库，确认 .env 没被跟踪
git init
git status                        # 看不到 .env 才对
```

## 目录规范

```
agent-90days/
├─ common/          # 公共层：config.py / minillm.py / httpclient.py / retry.py
├─ week1 … week12/  # 每周练习脚本，如 week1/day1_basic.py
├─ notes/           # 每天笔记（也是以后写文章的素材）
├─ prompts/         # 提示词独立成文件，纳入版本管理
├─ data/            # 合成数据、SQLite 库
├─ logs/            # 运行日志
├─ docs/            # ADR、架构说明、交付说明、案例、复盘
└─ eval/            # golden set 与基线
```

## Python 工程（按天创建）

每天一个脚本，命名 `weekN/dayN_主题.py`，笔记在 `notes/dayNN.md`。

```
week1/day1_basic.py  # Day 1 ✅ 30 多行，从上往下平铺，零自定义函数
notes/day01.md       # Day 1 笔记（填运行结果 + 自测题）
common/config.py     # 配置统一入口（Day 3 起复用）
common/mock.py       # 可选：离线演示用的假响应
```

跑 Day 1（先复制 `.env.example` 为 `.env` 并填 key）：

```bash
.venv\Scripts\activate
python week1/day1_basic.py
```

写法人：每天一个**平铺脚本**（像公众号原文那样，不包函数、不用命令行参数），想改问题或温度就改脚本顶部的常量后重跑。

## 用法

1. 打开 `fde-90day-plan.html`，点「12 周任务」找到今天。
2. 按 steps 做，做完勾选（自动保存在本机浏览器）。
3. 概念不清查「概念词典」；练手做「练习题 36」。
4. 换电脑前点「导出进度」，新电脑点「导入进度」。

## 主线项目

客服工单分类与回复助手（合成数据 + 模拟用户），W6 启动，W8 出 v1，W10 出前后对比数据，W11 变成作品集案例。

## 参考

- 主参考：公众号「我与ai的那些事」《90天，我和 WorkBuddy 学 Agent》系列（D1–D37 对齐其 Round 结构）
- 补强：FDE 快速入门路线（工程地基 + 交付闭环）、The Forward-Deployed Engineer Playbook（面试权重与 90 天节奏）
