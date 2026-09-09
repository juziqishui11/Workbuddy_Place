"""Day 1 · 练习课程
================
下面 5 个练习对应文章里的 5 个知识点。
每个函数都可以直接跑，关键位置留了 TODO 和提示：
先看 TODO 自己试着改，写不出来就看下面已经写好的参考写法。
练习目标：动手试一遍，比看一遍记得牢。

跑法：取消 main() 里某一行的注释，一次跑一个练习（输出更清楚）。
"""
import os
import sys
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


# ---------------------------------------------------------------------------
# 练习 1：temperature 对比实验
# 知识点：temperature=0 最确定，=1 最发散
# 任务：用同一个问题，分别跑 temperature=0 和 temperature=1.0，各跑 1 次，
#       把两次回答打印出来对比。感受「严肃会计」vs「喝多了的艺术家」。
# ---------------------------------------------------------------------------
def exercise_1_temperature():
    print("\n" + "=" * 50)
    print("练习 1：temperature 对比")
    print("=" * 50)

    question = "用一句话描述秋天。"

    # TODO: 发起 temperature=0 的调用
    resp_low = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "你是一个说话简洁的助手。"},
            {"role": "user", "content": question},
        ],
        temperature=0,          # 最确定
        max_tokens=100,
    )

    # TODO: 发起 temperature=1.0 的调用
    resp_high = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "你是一个说话简洁的助手。"},
            {"role": "user", "content": question},
        ],
        temperature=1.0,        # 最发散
        max_tokens=100,
    )

    print(f"temperature=0   -> {resp_low.choices[0].message.content}")
    print(f"temperature=1.0 -> {resp_high.choices[0].message.content}")
    print("提示：把 temperature=0 的调用多跑几次，答案应该几乎一样。")


# ---------------------------------------------------------------------------
# 练习 2：max_tokens 与 finish_reason
# 知识点：max_tokens 是输出上限，finish_reason=length 说明答案被砍断了
# 任务：同一个问题，分别用 max_tokens=20 和 200 各跑一次，
#       对比 finish_reason 和回答长度，理解「省钱」和「防截断」是两件事。
# ---------------------------------------------------------------------------
def exercise_2_max_tokens():
    print("\n" + "=" * 50)
    print("练习 2：max_tokens 与 finish_reason")
    print("=" * 50)

    question = "请详细介绍一下什么是大语言模型，包括原理、应用和局限。"

    for limit in (20, 200):
        # TODO: 把 max_tokens 换成 limit，观察 finish_reason 的变化
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "你是一个说话简洁的助手。"},
                {"role": "user", "content": question},
            ],
            temperature=0,
            max_tokens=limit,
        )
        content = resp.choices[0].message.content
        reason = resp.choices[0].finish_reason
        print(f"\nmax_tokens={limit:>3} | finish_reason={reason} | 回答长度={len(content)}")
        print(f"  {content}")

    print("\n提示：finish_reason=length 就是被砍断了，这时要么加大 max_tokens，要么让它分段生成。")


# ---------------------------------------------------------------------------
# 练习 3：system 消息放哪最有效
# 知识点：messages 是模型唯一能看到的东西，system 放第一条 = 先立规矩再干活
# 任务：同一条「只能用一句话回答」的指令，一次放 system 首位，一次塞到最后，
#       看模型对指令的遵循程度有什么差别。
# ---------------------------------------------------------------------------
def exercise_3_system_position():
    print("\n" + "=" * 50)
    print("练习 3：system 消息的位置")
    print("=" * 50)

    rule = "你只能用一句话回答，超过一句就算失败。"
    question = "介绍一下 Python 这门语言。"

    # 写法 A：system 放第一条（正确姿势）
    resp_a = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": rule},          # ← 规矩在最前面
            {"role": "user", "content": question},
        ],
        temperature=0,
        max_tokens=200,
    )

    # 写法 B：同样的内容，塞到最后一条（错误姿势）
    resp_b = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "user", "content": question},
            {"role": "user", "content": rule},            # ← 规矩在最后
        ],
        temperature=0,
        max_tokens=200,
    )

    print("【system 在第一条】")
    print(" ", resp_a.choices[0].message.content)
    print("\n【指令被挪到最后】")
    print(" ", resp_b.choices[0].message.content)
    print("\n提示：对比两句的句数和长度，指令位置越靠后，权重越容易被冲淡。")


# ---------------------------------------------------------------------------
# 练习 4：算一笔账（usage）
# 知识点：账单 = 输入 token + 输出 token，两者都算钱
# 任务：分别用「很短」和「很长」的问题各跑一次，看 usage 怎么变；
#       再估算：如果这段长输入要跑 1000 次，一共要吃掉多少输入 token。
# ---------------------------------------------------------------------------
def exercise_4_token_cost():
    print("\n" + "=" * 50)
    print("练习 4：token 账单")
    print("=" * 50)

    short_q = "你好"
    long_q = "我是一名刚转行做 AI 应用的工程师，" * 20 + "请给我 3 条学习建议。"

    for name, q in (("短问题", short_q), ("长问题", long_q)):
        # TODO: 打印 usage 的三个字段，看输入 token 随问题长度怎么变
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "你是一个说话简洁的助手。"},
                {"role": "user", "content": q},
            ],
            temperature=0,
            max_tokens=150,
        )
        t = show_usage(name, resp.usage)
        print(f"  估算：同样的问题跑 1000 次 ≈ {t * 1000} token（输入+输出）")

    print("\n提示：做 Agent 时，每一轮循环都会把历史全部重新发一遍，输入 token 涨得比你想的快。")


# ---------------------------------------------------------------------------
# 练习 5：模型有没有记忆（messages 历史）
# 知识点：模型不会记住任何事，你发的 messages 就是它的全部记忆
# 任务：第一轮告诉它「我叫小明，喜欢爬山」；
#       然后跑两个第二轮：一个带上历史，一个不带，看它还能不能答出你的名字。
# ---------------------------------------------------------------------------
def exercise_5_message_history():
    print("\n" + "=" * 50)
    print("练习 5：messages 就是模型的记忆")
    print("=" * 50)

    first_round = [
        {"role": "system", "content": "你是一个说话简洁的助手。"},
        {"role": "user", "content": "我叫小明，我喜欢爬山。记住这两件事。"},
    ]
    resp = client.chat.completions.create(model=MODEL, messages=first_round, temperature=0, max_tokens=100)
    print("第一轮 ->", resp.choices[0].message.content)

    # 第二轮 A：不带历史（重新开一轮）
    only_question = [
        {"role": "system", "content": "你是一个说话简洁的助手。"},
        {"role": "user", "content": "我叫什么名字？我的爱好是什么？"},
    ]
    resp_a = client.chat.completions.create(model=MODEL, messages=only_question, temperature=0, max_tokens=100)
    print("\n【不带历史】->", resp_a.choices[0].message.content)

    # 第二轮 B：把上一轮的问答都带上（正确的多轮对话写法）
    with_history = first_round + [
        {"role": "assistant", "content": resp.choices[0].message.content},   # 模型上一轮说过的话
        {"role": "user", "content": "我叫什么名字？我的爱好是什么？"},
    ]
    resp_b = client.chat.completions.create(model=MODEL, messages=with_history, temperature=0, max_tokens=100)
    print("【带上历史】->", resp_b.choices[0].message.content)

    print("\n提示：所谓「记忆」就是你每次把对话历史原封不动再发一遍。历史越长，token 越贵。")


# ---------------------------------------------------------------------------
# 练习 6：长对话怎么办（多轮循环 + 滑动窗口）
# 知识点：代码不会因为聊得久就变长；真正会涨的是 token
# 任务：循环跑 5 轮对话，打印每轮的输入 token，看它怎么涨；
#       然后用「滑动窗口」裁掉旧历史，再看 token 降了多少。
# ---------------------------------------------------------------------------
def exercise_6_chat_loop():
    print("\n" + "=" * 50)
    print("练习 6：长对话与滑动窗口")
    print("=" * 50)

    KEEP_ROUNDS = 2                  # 滑动窗口：只保留最近 2 轮
    messages = [{"role": "system", "content": "你是一个说话简洁的助手，每句话不超过 20 个字。"}]

    # 想改成手动输入，把下面这行换成：questions = iter(lambda: input("你: "), "q")
    questions = [
        "我叫小明。",
        "我喜欢爬山。",
        "我还养了一只猫。",
        "我住在成都。",
        "我叫什么名字？住在哪里？",
    ]

    total = 0
    print(f"{'轮次':<6}{'messages条数':<14}{'本轮输入token':<16}{'累计token'}")
    for i, q in enumerate(questions, 1):
        messages.append({"role": "user", "content": q})
        resp = client.chat.completions.create(model=MODEL, messages=messages, temperature=0, max_tokens=60)
        answer = resp.choices[0].message.content
        messages.append({"role": "assistant", "content": answer})   # 模型说过的话也要存，否则下一轮它自己就忘了

        total += resp.usage.prompt_tokens + resp.usage.completion_tokens
        print(f"{i:<6}{len(messages):<14}{resp.usage.prompt_tokens:<16}{total}")

    print("\n注意：代码从头到尾就这几行，聊 3 轮和 300 轮一样多。")
    print(f"但 5 轮下来累计 {total} token，而且每轮的输入都在变大 —— 既费钱，又会撞上上下文窗口上限。")

    # ===== 滑动窗口：丢掉太老的对话 =====
    before = len(messages)
    # [messages[0]] 保住 system 人设；-(KEEP_ROUNDS*2) 因为每轮 = user + assistant 两条消息
    messages = [messages[0]] + messages[-(KEEP_ROUNDS * 2):]
    print(f"\n裁剪前 messages 有 {before} 条，裁剪后只剩 {len(messages)} 条（system + 最近 {KEEP_ROUNDS} 轮）")

    # 裁剪后再问一次，看输入 token 降了多少
    messages.append({"role": "user", "content": "我叫什么名字？我养了什么？"})
    resp = client.chat.completions.create(model=MODEL, messages=messages, temperature=0, max_tokens=80)
    print(f"裁剪后这一轮输入 token = {resp.usage.prompt_tokens}")
    print("模型回答 ->", resp.choices[0].message.content)

    print("\n提示：滑动窗口的代价是「会忘事」—— 代价大小取决于你保留几轮。")
    print("      这次它还能答出名字，是因为最近那轮回答里正好提到了；")
    print("      把 KEEP_ROUNDS 改成 1 再跑一次，你就会看到它开始胡编。")
    print("      想既省钱又不失忆，就得用摘要压缩（后面会学）。")


def main():
    # exercise_1_temperature()
    # exercise_2_max_tokens()
    # exercise_3_system_position()
    # exercise_4_token_cost()
    # exercise_5_message_history()
    exercise_6_chat_loop()
    print("提示：取消上面某一行的注释再运行，一次跑一个练习。")


if __name__ == "__main__":
    main()
