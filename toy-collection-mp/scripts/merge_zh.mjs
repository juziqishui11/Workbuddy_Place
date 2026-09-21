/**
 * 把逐批产出的译文（.tmp/zh/tNN.json，格式 {索引: 中文}）
 * 合并进脚本目录下的 scripts/en-skill-zh.json（格式 {英文原文: 中文}）。
 *
 * en-skill-zh.json 是**长期维护**的翻译词典，随仓库提交、可增量补充：
 * 后补的条目直接覆盖同名 key，未翻译的条目在打包时自动回落显示英文。
 *
 * 用法：node scripts/merge_zh.mjs
 */
import fs from 'fs';
import path from 'path';

const TMP = 'D:/workBuddy_place/.tmp';
const DICT = 'D:/workBuddy_place/toy-collection-mp/scripts/en-skill-zh.json';

const all = JSON.parse(fs.readFileSync(TMP + '/translate_all.json', 'utf8'));
const byIndex = {};
all.forEach(x => { byIndex[x.i] = x.en; });

const dict = fs.existsSync(DICT) ? JSON.parse(fs.readFileSync(DICT, 'utf8')) : {};
let added = 0, updated = 0, bad = 0;

const zhDir = TMP + '/zh';
const files = fs.existsSync(zhDir)
  ? fs.readdirSync(zhDir).filter(f => /^t\d+\.json$/.test(f)).sort()
  : [];

for (const f of files) {
  let part;
  try { part = JSON.parse(fs.readFileSync(path.join(zhDir, f), 'utf8')); } catch (e) {
    console.log('  跳过（解析失败）', f); continue;
  }
  for (const k in part) {
    const en = byIndex[k];
    if (!en) { bad++; continue; }
    const zh = String(part[k] || '').trim();
    if (!zh) continue;
    if (dict[en] === undefined) added++;
    else if (dict[en] !== zh) updated++;
    dict[en] = zh;
  }
}

fs.writeFileSync(DICT, JSON.stringify(dict, null, 1), 'utf8');
console.log('合并批次:', files.join(', ') || '(无)');
console.log('词典条目:', Object.keys(dict).length, '/', all.length,
  '(' + (Object.keys(dict).length / all.length * 100).toFixed(1) + '%)');
console.log('  新增', added, '| 更新', updated, '| 索引对不上', bad);
