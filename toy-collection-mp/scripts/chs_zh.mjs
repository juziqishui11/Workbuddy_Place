/**
 * 用**简体中文版**卡表（duanxr/PTCG-CHS-Datasets 的 ptcg_chs_infos.json）
 * 给「国际版（英文）卡面」补官方简中技能文本。
 *
 * 与 scripts/tcgdex_zh.mjs 的分工：
 *   - 本脚本（简中源）：招式/特性名与效果、**卡牌规则文本**（GX / V / VMAX / ex 规则）
 *     优点：本身就是简体中文、含 GX（日月世代）与规则文本；缺点：只覆盖简中已发售的卡
 *   - tcgdex_zh.mjs（繁中源）：覆盖剑盾/朱紫世代里简中未发售的卡
 * 两者都写同一份 scripts/en-skill-zh.json（英文原文 → 中文），可反复运行、互为补充。
 *
 * 配对原理：同一只宝可梦的简中卡数量有限（每只 1~17 张），用「卡面指纹」在**本只内部**配对：
 *   HP + 画师 + 后场数 + 招式数 + 特性数 + 每招「伤害/能量费用」
 * 注意：简中有自己一套规制标记（A/B/C…）与国际版不对应，故不纳入指纹。
 * 唯一命中或候选译文完全一致才采用；并做「数字一致性」校验，宁可漏不可错。
 *
 * 用法：node scripts/chs_zh.mjs [--dry-run]
 */
import fs from 'fs';
import { createRequire } from 'module';

const ROOT = 'D:/workBuddy_place/toy-collection-mp';
const TMP = 'D:/workBuddy_place/.tmp';
const CACHE = TMP + '/toy-collection-cache';
const CHS = CACHE + '/ptcg_chs_infos.json';
const PK = ROOT + '/data/pokemon.js';
const DICT = ROOT + '/scripts/en-skill-zh.json';
const LOG = TMP + '/chs-zh.log.json';
const DRY = process.argv.indexOf('--dry-run') >= 0;

const require2 = createRequire(import.meta.url);

// 简中属性 id → 国际版能量名（与 utils/source.js 的 ATTR_NAME 一致）
const ATTR2EN = { 1: 'grass', 2: 'fire', 3: 'water', 4: 'lightning', 5: 'psychic', 6: 'fighting', 7: 'darkness', 8: 'metal', 9: 'fairy', 10: 'dragon', 11: 'colorless' };

function costKey(arr) { return (arr || []).map(x => String(x).toLowerCase()).sort().join(','); }
function atkSig(atks) { return (atks || []).map(a => (a.damage || '') + '/' + costKey(a.cost)).join('|'); }
function normDmg(d) { return (!d || d === 'none') ? '' : String(d); }

/** 英文卡指纹（来自 pokemontcg.io 缓存） */
function fpEn(c) {
  return [String(c.hp || '').replace(/[^\d]/g, ''), c.artist || '',
  (c.retreatCost || []).length,
  (c.attacks || []).length, (c.abilities || []).length, atkSig(c.attacks)].join('~');
}
/** 简中卡指纹 */
function fpChs(d) {
  const atks = (d.abilityItemList || []).map(a => ({
    damage: normDmg(a.abilityDamage),
    cost: String(a.abilityCost || '').split(',').filter(Boolean).map(i => ATTR2EN[Number(i)] || '')
  }));
  return [String(d.hp === undefined ? '' : d.hp), (d.illustratorName || [])[0] || '',
  d.retreatCost === undefined ? '' : d.retreatCost,
  atks.length, (d.cardFeatureItemList || []).length, atkSig(atks)].join('~');
}
/** 数字集合（忽略 1：中文官方会显式写「1张」而英文常省略） */
function nums(s) {
  return (String(s || '').match(/\d+/g) || []).map(Number).filter(n => n !== 1).sort((a, b) => a - b).join(',');
}

// ---------- 1. 建「本只宝可梦的简中卡指纹」索引 ----------
const J = JSON.parse(fs.readFileSync(CHS, 'utf8'));
const cols = J.collections || [];

/** 简中宝可梦名 → 卡列表（按主名去掉形态后缀归一） */
const FORM_SUFFIX = /(GX|VMAX|VSTAR|V|ex|EX|δ|★|LV\.X)$/;
const byName = new Map();
let chsPokemon = 0;
for (const col of cols) {
  for (const card of (col.cards || [])) {
    const d = card.details || {};
    if (String(d.cardTypeText || '') !== '宝可梦') continue;
    const nm = String(card.name || '');
    if (!nm) continue;
    chsPokemon++;
    if (!byName.has(nm)) byName.set(nm, []);
    byName.get(nm).push(d);
  }
}

function normName(n) {
  let s = String(n || '');
  // 去掉形态后缀（可能叠加，如「喷火龙ex」）
  for (let i = 0; i < 3; i++) s = s.replace(FORM_SUFFIX, '');
  return s.trim();
}
/** 本只宝可梦的全部简中卡（含各种形态） */
function chsCardsOf(figName) {
  const out = [];
  // 精确名
  if (byName.has(figName)) out.push(...byName.get(figName));
  // 形态名（喷火龙GX / 喷火龙ex …）
  for (const [nm, list] of byName) {
    if (nm === figName) continue;
    if (normName(nm) === figName) out.push(...list);
  }
  return out;
}

// ---------- 2. 规则文本（按形态归类）----------
const ruleByKind = {};
const KIND_BY_SUFFIX = { GX: 'GX', V: 'V', VMAX: 'VMAX', VSTAR: 'VSTAR', ex: 'ex', EX: 'EX', 光辉: '光辉' };
for (const col of cols) {
  for (const card of (col.cards || [])) {
    const d = card.details || {};
    const rt = String(d.ruleText || '').trim();
    if (!rt) continue;
    const nm = String(card.name || '');
    let kind = '';
    if (/光辉/.test(nm)) kind = '光辉';
    else {
      const m = nm.match(/(VSTAR|VMAX|GX|ex|EX|V)$/);
      kind = m ? (KIND_BY_SUFFIX[m[1]] || '') : '';
    }
    if (!kind) continue;
    if (!ruleByKind[kind]) ruleByKind[kind] = {};
    ruleByKind[kind][rt] = (ruleByKind[kind][rt] || 0) + 1;
  }
}
const bestRule = {};
for (const k in ruleByKind) bestRule[k] = Object.entries(ruleByKind[k]).sort((a, b) => b[1] - a[1])[0][0];

// ---------- 3. 英文卡缓存 ----------
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

// ---------- 4. 逐只配对 ----------
const pk = require2(PK);
const all = pk.series.flatMap(s => s.figures);
const pairs = {};
let enCards = 0, noChs = 0, noHit = 0, ambiguous = 0, numReject = 0, ok = 0;
let numChecked = 0, numMismatch = 0;
const badSamples = [], samples = [];
const seenKey = new Set();

for (const fig of all) {
  const chsList = chsCardsOf(fig.name);
  if (!chsList.length) { noChs++; continue; }
  const idx = new Map();
  for (const d of chsList) {
    const k = fpChs(d);
    if (!idx.has(k)) idx.set(k, []);
    idx.get(k).push(d);
  }

  for (const v of (fig.enCvs || [])) {
    const key = v[0];
    if (seenKey.has(key)) continue;
    seenKey.add(key);
    const c = img2card['https://images.pokemontcg.io/' + key];
    if (!c) continue;
    enCards++;
    const hits = idx.get(fpEn(c));
    if (!hits || !hits.length) { noHit++; continue; }
    // 候选必须译文一致
    const sigOf = d => JSON.stringify([
      (d.abilityItemList || []).map(a => [a.abilityName, a.abilityText]),
      (d.cardFeatureItemList || []).map(a => [a.featureName, a.featureDesc])
    ]);
    const sig0 = sigOf(hits[0]);
    if (hits.some(d => sigOf(d) !== sig0)) { ambiguous++; continue; }
    const d = hits[0];

    const enA = c.attacks || []; const chsA = d.abilityItemList || [];
    const enB = c.abilities || []; const chsB = d.cardFeatureItemList || [];
    const buf = [];
    let bad = null;
    const addText = (enTxt, zh) => {
      if (!enTxt || !zh) return;
      numChecked++;
      if (nums(enTxt) !== nums(zh)) {
        numMismatch++;
        if (!bad) bad = { en: enTxt, tw: zh };
        if (badSamples.length < 15) badSamples.push({ src: fig.name + ' / ' + c.name, en: enTxt, tw: zh });
      }
      buf.push([enTxt, zh]);
    };
    for (let i = 0; i < enA.length && i < chsA.length; i++) {
      if (enA[i].name && chsA[i].abilityName) buf.push([enA[i].name, chsA[i].abilityName]);
      addText(enA[i].text, chsA[i].abilityText);
    }
    for (let i = 0; i < enB.length && i < chsB.length; i++) {
      if (enB[i].name && chsB[i].featureName) buf.push([enB[i].name, chsB[i].featureName]);
      addText(enB[i].text, chsB[i].featureDesc);
    }
    if (bad) { numReject++; continue; }
    ok++;
    for (const [k, val] of buf) pairs[k] = val;

    if (samples.length < 8 && enA.length) {
      samples.push({
        fig: fig.name, en: c.name, zh: d.cardName,
        rows: enA.map((a, i) => a.name + ' → ' + (chsA[i] ? chsA[i].abilityName : '?'))
      });
    }
  }
}

// ---------- 5. 规则文本映射 ----------
const RULE_KIND = [
  [/^Pokémon ex rule:/, 'ex'],
  [/^Pokémon-GX rule:/, 'GX'],
  [/^VMAX rule:/, 'VMAX'],
  [/^VSTAR rule:/, 'VSTAR'],
  [/^V rule:/, 'V'],
  [/^Radiant Pokémon Rule:/, '光辉'],
  [/^When Pokémon-ex has been knocked out/, 'EX'],
  [/^TAG TEAM rule:/, 'ex']
];
const rulePairs = {}; let ruleHit = 0;
const all2 = JSON.parse(fs.readFileSync(TMP + '/translate_all.json', 'utf8'));
for (const item of all2) {
  if (item.k !== 'ru') continue;
  for (const [re, kind] of RULE_KIND) {
    if (re.test(item.en) && bestRule[kind]) { rulePairs[item.en] = bestRule[kind]; ruleHit++; break; }
  }
}

// ---------- 6. 并入词典 ----------
const dict = fs.existsSync(DICT) ? JSON.parse(fs.readFileSync(DICT, 'utf8')) : {};
let added = 0, updated = 0;
for (const en in pairs) { if (dict[en] === undefined) added++; else if (dict[en] !== pairs[en]) updated++; dict[en] = pairs[en]; }
for (const en in rulePairs) { if (dict[en] === undefined) added++; else if (dict[en] !== rulePairs[en]) updated++; dict[en] = rulePairs[en]; }

const stat = {
  chsPokemon, chsNames: byName.size, bestRule,
  enCards, noChs, noHit, ambiguous, numReject, ok,
  pairs: Object.keys(pairs).length, rulePairs: ruleHit, added, updated,
  numChecked, numMismatch,
  dictEntries: Object.keys(dict).length, targets: all2.length,
  coverage: (Object.keys(dict).length / all2.length * 100).toFixed(1) + '%',
  badSamples, samples
};
fs.writeFileSync(LOG, JSON.stringify(stat, null, 1), 'utf8');
if (!DRY) fs.writeFileSync(DICT, JSON.stringify(dict, null, 1), 'utf8');

console.log('简中宝可梦卡:', chsPokemon, '| 名字数:', byName.size);
console.log('规则文本（按形态）:', JSON.stringify(bestRule));
console.log('我方国际卡:', enCards, '| 本只无简中卡:', noChs, '| 指纹未命中:', noHit, '| 歧义:', ambiguous, '| 数值剔除:', numReject, '| 配对成功:', ok);
console.log('产出对照:', Object.keys(pairs).length, '条 | 规则映射:', ruleHit, '条（新增', added, '更新', updated, '）');
console.log('数值一致性: 检查', numChecked, '条 | 不符', numMismatch,
  '(' + (numChecked ? (numMismatch / numChecked * 100).toFixed(1) : '0') + '%)');
console.log('词典总计:', Object.keys(dict).length, '/', all2.length, '(' + stat.coverage + ')',
  DRY ? '[dry-run，未写入]' : '→ ' + DICT);
