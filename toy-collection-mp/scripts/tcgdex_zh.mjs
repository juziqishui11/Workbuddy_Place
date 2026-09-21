/**
 * 用 tcgdex/cards-database 的**繁体中文（中国台湾地区）**卡表，
 * 给「国际版（英文）卡面」补齐官方中文技能文本。
 *
 * 背景：简体中文版数据集（duanxr/PTCG-CHS-Datasets）尚未收录 EX / GX / V / VMAX / ex 等形态卡，
 * 这些卡只能显示国际版英文卡面；本脚本从 TCGdex 的繁中卡表取官方中文，转成简体后写入
 * scripts/en-skill-zh.json（英文原文 → 中文 的对照词典，随仓库提交、可增量维护）。
 *
 * 配对原理（两张卡没有直接外键，靠「卡面指纹」+「物种名」双重校验）：
 *   - 指纹：HP + 画师 + 后场数 + 规制标记 + 招式数 + 特性数 + 每招「伤害/能量费用」
 *     （属性与弱点在繁中数据里偶尔与英文版不一致，故排除）
 *   - 物种：繁中卡名转简体后，必须命中本只宝可梦在数据里的中文名
 *   - 唯一性：同一指纹命中多张卡时，只有译文完全一致才采用
 *   - 数值一致性：英文效果与中文效果里的数字集合必须一致（忽略 1，中文会写「1张」而英文常省略）
 *   宁可漏，不可错 —— 任何一道校验不过就整张卡跳过，页面回落显示英文。
 *
 * 前置：把 https://github.com/tcgdex/cards-database 解压到
 *   D:/workBuddy_place/.tmp/tcgdex/cards-database-master
 * （或设 TCGDEX_REPO 环境变量指向解压目录）
 * 依赖：opencc-js（繁→简）
 *
 * 用法：node scripts/tcgdex_zh.mjs [--dry-run]
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const ROOT = 'D:/workBuddy_place/toy-collection-mp';
const TMP = 'D:/workBuddy_place/.tmp';
const REPO = process.env.TCGDEX_REPO || TMP + '/tcgdex/cards-database-master';
const CACHE = TMP + '/toy-collection-cache';
const PK = ROOT + '/data/pokemon.js';
const DICT = ROOT + '/scripts/en-skill-zh.json';
const LOG = TMP + '/tcgdex-zh.log.json';

const DRY = process.argv.indexOf('--dry-run') >= 0;

if (!fs.existsSync(REPO)) {
  console.error('找不到 TCGdex 仓库：' + REPO);
  console.error('请从 https://github.com/tcgdex/cards-database 下载并解压后重试，或用 TCGDEX_REPO 指定路径。');
  process.exit(1);
}

// ---------- 繁 → 简 + 台湾用语对齐到简中官方用语 ----------
const require2 = createRequire(import.meta.url);
let OpenCC;
for (const p of [process.env.OPENCC_PATH, 'opencc-js',
  'C:/Users/EDY/.workbuddy/binaries/node/workspace/node_modules/opencc-js/dist/umd/full.js']) {
  if (!p) continue;
  try { OpenCC = require2(p); break; } catch (e) { /* 继续找 */ }
}
if (!OpenCC) { console.error('缺少 opencc-js，请先安装（工作区：npm i opencc-js）'); process.exit(1); }
const conv = OpenCC.Converter({ from: 't', to: 'cn' });

const TERM_FIX = [
  [/(?<!抛)掷/g, '抛掷'],   // 简中官方用「抛掷1次硬币」
  [/擲/g, '抛掷'],
  [/牌組/g, '牌组']
];
function toS(s) {
  if (!s) return '';
  let out = conv(String(s));
  for (const [re, rep] of TERM_FIX) out = out.replace(re, rep);
  return out;
}

// ---------- 工具 ----------
function parseCard(src) {
  const body = src
    .replace(/^\s*import[^\n]*\n/gm, '')
    .replace(/export\s+default\s+card\s*;?/, '')
    .replace(/const\s+card\s*:\s*Card\s*=/, 'const card =')
    .replace(/\r/g, '');
  try {
    const mod = { exports: {} };
    new Function('Set', 'module', 'exports',
      body + '\n;module.exports = (typeof card !== "undefined") ? card : null;')({}, mod, mod.exports);
    return mod.exports || null;
  } catch (e) { return null; }
}
function walk(dir, acc) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return acc; }
  for (const e of ents) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walk(fp, acc);
    else if (e.name.endsWith('.ts')) acc.push(fp);
  }
  return acc;
}
function costKey(arr) { return (arr || []).map(x => String(x).toLowerCase()).sort().join(','); }
function atkSig(atks) { return (atks || []).map(a => (a.damage || '') + '/' + costKey(a.cost)).join('|'); }
function fpTw(c) {
  return [String(c.hp === undefined ? '' : c.hp), c.illustrator || '',
  c.retreat === undefined ? '' : c.retreat, c.regulationMark || '',
  (c.attacks || []).length, (c.abilities || []).length, atkSig(c.attacks)].join('~');
}
function fpEn(c) {
  return [String(c.hp || '').replace(/[^\d]/g, ''), c.artist || '',
  (c.retreatCost || []).length, c.regulationMark || '',
  (c.attacks || []).length, (c.abilities || []).length, atkSig(c.attacks)].join('~');
}
/** 数字集合（忽略 1：中文官方会显式写「1张」而英文常省略） */
function nums(s) {
  return (String(s || '').match(/\d+/g) || []).map(Number).filter(n => n !== 1).sort((a, b) => a - b).join(',');
}

// ---------- 1. 建繁中指纹索引 ----------
const pk = require2(PK);
const all = pk.series.flatMap(s => s.figures);
const SPECIES = all.map(f => f.name).filter(Boolean).sort((a, b) => b.length - a.length);
function speciesOf(zh) {
  const s = toS(zh);
  for (const sp of SPECIES) if (s.indexOf(sp) >= 0) return sp;
  return '';
}

const twIdx = new Map();
let twPokemon = 0, twZh = 0, twNoSp = 0;
for (const f of walk(REPO + '/data-asia', [])) {
  let src; try { src = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
  if (!/const\s+card\s*:?\s*Card\s*=/.test(src)) continue;
  const c = parseCard(src);
  if (!c || c.category !== 'Pokemon') continue;
  twPokemon++;
  const nm = (c.name || {})['zh-tw'];
  if (!nm) continue;
  twZh++;
  const sp = speciesOf(nm);
  if (!sp) { twNoSp++; continue; }
  const key = fpTw(c);
  const rec = {
    sp: sp, name: nm,
    attacks: (c.attacks || []).map(a => ({ name: (a.name || {})['zh-tw'] || '', effect: (a.effect || {})['zh-tw'] || '' })),
    abilities: (c.abilities || []).map(a => ({ name: (a.name || {})['zh-tw'] || '', effect: (a.effect || {})['zh-tw'] || '' }))
  };
  if (!twIdx.has(key)) twIdx.set(key, []);
  twIdx.get(key).push(rec);
}

// ---------- 2. 英文卡缓存（按图片 URL 建索引） ----------
const img2card = {};
for (const f of fs.readdirSync(CACHE)) {
  if (!f.startsWith('tcg_') || !f.endsWith('.json')) continue;
  if (f === 'tcg_sets.json' || f === 'tcg_mapping.json') continue;
  let arr; try { arr = JSON.parse(fs.readFileSync(CACHE + '/' + f, 'utf8')); } catch (e) { continue; }
  if (!Array.isArray(arr)) continue;
  for (const c of arr) {
    if (!c.images) continue;
    if (c.images.small) img2card[c.images.small] = c;
    if (c.images.large) img2card[c.images.large] = c;
  }
}

// ---------- 3. 逐张 enCvs 配对 ----------
const pairs = {};          // {英文原文: 中文}
const seenKey = new Set();
let enCards = 0, noCache = 0, noHit = 0, wrongSp = 0, ambiguous = 0, numReject = 0, ok = 0;
let numChecked = 0, numMismatch = 0;
const badSamples = [];
const samples = [];

for (const fig of all) {
  for (const v of (fig.enCvs || [])) {
    const key = v[0];
    if (seenKey.has(key)) continue;
    seenKey.add(key);
    const url = String(key).indexOf('http') === 0 ? key : 'https://images.pokemontcg.io/' + key;
    const c = img2card[url];
    if (!c) { noCache++; continue; }
    enCards++;
    const raw = twIdx.get(fpEn(c));
    if (!raw || !raw.length) { noHit++; continue; }
    const hits = raw.filter(x => x.sp === fig.name);
    if (!hits.length) { wrongSp++; continue; }
    const first = JSON.stringify(hits[0]);
    let same = true;
    for (let i = 1; i < hits.length; i++) { if (JSON.stringify(hits[i]) !== first) { same = false; break; } }
    if (!same) { ambiguous++; continue; }
    const tw = hits[0];

    const enA = c.attacks || []; const twA = tw.attacks || [];
    const enB = c.abilities || []; const twB = tw.abilities || [];
    const buf = [];
    let bad = null;
    const addText = (enTxt, twTxt) => {
      if (!enTxt || !twTxt) return;
      const zh = toS(twTxt);
      numChecked++;
      if (nums(enTxt) !== nums(zh)) {
        numMismatch++;
        if (!bad) bad = { en: enTxt, tw: zh };
        if (badSamples.length < 15) badSamples.push({ src: fig.name + ' / ' + c.name, en: enTxt, tw: zh });
      }
      buf.push([enTxt, zh]);
    };
    for (let i = 0; i < enA.length && i < twA.length; i++) {
      if (enA[i].name && twA[i].name) buf.push([enA[i].name, toS(twA[i].name)]);
      addText(enA[i].text, twA[i].effect);
    }
    for (let i = 0; i < enB.length && i < twB.length; i++) {
      if (enB[i].name && twB[i].name) buf.push([enB[i].name, toS(twB[i].name)]);
      addText(enB[i].text, twB[i].effect);
    }
    if (bad) { numReject++; continue; }
    ok++;
    for (const [k, val] of buf) pairs[k] = val;

    if (samples.length < 8 && enA.length) {
      samples.push({
        fig: fig.name, en: c.name, tw: tw.name,
        rows: enA.map((a, i) => a.name + ' → ' + (twA[i] ? twA[i].name : '?'))
      });
    }
  }
}

// ---------- 4. 并入词典 ----------
const dict = fs.existsSync(DICT) ? JSON.parse(fs.readFileSync(DICT, 'utf8')) : {};
const all2 = JSON.parse(fs.readFileSync(TMP + '/translate_all.json', 'utf8'));
let added = 0, updated = 0;
for (const en in pairs) {
  if (dict[en] === undefined) added++; else if (dict[en] !== pairs[en]) updated++;
  dict[en] = pairs[en];
}

const stat = {
  twPokemon, twZh, twNoSp, twFingerprints: twIdx.size,
  enCards, noCache, noHit, wrongSp, ambiguous, numReject, ok,
  pairs: Object.keys(pairs).length, added, updated,
  numChecked, numMismatch,
  dictEntries: Object.keys(dict).length, targets: all2.length,
  coverage: (Object.keys(dict).length / all2.length * 100).toFixed(1) + '%',
  badSamples, samples
};
fs.writeFileSync(LOG, JSON.stringify(stat, null, 1), 'utf8');

if (!DRY) fs.writeFileSync(DICT, JSON.stringify(dict, null, 1), 'utf8');

console.log('繁中宝可梦卡:', twPokemon, '| 含 zh-tw:', twZh, '| 物种名对不上(丢):', twNoSp, '| 指纹槽:', twIdx.size);
console.log('我方国际卡:', enCards, '| 缓存缺:', noCache, '| 繁中无对应:', noHit,
  '| 物种不符:', wrongSp, '| 指纹歧义:', ambiguous, '| 数值校验剔除:', numReject, '| 配对成功:', ok);
console.log('产出对照:', Object.keys(pairs).length, '条（新增', added, '更新', updated, '）');
console.log('数值一致性: 检查', numChecked, '条 | 不符', numMismatch,
  '(' + (numChecked ? (numMismatch / numChecked * 100).toFixed(1) : '0') + '%)');
console.log('词典总计:', Object.keys(dict).length, '/', all2.length, '(' + stat.coverage + ')',
  DRY ? '[dry-run，未写入]' : '→ ' + DICT);
