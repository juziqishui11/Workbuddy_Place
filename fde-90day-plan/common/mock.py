"""离线演示用的假响应。

目的：没 key / 断网 / 不想花钱时，脚本照样能跑通，把代码路径和打印格式看清楚。
结构上刻意模仿 openai 的返回对象，真实调用与 mock 共用同一套打印逻辑。
"""
from __future__ import annotations

import random
from dataclasses import dataclass, field

# temperature 越高，答案越"发散"——这里用不同的措辞模拟这种差异
_CALM = [
    "大语言模型是用海量文本训练的神经网络，用来预测并生成下一个词。",
    "大语言模型是一种基于海量文本训练的语言模型，用于理解和生成自然语言。",
]
_WILD = [
    "大语言模型嘛，你可以把它想成一个读过互联网几乎所有文字的「续写机器」——它不真的懂，只是特别会猜下一个字。",
    "简单说，大语言模型就是个被喂了整座图书馆的鹦鹉：它会续写，偶尔还会一本正经地胡说八道，但确实好用。",
]


@dataclass
class Usage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


@dataclass
class Message:
    content: str


@dataclass
class Choice:
    message: Message
    finish_reason: str = "stop"


@dataclass
class Completion:
    choices: list = field(default_factory=list)
    usage: Usage = field(default_factory=Usage)
    model: str = "mock-model"


def fake_completion(messages: list[dict], temperature: float = 0.7,
                    max_tokens: int = 200, model: str = "mock-model") -> Completion:
    """按 temperature 返回不同风格的假答案，并伪造一份用量账单。"""
    pool = _WILD if temperature >= 0.7 else _CALM
    content = random.choice(pool)

    prompt_tokens = sum(len(m.get("content", "")) for m in messages) // 2 + 8
    trimmed = content[: max(max_tokens // 2, 20)]      # 中文约 1 字 ≈ 1~2 token
    finish = "length" if len(trimmed) < len(content) else "stop"

    return Completion(
        choices=[Choice(message=Message(content=trimmed), finish_reason=finish)],
        usage=Usage(
            prompt_tokens=prompt_tokens,
            completion_tokens=len(trimmed),
            total_tokens=prompt_tokens + len(trimmed),
        ),
        model=model,
    )
