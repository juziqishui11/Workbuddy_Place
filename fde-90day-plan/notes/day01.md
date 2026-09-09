# Day 1 · 第一次跑通 LLM 调用

> 对应 `week1/day1_basic.py`｜约 60 分钟｜脚本只有 30 多行，从上往下读一遍就能懂

## 1. 跑起来

```bash
cp .env.example .env      # 复制后填入你的 key（只做一次）
python week1/day1_basic.py
```

## 2. 四个参数（今天要记住的全部）

| 参数 | 一句话 | 怎么调 |
|---|---|---|
| `model` | 用哪个模型 | 改 `.env` 里的 `OPENAI_MODEL` |
| `messages` | 模型**唯一**能看到的东西 | `system` 放第一条定人设，再放 `user` |
| `temperature` | 0 最确定、1 最发散 | 查事实/写代码用 0；创意用 0.7～1 |
| `max_tokens` | 输出上限 | 太小时答案会被砍断 |

## 3. 看输出：三个字段

| 字段 | 含义 |
|---|---|
| `choices[0].message.content` | 模型的回答 |
| `choices[0].finish_reason` | `stop` 正常 / `length` 被截断 / `tool_calls` 要调工具 |
| `usage` | token 账单：输入 + 输出 = 合计 |

## 4. 我的运行结果（跑完填）

| 字段 | 实际值 |
|---|---|
| 模型回答 |大语言模型是一种基于海量文本数据训练的人工智能系统，通过预测词语序列来理解和生成自然语言。 |
| finish_reason |stop|
| 输入 token |19 |
| 输出 token |24 |

## 5. 选做：感受 temperature

把脚本里 `TEMPERATURE = 0.7` 改成 `0` 跑一次，再改成 `1` 跑一次，把两次答案贴下面：

- temperature=0：
- temperature=1：
- 我的观察：

## 5b. 练习 6：长对话与滑动窗口（跑完填）

| 观察项 | 结果 |
|---|---|
| 跑到第 5 轮时累计 token | |
| 第 1 轮输入 token → 第 5 轮输入 token | → |
| 裁剪后这一轮输入 token | |
| 裁剪后还能答出我的名字吗？ | |

**滑动窗口的代价**：

三种解法对比（先知道，后面会逐个实现）：

| 办法 | 一句话 | 代价 |
|---|---|---|
| 滑动窗口 | 只保留最近 N 轮 | 会忘掉早期内容 |
| 摘要压缩 | 把旧对话总结成一段再替换 | 多花一次调用 |
| token 预算裁剪 | 超预算就从最老的开始丢 | 代码最啰嗦 |

## 6. 自测题

1. 为什么 `system` 消息要放在 `messages` 第一条？
   <details><summary>答案</summary>模型会看到全部消息，人设与总指令放最前面 = 先立规矩再干活。放中间或末尾，指令权重会被最近的内容稀释。</details>

2. 回答被截断了，第一反应应该做什么？
   <details><summary>答案</summary>先看 finish_reason 是不是 <code>length</code>。是 → 加大 max_tokens；不是 → 问题在别处（内容过滤、工具调用未处理）。</details>

## 7. 验收

- [ ] `.env` 建好，脚本跑出 5 行结果
- [ ] 能说出 finish_reason 三种值的含义    stop - 正常 / length - 被截断 / tool_calls - 要调工具
- [ ] `git status` 里看不到 `.env`       环境文件不上传到github
- [ ] HTML 页面第 1 天已勾选
