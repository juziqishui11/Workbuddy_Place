# week1/day1_basic.py —— Day 1：第一次跑通 LLM 调用
#
# 跑法：在项目根目录执行   python week1/day1_basic.py
# 前提：把 .env.example 复制成 .env，填好你的 key

import os
from openai import OpenAI
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())          # 自动向上找到项目根目录的 .env

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_BASE_URL"),
)

MODEL = os.getenv("OPENAI_MODEL", "deepseek-chat")
QUESTION = "用一句话解释什么是大语言模型。"   # 想问别的，改这一行
TEMPERATURE = 0.7                            # 0=最确定（事实/代码） 1=最发散（创意）
MAX_TOKENS = 200                             # 输出上限，既省钱又防超长

resp = client.chat.completions.create(
    model=MODEL,                             # 用哪个模型：改 .env 里的 OPENAI_MODEL 就行
    messages=[                               # 模型唯一能看到的东西，全在这
        {"role": "system", "content": "你是一个说话简洁的助手。"},   # 人设，放第一条效果最好
        {"role": "user", "content": QUESTION},
    ],
    temperature=TEMPERATURE,
    max_tokens=MAX_TOKENS,
)

print("模型回答:", resp.choices[0].message.content)
print("结束原因:", resp.choices[0].finish_reason)   # stop=正常  length=被截断  tool_calls=要调工具
print("输入token:", resp.usage.prompt_tokens)
print("输出token:", resp.usage.completion_tokens)
print("合计token:", resp.usage.total_tokens)

# 今日 4 个要点：
# 1. system 放第一条 = 先立规矩再干活
# 2. temperature 0 稳、1 飘，查事实和写代码用 0
# 3. finish_reason=length 说明答案被 max_tokens 砍断了
# 4. 账单 = 输入 + 输出 token，推理模型还要算上思考的 token
