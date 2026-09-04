#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 career-personality skill 的 references 抽取题库/档案/维度数据，注入独立 HTML 页面。

数据源（skill 的权威 references，不在此仓库内复制一份，避免漂移）：
  <skill>/references/questions.md   ## 题库            → 44 题
  <skill>/references/profiles.md    ## 16 型人格档案    → 16 型档案
  <skill>/references/dimensions.md  ## 维度对详情       → 4 维度对 + 8 端

产出：index.html（自包含，无外部依赖，双击即用）
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SKILL = Path(
    r"C:\Users\EDY\.workbuddy\connectors-marketplace\connectors\gaodun-job\skills\career-personality"
)

SECTIONS = [
    ("questions", "题库", "questions.md"),
    ("profiles", "16 型人格档案", "profiles.md"),
    ("dimensions", "维度对详情", "dimensions.md"),
]


def load_md_section(md_path: Path, section_title: str):
    """与 skill 的 calculate_mbti.py#load_md_section 同逻辑：按 H2 标题定位段，取首个 ```json 块。"""
    text = md_path.read_text(encoding="utf-8")
    lines = text.split("\n")
    header = "## " + section_title
    start = None
    for i, line in enumerate(lines):
        if line.strip() == header:
            start = i
            break
    if start is None:
        raise ValueError(f"未找到 H2 段：{header}（文件：{md_path}）")

    open_i = None
    for j in range(start + 1, len(lines)):
        if lines[j].strip() == "```json":
            open_i = j
            break
        if lines[j].startswith("## "):
            break
    if open_i is None:
        raise ValueError(f"段 {header} 内未找到 ```json 代码块（文件：{md_path}）")

    close_i = None
    for k in range(open_i + 1, len(lines)):
        if lines[k].strip() == "```":
            close_i = k
            break
    if close_i is None:
        raise ValueError(f"段 {header} 内 ```json 代码块未闭合（文件：{md_path}）")

    return json.loads("\n".join(lines[open_i + 1 : close_i]))


def as_list(obj, key: str):
    """JSON 块可能是裸数组，也可能是 {"key": [...]}，统一归一化成数组。"""
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict):
        if isinstance(obj.get(key), list):
            return obj[key]
        for v in obj.values():
            if isinstance(v, list):
                return v
    raise ValueError(f"{key} 段 JSON 结构无法解析为数组：{type(obj).__name__}")


def main():
    if not SKILL.exists():
        print(f"[x] skill 目录不存在：{SKILL}", file=sys.stderr)
        return 1

    data = {}
    for key, title, filename in SECTIONS:
        md = SKILL / "references" / filename
        if not md.exists():
            print(f"[x] references 文件缺失：{md}", file=sys.stderr)
            return 1
        raw = load_md_section(md, title)
        data[key] = as_list(raw, key)

    # 结构自检（对齐 SKILL.md §3.1 第 3 步：每段=11、合计=44）
    questions = data["questions"]
    if len(questions) != 44:
        print(f"[x] 题库数量异常：{len(questions)}（应为 44）", file=sys.stderr)
        return 1
    groups = {"EI": 0, "SN": 0, "TF": 0, "JP": 0}
    pair_of = {}
    for p in data["dimensions"]:
        dim = str(p.get("dimension", "")).upper()
        for d in p.get("detail", []):
            pair_of[str(d.get("option", "")).upper()] = dim
    for q in questions:
        dims = {str(o.get("dimension", "")).upper() for o in q.get("options", [])}
        mapped = {pair_of.get(d) for d in dims if d in pair_of}
        if len(mapped) != 1 or None in mapped:
            print(f"[x] 第 {q.get('id')} 题维度归属异常：{dims}", file=sys.stderr)
            return 1
        groups[mapped.pop()] += 1
    bad = {k: v for k, v in groups.items() if v != 11}
    if bad:
        print(f"[x] 题库结构异常：{groups}", file=sys.stderr)
        return 1

    if len(data["profiles"]) != 16:
        print(f"[x] 16 型档案数量异常：{len(data['profiles'])}", file=sys.stderr)
        return 1

    template = (HERE / "src" / "template.html").read_text(encoding="utf-8")
    engine = (HERE / "src" / "engine.js").read_text(encoding="utf-8")
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))

    if "/*__ENGINE__*/" not in template or "/*__DATA__*/" not in template:
        print("[x] template.html 缺少占位符 /*__ENGINE__*/ 或 /*__DATA__*/", file=sys.stderr)
        return 1

    html = template.replace("/*__ENGINE__*/", engine).replace("/*__DATA__*/", payload)
    out = HERE / "index.html"
    out.write_text(html, encoding="utf-8")

    print(f"[ok] 题库 {len(questions)} 题，维度分布 {groups}")
    print(f"[ok] 16 型档案 {len(data['profiles'])} 条，维度对 {len(data['dimensions'])} 组")
    print(f"[ok] 已生成 {out}（{out.stat().st_size / 1024:.1f} KB）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
