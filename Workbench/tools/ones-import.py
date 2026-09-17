# -*- coding: utf-8 -*-
"""
ONES 任务导入 → 06-ones-data.js

用法：
    python tools/ones-import.py "C:\\path\\to\\ONES-任务.xlsx"

逻辑：
  - 表内「父工作项」为空的行  → 需求，生成 ONES_PARENTS（映射为项目）
  - 表内「父工作项」有值的行  → 任务，生成 ONES_TASKS（映射为任务）
  - 输出 src/js/06-ones-data.js，随后需执行 `node build.mjs`

更新数据集时：
  1. 重跑本脚本覆盖 06-ones-data.js
  2. 提升 06-ones-data.js 里的 ONES_SEED_VERSION（+1）
  3. node build.mjs
  重新导入走「按 onsId 幂等 upsert」：已有的更新、缺失的新增，不会重复。
"""
import json
import sys
import datetime
import io
import os

try:
    import openpyxl
except ImportError:
    sys.exit("缺少 openpyxl，请先安装：pip install openpyxl")

if len(sys.argv) < 2:
    sys.exit(__doc__)

SRC = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'js', '06-ones-data.js')

COLS = ['ID', '标题', '优先级', '状态', '负责人', '截止日期', '计划开始日期',
        '计划完成日期', '进度', '所属项目', '父工作项', '关注者', '描述',
        '工作内容', '已登记工时（小时）']


def txt(v):
    if v is None:
        return ''
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.strftime('%Y-%m-%d')
    return str(v).strip()


def dt(v):
    if v is None:
        return ''
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.strftime('%Y-%m-%d')
    s = str(v).strip()
    return s[:10] if len(s) >= 10 and s[4] == '-' else s


def num(v):
    if v is None or v == '':
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def main():
    wb = openpyxl.load_workbook(SRC, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    hdr = [str(h) if h is not None else '' for h in rows[0]]
    col = {k: hdr.index(k) for k in COLS}

    records = []
    for r in rows[1:]:
        if r[0] is None:
            continue
        progress = num(r[col['进度']])
        records.append({
            'onsId': txt(r[col['ID']]),
            'title': txt(r[col['标题']]),
            'owner': txt(r[col['负责人']]),
            'onesPriority': txt(r[col['优先级']]),
            'onesStatus': txt(r[col['状态']]),
            'dueDate': dt(r[col['截止日期']]),
            'planStart': dt(r[col['计划开始日期']]),
            'planEnd': dt(r[col['计划完成日期']]),
            'progress': (round(progress * 100) if progress is not None else None),
            'project': txt(r[col['所属项目']]),
            'parent': txt(r[col['父工作项']]),
            'followers': txt(r[col['关注者']]),
            'desc': txt(r[col['描述']]),
            'worklog': txt(r[col['工作内容']]),
            'logged': txt(r[col['已登记工时（小时）']]),
        })

    parents = [x for x in records if not x['parent']]
    leaves = [x for x in records if x['parent']]
    js = lambda v: json.dumps(v, ensure_ascii=False)

    buf = io.StringIO()
    buf.write("/* ============================================================\n")
    buf.write("   06-ones-data.js —— ONES 任务数据（自动生成，勿手改）\n")
    buf.write("   来源：%s\n" % SRC)
    buf.write("   结构：%d 条需求(父工作项) → 项目；%d 条任务 → 任务\n" % (len(parents), len(leaves)))
    buf.write("   由 tools/ones-import.py 生成；更新数据时重跑脚本并提升 ONES_SEED_VERSION\n")
    buf.write("   ============================================================ */\n")
    buf.write("var ONES_SEED_VERSION = 1;\n\n")
    buf.write("/* 需求（父工作项）—— 映射为项目 */\nvar ONES_PARENTS = [\n")
    for p in parents:
        buf.write("  { onsId: %s, name: %s, owner: %s, onesStatus: %s, startDate: %s, dueDate: %s, progress: %s, desc: %s },\n" % (
            js(p['onsId']), js(p['title']), js(p['owner']), js(p['onesStatus']), js(p['planStart']),
            js(p['planEnd']), ('null' if p['progress'] is None else p['progress']), js(p['desc'])))
    buf.write("];\n\n")
    buf.write("/* 任务 —— 映射为任务，parentTitle 关联到需求 */\nvar ONES_TASKS = [\n")
    for t in leaves:
        buf.write("  { onsId: %s, title: %s, owner: %s, onesStatus: %s, onesPriority: %s, progress: %s, planStart: %s, planEnd: %s, dueDate: %s, parentTitle: %s, followers: %s, desc: %s, worklog: %s, logged: %s },\n" % (
            js(t['onsId']), js(t['title']), js(t['owner']), js(t['onesStatus']), js(t['onesPriority']),
            ('null' if t['progress'] is None else t['progress']), js(t['planStart']), js(t['planEnd']),
            js(t['dueDate']), js(t['parent']), js(t['followers']), js(t['desc']), js(t['worklog']), js(t['logged'])))
    buf.write("];\n")

    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(buf.getvalue())
    print('rows %d → parents %d / leaves %d' % (len(records), len(parents), len(leaves)))
    print('wrote %s (%d chars)' % (OUT, len(buf.getvalue())))


if __name__ == '__main__':
    main()
