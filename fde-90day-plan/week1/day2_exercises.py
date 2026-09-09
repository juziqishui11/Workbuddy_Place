"""Day 2 · 练习课程
================
5 个练习对应 Function Calling 的 5 个关键认知。
每个函数都可以直接跑，关键位置留了 TODO 和提示。
建议顺序做：先看清模型输出了什么，再逐个踩一遍坑。

跑法：取消 main() 里某一行的注释，一次跑一个练习（输出更清楚）。
"""
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

# 工具说明书（和 day2_tools.py 一样，练习里直接用）
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "查询指定城市的当前天气，返回气温、天气状况和风力。只在用户问天气时使用。",
            "parameters": {
                "type": "object",
                "properties": {"city": {"type": "string", "description": "城市名，如 北京"}},
                "required": ["city"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_indoor_spots",
            "description": "查询指定城市的室内去处（博物馆、商场、图书馆）。只在天气不适合户外时使用。",
            "parameters": {
                "type": "object",
                "properties": {"city": {"type": "string", "description": "城市名，如 北京"}},
                "required": ["city"],
            },
        },
    },
]


def get_weather(city):
    return f"{city} 当前 26°C，多云，东南风 3 级。"


def get_indoor_spots(city):
    return f"{city} 室内去处：市博物馆、万象城、市图书馆。"


TOOL_MAP = {"get_weather": get_weather, "get_indoor_spots": get_indoor_spots}


# ---------------------------------------------------------------------------
# 练习 1：看清模型到底输出了什么
# 知识点：模型不执行代码，只输出「函数名 + 参数」的 JSON
# 任务：打印 tool_calls 的完整结构，重点看三个字段：
#       function.name / function.arguments / id
# ---------------------------------------------------------------------------
def exercise_1_see_tool_call():
    print("\n" + "=" * 50)
    print("练习 1：模型输出的工具调用长什么样")
    print("=" * 50)

    resp = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": "北京今天天气怎么样？"}],
        tools=tools,
    )
    msg = resp.choices[0].message

    print("普通回答 content =", msg.content)
    print("是否有工具调用 =", msg.tool_calls is not None)

    if msg.tool_calls:
        # TODO: 把 tool_calls 整个结构漂亮地打印出来
        for i, call in enumerate(msg.tool_calls, 1):
            print(f"\n第 {i} 个工具调用：")
            print("  id       =", call.id)
            print("  函数名   =", call.function.name)
            print("  参数JSON =", call.function.arguments)
            print("  解析后   =", json.loads(call.function.arguments))

    print("\n提示：arguments 是字符串不是字典，必须用 json.loads() 解析后才能真正调用。")


# ---------------------------------------------------------------------------
# 练习 2：踩坑 —— 忘记把 assistant 消息加回历史
# 知识点：模型返回 tool_calls 的那条消息必须 append 回 messages
# 任务：跑两次第 2 轮调用，一次带 assistant 消息（正确），一次不带（错误），
#       对比最终回答有什么不同。
# ---------------------------------------------------------------------------
def exercise_2_forget_history():
    print("\n" + "=" * 50)
    print("练习 2：忘了加 assistant 消息会怎样")
    print("=" * 50)

    messages = [{"role": "user", "content": "北京今天天气怎么样？"}]
    resp = client.chat.completions.create(model=MODEL, messages=messages, tools=tools)
    msg = resp.choices[0].message
    tool_result = f"北京 当前 26°C，多云，东南风 3 级。"

    # 写法 A：正确 —— 先把 assistant 消息加回历史
    ok_messages = messages + [
        msg,                                                    # ← 关键：模型说过的话
        {"role": "tool", "tool_call_id": msg.tool_calls[0].id, "content": tool_result},
    ]
    resp_ok = client.chat.completions.create(model=MODEL, messages=ok_messages)
    print("【正确写法】->", resp_ok.choices[0].message.content[:120])

    # 写法 B：错误 —— 只加工具结果，没有 assistant 消息
    bad_messages = messages + [
        {"role": "tool", "tool_call_id": msg.tool_calls[0].id, "content": tool_result},
    ]
    try:
        resp_bad = client.chat.completions.create(model=MODEL, messages=bad_messages)
        print("\n【漏掉 assistant】->", resp_bad.choices[0].message.content[:120])
    except Exception as e:
        print("\n【漏掉 assistant】直接报错 ->", type(e).__name__, str(e)[:200])

    print("\n提示：多数模型网关会直接报错，因为工具结果没有对应的调用请求。这就是「失忆」的代价。")


# ---------------------------------------------------------------------------
# 练习 3：踩坑 —— tool_call_id 对不上
# 知识点：tool_call_id 必须是模型给的 call.id，对不上就关联不上
# 任务：故意把 id 写错，看报错信息长什么样（记住它，以后排查很快）。
# ---------------------------------------------------------------------------
def exercise_3_wrong_id():
    print("\n" + "=" * 50)
    print("练习 3：tool_call_id 写错会怎样")
    print("=" * 50)

    messages = [{"role": "user", "content": "北京今天天气怎么样？"}]
    resp = client.chat.completions.create(model=MODEL, messages=messages, tools=tools)
    msg = resp.choices[0].message

    # TODO: 把 tool_call_id 换成一个瞎编的 id，看会发生什么
    bad_messages = messages + [
        msg,
        {"role": "tool", "tool_call_id": "call_我是瞎编的id", "content": "北京 当前 26°C，多云。"},
    ]
    try:
        resp_bad = client.chat.completions.create(model=MODEL, messages=bad_messages)
        print("居然没报错 ->", resp_bad.choices[0].message.content[:120])
    except Exception as e:
        print("报错了 ->", type(e).__name__)
        print("错误信息:", str(e)[:300])

    print("\n提示：记住这段报错。以后看到 tool_call_id 相关的报错，第一反应就是检查 id 有没有对上。")


# ---------------------------------------------------------------------------
# 练习 4：一次调用多个工具
# 知识点：tool_calls 是列表，可能一次要调好几个，不能只取 [0]
# 任务：问一个需要两个工具的问题，用 for 循环把所有工具都执行完。
# ---------------------------------------------------------------------------
def exercise_4_two_tools():
    print("\n" + "=" * 50)
    print("练习 4：一次调多个工具")
    print("=" * 50)

    question = "北京今天天气怎么样？如果下雨的话，推荐几个室内的地方。"
    messages = [{"role": "user", "content": question}]
    resp = client.chat.completions.create(model=MODEL, messages=messages, tools=tools)
    msg = resp.choices[0].message
    messages.append(msg)

    if msg.tool_calls is None:
        print("模型没调工具，换一个问题再试试。")
        return

    print(f"模型一次要调 {len(msg.tool_calls)} 个工具：")
    # TODO: 用 for 循环处理每一个工具调用（别只取第一个）
    for call in msg.tool_calls:
        args = json.loads(call.function.arguments)
        result = TOOL_MAP[call.function.name](**args)
        print(f"  {call.function.name}({args}) -> {result}")
        messages.append({"role": "tool", "tool_call_id": call.id, "content": result})

    final = client.chat.completions.create(model=MODEL, messages=messages)
    print("\n最终回答 ->", final.choices[0].message.content)


# ---------------------------------------------------------------------------
# 练习 5：工具出错时的两种写法
# 知识点：工具函数的铁律 —— 出错要返回字符串，不要抛异常
# 任务：同一个「会失败的工具」，分别用抛异常和返回字符串两种写法跑一遍，
#       看程序是崩掉还是能继续把话说完。
# ---------------------------------------------------------------------------
def exercise_5_tool_error():
    print("\n" + "=" * 50)
    print("练习 5：工具出错怎么办")
    print("=" * 50)

    def bad_tool_raise(city):
        raise RuntimeError("天气接口 502 了")          # 错误写法：直接抛异常

    def bad_tool_return(city):
        return "查询天气失败：接口返回 502，请稍后再试。"   # 正确写法：返回错误字符串

    messages = [{"role": "user", "content": "北京今天天气怎么样？"}]
    resp = client.chat.completions.create(model=MODEL, messages=messages, tools=tools)
    msg = resp.choices[0].message
    messages.append(msg)

    # 写法 A：抛异常 —— 整条链路直接断掉
    print("【抛异常】")
    try:
        bad_tool_raise("北京")
    except Exception as e:
        print(f"  程序崩在这里：{type(e).__name__}: {e}")
        print("  用户什么回答都拿不到。")

    # 写法 B：返回错误字符串 —— 模型还能把话说完
    print("\n【返回错误字符串】")
    messages.append({
        "role": "tool",
        "tool_call_id": msg.tool_calls[0].id,
        "content": bad_tool_return("北京"),
    })
    final = client.chat.completions.create(model=MODEL, messages=messages)
    print("  模型回答 ->", final.choices[0].message.content)

    print("\n提示：工具挂了也要给模型一个「结果」，让它有机会告诉用户失败原因。")


def main():
    # 想跑哪个练习，就把哪一行前面的 # 去掉（建议一次只开一个）
    # exercise_1_see_tool_call()
    # exercise_2_forget_history()
    # exercise_3_wrong_id()
    # exercise_4_two_tools()
    exercise_5_tool_error()
    print("提示：取消上面某一行的注释再运行，一次跑一个练习。")


if __name__ == "__main__":
    main()
