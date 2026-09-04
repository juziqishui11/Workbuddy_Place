#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""一致性校验：本地 JS 评分引擎 vs skill 的 Python 原脚本，结果必须逐字段一致。

对每组作答：
  1) 调 <skill>/scripts/calculate_mbti.py --display-answers 得 Python 结果
  2) 调 node src/js_runner.js 得 JS 结果
  3) 逐字段比对（含字段顺序、浮点值、文案原文）
"""
import json
import os
import random
import subprocess
import sys
import tempfile
from pathlib import Path

import build as builder

HERE = Path(__file__).resolve().parent
NODE = r"C:\Users\EDY\.workbuddy\binaries\node\versions\22.22.2-2\node.exe"
PY = Path(sys.executable)
SKILL_SCRIPT = builder.SKILL / "scripts" / "calculate_mbti.py"

# DISPLAY_ORDER：视觉位置 1-44 → 真实 id（与 SKILL.md §3.2.1 同源）
DISPLAY_ORDER = (
    list(range(1, 11)) + [41]
    + list(range(11, 21)) + [42]
    + list(range(21, 31)) + [43]
    + list(range(31, 41)) + [44]
)


def python_score(answers: dict) -> dict:
    proc = subprocess.run(
        [str(PY), str(SKILL_SCRIPT), "--display-answers", json.dumps(answers), "--compact"],
        capture_output=True, text=True, encoding="utf-8", cwd=str(HERE),
    )
    if proc.returncode != 0:
        raise RuntimeError("python 评分失败：" + (proc.stderr or proc.stdout).strip())
    return json.loads(proc.stdout)


def js_score(answers: dict, data_path: Path, tmpdir: Path) -> dict:
    ans_file = tmpdir / "answers.json"
    ans_file.write_text(json.dumps(answers), encoding="utf-8")
    env = dict(os.environ)
    env["DATA_JSON"] = str(data_path)
    proc = subprocess.run(
        [NODE, str(HERE / "src" / "js_runner.js"), str(ans_file)],
        capture_output=True, text=True, encoding="utf-8", cwd=str(HERE), env=env,
    )
    if proc.returncode != 0:
        raise RuntimeError("node 评分失败：" + (proc.stderr or proc.stdout).strip())
    return json.loads(proc.stdout)


def make_cases() -> list:
    cases = []

    def raw(name, fn):
        cases.append((name, {str(i): fn(i) for i in range(1, 45)}))

    raw("全 A", lambda i: "A")
    raw("全 B", lambda i: "B")
    raw("交替 A/B", lambda i: "A" if i % 2 else "B")
    raw("前 22 A 后 22 B", lambda i: "A" if i <= 22 else "B")
    raw("前 11 A 其余 B", lambda i: "A" if i <= 11 else "B")

    rng = random.Random(20260903)
    for n in range(6):
        seq = [rng.choice("AB") for _ in range(44)]
        raw(f"随机 #{n + 1}", lambda i, s=seq: s[i - 1])

    return cases


def main():
    data = {}
    for key, title, filename in builder.SECTIONS:
        md = builder.SKILL / "references" / filename
        data[key] = builder.as_list(builder.load_md_section(md, title), key)

    data_path = HERE / "src" / "data.json"
    data_path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    ok = fail = 0
    with tempfile.TemporaryDirectory() as td:
        tmpdir = Path(td)
        for name, answers in make_cases():
            py = python_score(answers)
            js = js_score(answers, data_path, tmpdir)

            a = json.dumps(py, ensure_ascii=False, sort_keys=False)
            b = json.dumps(js, ensure_ascii=False, sort_keys=False)
            if a == b:
                ok += 1
                print(f"[ok] {name:<16} → {py['dominant_type']}  "
                      f"强度{py['display_score']:>3}  {py['role_detail']['name']}")
            else:
                fail += 1
                print(f"[x] {name} 不一致")
                pa, pb = a, b
                for i, (ca, cb) in enumerate(zip(pa, pb)):
                    if ca != cb:
                        print(f"    首个差异 @ {i}\n    py: ...{pa[max(0, i - 60):i + 60]}...\n"
                              f"    js: ...{pb[max(0, i - 60):i + 60]}...")
                        break
                else:
                    print(f"    长度不同 py={len(pa)} js={len(pb)}")

    print(f"\n合计 {ok + fail} 组：一致 {ok}，不一致 {fail}")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
