# week1/day2_tools_live.py —— Day 2 进阶版：接真实天气 API
#
# 跑法：python week1/day2_tools_live.py
# 和 day2_tools.py 相比只改了一处：get_weather() 的函数体从假数据换成真 HTTP 请求。
# tools 声明、两轮闭环、messages 维护一行没动 —— 模型只看说明书，不关心你函数里是硬编码还是联网。
#
# 用的是 Open-Meteo：免费、不用注册、不需要额外 key，标准库 urllib 就够。

import os
import sys
import json
import urllib.request
import urllib.parse
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
# 问题改成运行时手输（见文件底部），这里只留一个示例给你照着问
EXAMPLE_QUESTION = "北京今天适合户外跑步吗？不适合的话推荐几个室内的地方。"
SYSTEM = "你是实用的出行助手。需要实时信息时先查工具，不要凭印象编造。"

# Open-Meteo 返回的是 WMO 标准天气码（纯数字），必须翻译成人话再喂给模型，否则它只能瞎猜
WMO = {
    0: "晴", 1: "少云", 2: "多云", 3: "阴", 45: "雾", 48: "雾凇",
    51: "毛毛雨", 53: "毛毛雨", 55: "毛毛雨", 61: "小雨", 63: "中雨", 65: "大雨",
    66: "冻雨", 67: "冻雨", 71: "小雪", 73: "中雪", 75: "大雪", 77: "米雪",
    80: "阵雨", 81: "阵雨", 82: "暴雨", 85: "阵雪", 86: "阵雪",
    95: "雷阵雨", 96: "雷阵雨伴冰雹", 99: "雷暴伴冰雹",
}

# ===== 1. 工具说明书：和 day2_tools.py 完全一样 =====
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
            "description": "查询指定城市的室内去处（博物馆、商场、图书馆）。只在天气不适合户外、用户需要替代方案时使用。",
            "parameters": {
                "type": "object",
                "properties": {"city": {"type": "string", "description": "城市名，如 北京"}},
                "required": ["city"],
            },
        },
    },
]

# ===== 2. 工具实现：get_weather 换成真实 HTTP 请求 =====
def geocode(city):
    """城市名 → 经纬度。查不到返回 None（必须有这个兜底，不能让它崩）。"""
    url = "https://geocoding-api.open-meteo.com/v1/search?" + urllib.parse.urlencode(
        {"name": city, "count": 1, "language": "zh", "format": "json"}
    )
    with urllib.request.urlopen(url, timeout=10) as r:
        data = json.loads(r.read().decode("utf-8"))
    if not data.get("results"):
        return None
    loc = data["results"][0]
    return loc["latitude"], loc["longitude"], loc.get("name", city)


def get_weather(city):
    try:
        geo = geocode(city)
        if not geo:
            return f"找不到城市「{city}」的坐标，请换个城市名试试。"
        lat, lon, name = geo
        url = "https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode(
            {
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,weather_code,wind_speed_10m",
                "timezone": "auto",
            }
        )
        with urllib.request.urlopen(url, timeout=10) as r:
            data = json.loads(r.read().decode("utf-8"))
        cur = data["current"]
        desc = WMO.get(cur["weather_code"], f"天气代码{cur['weather_code']}")
        return f"{name} 当前 {cur['temperature_2m']}°C，{desc}，风速 {cur['wind_speed_10m']} km/h。"
    except Exception as e:
        # 工具函数的铁律：出错也要返回字符串，让模型有机会告诉用户"查询失败了"，而不是整个程序崩在半路
        return f"查询天气失败：{e}"


def get_indoor_spots(city):
    return f"{city} 室内去处：市博物馆、万象城、市图书馆。"      # 这个仍是假数据（没有免费接口可接）


TOOL_MAP = {"get_weather": get_weather, "get_indoor_spots": get_indoor_spots}

# ===== 3. 你自己提问：输入 q 退出，clear 清空对话历史 =====
messages = [{"role": "system", "content": SYSTEM}]

print("真实天气助手（Open-Meteo 实时数据）")
print(f"示例问题：{EXAMPLE_QUESTION}")
print("输入 q 退出，输入 clear 清空历史。也可以直接问非天气问题，看模型会不会调工具。")

while True:
    try:
        question = input("\n你: ").strip()
    except EOFError:        # 用管道/脚本方式运行时没有输入来源，直接结束
        break

    if not question:
        continue
    if question.lower() in ("q", "quit", "exit", "退出"):
        break
    if question.lower() == "clear":
        messages = [{"role": "system", "content": SYSTEM}]
        print("（对话历史已清空）")
        continue

    messages.append({"role": "user", "content": question})

    # ===== 4. 第 1 次调用：让模型决定用不用工具 =====
    resp = client.chat.completions.create(model=MODEL, messages=messages, tools=tools)
    t1 = show_usage("第1次", resp.usage)

    msg = resp.choices[0].message
    messages.append(msg)      # 坑①：assistant 消息必须加回历史，否则模型会「失忆」

    if msg.tool_calls is None:
        print("\n助手:", msg.content)      # 模型觉得不用查工具，直接回答
        continue

    # ===== 5. 执行工具：这一步是你的代码在干活 =====
    print(f"  （模型决定调用 {len(msg.tool_calls)} 个工具）")
    for call in msg.tool_calls:        # 坑②：可能一次要调多个工具，别只取第一个
        args = json.loads(call.function.arguments)
        result = TOOL_MAP[call.function.name](**args)
        print(f"   {call.function.name}({args}) -> {result}")
        messages.append({
            "role": "tool",
            "tool_call_id": call.id,   # 坑③：id 必须和 call.id 对上
            "content": result,
        })

    # ===== 6. 第 2 次调用：拿到最终回答 =====
    final = client.chat.completions.create(model=MODEL, messages=messages)
    t2 = show_usage("第2次", final.usage)
    answer = final.choices[0].message.content
    messages.append({"role": "assistant", "content": answer})   # 助手的话也存进历史，支持追问
    print_total("本轮合计", t1, t2)
    print("\n助手:", answer)

# 今日进阶要点：
# 1. 工具内部换实现，上层完全无感 —— 今天硬编码换 HTTP，明天可以换数据库、内部服务、读文件
# 2. 出错要返回字符串而不是抛异常，这是工具函数的铁律
# 3. 真实接口的数据覆盖不完美（Open-Meteo 查"厦门"中文名会返回空），兜底分支一个都不能省
# 4. 追问能生效，是因为每轮都把历史原封不动重发一遍（回头看 Day 1 练习 5、6）
