# common/token_usage.py —— 所有练习脚本共用的 token 统计（Day 2 起）
#
# 用法：
#   t1 = show_usage("第1次", resp.usage)   # 打印明细，返回本次合计
#   print_total("两轮合计", t1, t2)


def show_usage(title, usage):
    """打印一次调用的账单，返回合计 token，方便多轮累加。"""
    p = usage.prompt_tokens
    c = usage.completion_tokens
    # 推理模型（如 deepseek-reasoner）还会多出一笔"思考"用的 token，同样要算钱
    details = getattr(usage, "completion_tokens_details", None)
    r = (getattr(details, "reasoning_tokens", 0) or 0) if details else 0
    extra = f" 思考{r}" if r else ""
    print(f"[{title}] 输入{p} 输出{c}{extra} 合计{p + c + r}")
    return p + c + r


def print_total(title, *totals):
    print(f"[{title}] {sum(totals)} token（{len(totals)} 次调用）")
