# week1/day2_tools.py —— Day 2：给模型装上工具（Function Calling）
#
# 跑法：python week1/day2_tools.py
# 今天比 Day 1 难一点：模型不再直接回答，而是先「决定调什么工具」→ 我们执行 → 结果送回去 → 它再总结。
# 所以一次提问至少要 2 次 API 调用。

import os
import sys
import json
from openai import OpenAI
from dotenv import load_dotenv, find_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # 让 import common 生效
from common.token_usage import show_usage, print_total  # noqa: E402

load_dotenv(find_dotenv())

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_BASE_URL"),
)
MODEL = os.getenv("OPENAI_MODEL", "deepseek-chat")
QUESTION = "上海今天适合户外跑步吗？不适合的话推荐几个室内的地方。"

# ===== 1. 工具说明书（JSON Schema）：模型只认这份声明，根本不看你的 Python 代码 =====
# description 要写具体（"查询指定城市的当前天气" 比 "天气工具" 好得多），模型全靠它判断要不要调
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "查询指定城市的当前天气，返回气温、天气状况和风力。只在用户问天气时使用。",
            "parameters": {
                "type": "object",
                "properties": {"city": {"type": "string", "description": "城市名，如 南京"}},
                "required": ["city"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_indoor_spots",
            "description": "查询指定城市的室内去处（博物馆、商场、图书馆）。只在天气不适合户外、用户需要替代方案时使用。",
            "parameters": {
                "type": "object",
                "properties": {"city": {"type": "string", "description": "城市名，如 南京"}},
                "required": ["city"],
            },
        },
    },
]

# ===== 2. 工具的真实实现（本文件用假数据；day2_tools_live.py 里换成真 API）=====
def get_weather(city):
    return f"{city} 当前 26°C，多云，东南风 3 级。"


def get_indoor_spots(city):
    return f"{city} 室内去处：市博物馆、万象城、市图书馆。"


TOOL_MAP = {"get_weather": get_weather, "get_indoor_spots": get_indoor_spots}  # 工具名 → Python 函数

# ===== 3. 第 1 次调用：把「问题 + 工具清单」一起发出去，让模型决定用不用 =====
messages = [
    {"role": "system", "content": "你是实用的出行助手。需要实时信息时先查工具，不要凭印象编造。"},
    {"role": "user", "content": QUESTION},
]
resp = client.chat.completions.create(model=MODEL, messages=messages, tools=tools)

print(resp)

t1 = show_usage("第1次", resp.usage)

msg = resp.choices[0].message
messages.append(msg)      # 坑①：这条 assistant 消息必须加回历史，否则第 2 次调用时模型会「失忆」

print(msg.tool_calls)

if msg.tool_calls is None:
    print("\n模型没调工具，直接回答：", msg.content)

else:
    # ===== 4. 执行工具：这一步是你的代码在干活，模型只是动嘴 =====
    print(f"\n模型决定调用 {len(msg.tool_calls)} 个工具：")
    for call in msg.tool_calls:        # 坑②：模型可能一次要调多个工具，别只取第一个
        args = json.loads(call.function.arguments)
        result = TOOL_MAP[call.function.name](**args)      # 真正的执行在这里
        print(f"  {call.function.name}({args}) → {result}")
        messages.append({
            "role": "tool",
            "tool_call_id": call.id,   # 坑③：id 必须和 call.id 对上，否则结果与请求关联不上
            "content": result,
        })

    # ===== 5. 第 2 次调用：模型看到工具结果，组织出最终回答 =====
    final = client.chat.completions.create(model=MODEL, messages=messages)
    t2 = show_usage("第2次", final.usage)
    print_total("两轮合计", t1, t2)
    print("\n最终回答:", final.choices[0].message.content)

# 今日 3 个要点：
# 1. 模型不执行任何代码，它只输出"我想调 get_weather，参数是北京"这段 JSON
# 2. 工具提供事实，模型提供理解和表达（三个数字之外的分析全是它推理的）
# 3. 闭环跑通 ≠ 数据对：本文件天气是硬编码的，day2_tools_live.py 才会接真实 API
