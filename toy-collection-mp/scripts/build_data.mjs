// scripts/build_data.mjs —— 合并 fanzeyi(种族值/中文名/属性) + veekun(身高/体重/特性/招式) + TCG卡图(pokemon-tcg-data)
// 输出 data/pokemon.js：全国图鉴 1-809（关都～阿罗拉），每 figure 含 tcgArt 与多版本卡面。
import fs from 'fs';
import path from 'path';

const ROOT = 'D:/workBuddy_place/toy-collection-mp';
const CACHE = 'D:/workBuddy_place/.tmp/toy-collection-cache';

// ---- CSV 解析（引号感知）----
function csvRows(text) {
  const out = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); out.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); out.push(row); }
  return out;
}
function readCSV(name) {
  const rows = csvRows(fs.readFileSync(path.join(CACHE, name), 'utf8'));
  const head = rows[0];
  return rows.slice(1).map((r) => { const o = {}; head.forEach((h, idx) => { o[h] = r[idx]; }); return o; });
}

// ---- 映射表 ----
const TYPE_ID = { 1:'normal',2:'fighting',3:'flying',4:'poison',5:'ground',6:'rock',7:'bug',8:'ghost',9:'steel',10:'fire',11:'water',12:'grass',13:'electric',14:'psychic',15:'ice',16:'dragon',17:'dark',18:'fairy' };
const TYPE_CN = { normal:'一般',fighting:'格斗',flying:'飞行',poison:'毒',ground:'地面',rock:'岩石',bug:'虫',ghost:'幽灵',steel:'钢',fire:'火',water:'水',grass:'草',electric:'电',psychic:'超能力',ice:'冰',dragon:'龙',dark:'恶',fairy:'妖精' };
const TYPE_COLOR = { normal:'#A8A878',fighting:'#C03028',flying:'#A890F0',poison:'#A040A0',ground:'#E0C068',rock:'#B8A038',bug:'#A8B820',ghost:'#705898',steel:'#B8B8D0',fire:'#F08030',water:'#6890F0',grass:'#78C850',electric:'#F8D030',psychic:'#F85888',ice:'#98D8D8',dragon:'#7038F8',dark:'#705848',fairy:'#EE99AC' };
const DMG_CLS = { 1:'变化', 2:'物理', 3:'特殊' };
const ZH = 12; // veekun local_language_id 中文

// ---- 读取基础数据 ----
const fanzeyi = JSON.parse(fs.readFileSync(path.join(CACHE, 'pokedex_raw.json'), 'utf8'));
const pokemonRows = readCSV('pokemon.csv');
const speciesRows = readCSV('pokemon_species.csv');
const abilRows = readCSV('pokemon_abilities.csv');
const abilities = readCSV('abilities.csv');
const abilNames = readCSV('ability_names.csv');
const moveRows = readCSV('pokemon_moves.csv');
const moves = readCSV('moves.csv');
const moveNames = readCSV('move_names.csv');

// 中文图鉴描述 / 分类 / 弱点抵抗（来自 42arch/pokemon-dataset-zh）
let descZh = {};
try {
  descZh = JSON.parse(fs.readFileSync(path.join(CACHE, 'desc_zh.json'), 'utf8'));
  let hasDesc = 0;
  for (let i = 1; i <= 809; i++) if (descZh[i] && descZh[i].desc) hasDesc++;
  console.log('中文描述覆盖: ' + hasDesc + '/809');
} catch (e) { console.log('desc_zh.json 缺失，跳过中文描述'); }

// 名称映射
const abilityNameZh = {}, abilityNameEn = {};
abilities.forEach((a) => { abilityNameEn[a.id] = a.identifier; });
abilNames.forEach((n) => { if (n.local_language_id == ZH) abilityNameZh[n.ability_id] = n.name; });
const moveNameZh = {}, moveNameEn = {};
moves.forEach((m) => { moveNameEn[m.id] = m.identifier; });
moveNames.forEach((n) => { if (n.local_language_id == ZH) moveNameZh[n.move_id] = n.name; });

// form -> species / default form / 身高体重
const formToSpecies = {}; pokemonRows.forEach((p) => { formToSpecies[p.id] = p.species_id; });
const speciesDefaultForm = {}; pokemonRows.forEach((p) => { if (p.is_default === '1' || p.is_default === 'true') speciesDefaultForm[p.species_id] = p.id; });
const formPhys = {}; pokemonRows.forEach((p) => { formPhys[p.id] = { h: Number(p.height) / 10, w: Number(p.weight) / 10 }; });
const abilByForm = {}; abilRows.forEach((a) => { (abilByForm[a.pokemon_id] = abilByForm[a.pokemon_id] || []).push({ id: a.ability_id, hidden: a.is_hidden === '1' }); });
const movesByForm = {}; moveRows.forEach((m) => { if (m.pokemon_move_method_id !== '1') return; (movesByForm[m.pokemon_id] = movesByForm[m.pokemon_id] || []).push({ id: m.move_id, level: Number(m.level) || 0 }); });
const moveDetail = {}; moves.forEach((m) => { moveDetail[m.id] = { type: TYPE_CN[TYPE_ID[m.type_id]] || '一般', power: m.power === '' || m.power == null ? null : Number(m.power), acc: m.accuracy === '' || m.accuracy == null ? null : Number(m.accuracy), cls: DMG_CLS[m.damage_class_id] || '变化' }; });

// ---- 稀有度（传说/幻之）跨七世代 ----
const LEGENDARY = new Set([144,145,146,150, 243,244,245,249,250, 377,378,379,380,381,382,383,384, 480,481,482,483,484,485,486,488, 640,641,642,643,644,645,646, 716,717,718,785,786,787,788,789,790,791,792,800]);
const MYTHICAL = new Set([151,251,385,386,489,490,491,492,493,494,647,648,649, 719,720,721,801,802,807,808,809]);
function rarityOf(id) {
  if (LEGENDARY.has(id)) return '传说';
  if (MYTHICAL.has(id)) return '幻之';
  return '普通';
}

// ---- 进化链（veekun species：evolution_chain_id / evolves_from_species_id）----
const speciesInfo = {}; // id -> { from, chain }
speciesRows.forEach((r) => {
  const id = Number(r.id); if (!id) return;
  speciesInfo[id] = {
    from: r.evolves_from_species_id ? Number(r.evolves_from_species_id) : 0,
    chain: r.evolution_chain_id ? Number(r.evolution_chain_id) : 0
  };
});
const chainMembers = {}; // chainId -> [speciesId]（只保留 1-809）
for (let i = 1; i <= 809; i++) {
  const c = speciesInfo[i] && speciesInfo[i].chain;
  if (!c) continue;
  (chainMembers[c] = chainMembers[c] || []).push(i);
}
Object.keys(chainMembers).forEach((c) => chainMembers[c].sort((a, b) => a - b));

// 按「血缘」重排同族链：根 → 子 → 孙（分支如伊布按编号展开）
function orderChain(ids) {
  const set = {}; ids.forEach((i) => { set[i] = 1; });
  const children = {}; const roots = [];
  ids.forEach((i) => {
    const f = speciesInfo[i] && speciesInfo[i].from;
    if (f && set[f]) (children[f] = children[f] || []).push(i);
    else roots.push(i);
  });
  const out = [];
  function walk(i) { out.push(i); (children[i] || []).sort((a, b) => a - b).forEach(walk); }
  roots.sort((a, b) => a - b).forEach(walk);
  ids.forEach((i) => { if (out.indexOf(i) < 0) out.push(i); }); // 兜底
  return out;
}

// ---- 官方简体中文版 TCG 卡面（duanxr/PTCG-CHS-Datasets，非商业 / 研究用途）----
// 提供：中文卡名 · 中文招式(abilityItemList) · 中文特性(cardFeatureItemList) · 卡图 · 系列 · 卡号
function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s; }
// 数据集中用字符串 "none" 表示缺省值
function val(s) { s = String(s == null ? '' : s); return (s === 'none' || s === 'None') ? '' : s; }

const CHS_IMG = 'https://raw.githubusercontent.com/duanxr/PTCG-CHS-Datasets/main/';
const RARITY_W = { C: 1, U: 1, R: 2, PR: 3, RR: 5, RRR: 4, S: 4, SR: 6, SSR: 7, CHR: 6, A: 3, CSR: 6, AR: 7, SAR: 8, K: 2, FUR: 6, HR: 7, UR: 8 };
const ATTR_CN = {};
const chsSets = {};   // 商品代号 -> 中文系列名
const chsByDex = {};  // 全国图鉴号 -> 该宝可梦的全部中文卡
try {
  const chs = JSON.parse(fs.readFileSync(path.join(CACHE, 'ptcg_chs_infos.json'), 'utf8'));
  (chs.dict.attribute || []).forEach((x) => { ATTR_CN[x.dictCode] = x.dictValue; });
  for (const col of chs.collections) {
    chsSets[col.commodityCode] = col.name;
    for (const c of (col.cards || [])) {
      const d = c.details || {};
      const dex = Number(d.pokedexCode);
      if (!(dex >= 1 && dex <= 809)) continue;
      if (d.cardType !== '1') continue;  // 只要宝可梦卡
      if (!c.image) continue;
      const atk = (d.abilityItemList || []).map((a) => ({
        n: val(a.abilityName),
        d: clip(val(a.abilityText), 76),
        c: val(a.abilityCost),
        p: val(a.abilityDamage)
      })).filter((a) => a.n || a.d);
      const ft = (d.cardFeatureItemList || []).map((f) => ({
        n: String(val(f.featureName)).replace(/（[^）]*）/g, ''),
        d: clip(val(f.featureDesc), 76)
      })).filter((f) => f.n || f.d);
      const rw = RARITY_W[d.rarityText] || 2;
      const txt = atk.reduce((s, a) => s + a.n.length + a.d.length, 0) + ft.reduce((s, f) => s + f.n.length + f.d.length, 0);
      (chsByDex[dex] = chsByDex[dex] || []).push({
        img: c.image, no: d.collectionNumber || '', col: col.commodityCode,
        name: d.cardName || c.name, hp: d.hp || 0,
        attr: ATTR_CN[d.attribute] || '', rar: d.rarityText || '',
        atk: atk, ft: ft, rw: rw,
        score: rw * 3 + atk.length * 2 + ft.length * 2 + Math.min(txt / 50, 3)
      });
    }
  }
} catch (e) { console.log('CHS 数据集缺失，跳过中文卡面'); }
let chsCov = 0; for (let i = 1; i <= 809; i++) if (chsByDex[i] && chsByDex[i].length) chsCov++;
console.log('中文卡面覆盖: ' + chsCov + '/809 | 商品系列 ' + Object.keys(chsSets).length);

// 「代表卡」= 稀有度 + 技能信息量 综合最高
function pickCnCard(list) {
  if (!list || !list.length) return null;
  return list.slice().sort((a, b) => b.score - a.score)[0];
}

// ---- 卡牌形态识别（用于 UI 形态标签与优先保留特殊版本）----
// 返回标准化形态标签，普通卡返回空串
function cardForm(name) {
  const n = String(name || '').toLowerCase();
  // VMAX/VSTAR/V 优先，避免被后面的 EX 捕获
  if (/vmax|极巨化|gigantamax/.test(n)) return '极巨化';
  if (/vstar|vstar/.test(n)) return 'V';
  if (/\bv\b| v$| v /.test(n)) return 'V';
  if (/gx/.test(n)) return 'GX';
  // 中文「超级」、英文 M/Mega 开头含 EX、全角 Ｍ → MEGA
  if (/^超级|^.?超级|M .+EX|Mega .+EX|Mega-.|Ｍ/.test(name)) return 'MEGA';
  if (/m .+ex|mega .+ex|mega-/.test(n)) return 'MEGA';
  if (/ex|ＥＸ/.test(name) && !/mex/.test(n)) return 'EX';
  if (/lv\.x|lvx|ＬＶ\.Ｘ/.test(n)) return 'LV.X';
  if (/δ/.test(name) || /delta/.test(n)) return 'δ';
  if (/光辉|shining|radiant/.test(n)) return '光辉';
  if (/dark /.test(n) || /^暗之/.test(name)) return '暗之';
  return '';
}
const FORM_ORDER = { 'EX': 1, 'MEGA': 2, 'GX': 3, 'V': 4, '极巨化': 5, 'LV.X': 6, '光辉': 7, 'δ': 8, '暗之': 9 };
function formWeight(name) {
  const f = cardForm(name);
  return FORM_ORDER[f] || 99;
}

// 「卡面版本」= 其他中文卡面，按 (商品, 卡号) 去重、稀有度优先，最多 10 张
// 同一商品里的不同卡号（如 CSMPaC 004/023 的无标记 / 无标记★）都要保留
// 优先保证 EX/MEGA/V/VMAX/光辉 等形态至少各出现一次
function pickCnVers(list, main) {
  if (!list || !list.length) return [];
  const seen = {}; const out = [];
  const gotForms = new Set();
  if (main && main.name) gotForms.add(cardForm(main.name));
  // 有特殊形态（EX/MEGA/V/极巨化/光辉…）的宝可梦保留更多版本，普通宝可梦收敛以控体积
  let hasForm = false;
  for (const c of list) { if (cardForm(c.name)) { hasForm = true; break; } }
  const MAX_CN = hasForm ? 10 : 6;
  // 第一轮：优先保留未收录的形态，同形态内按稀有度降序
  const sorted = list.slice().sort((a, b) => {
    const fa = formWeight(a.name), fb = formWeight(b.name);
    if (fa !== fb) return fa - fb;
    return b.rw - a.rw;
  });
  for (const c of sorted) {
    if (main && c.img === main.img) continue;
    const key = c.col + '|' + c.no;
    if (seen[key]) continue;
    const f = cardForm(c.name);
    if (f && gotForms.has(f)) continue; // 形态已有则第二轮再补
    seen[key] = 1;
    if (f) gotForms.add(f);
    out.push([c.img, c.no, c.col, c.rar, f]);
    if (out.length >= MAX_CN - 2) break;
  }
  // 第二轮：补满到 MAX_CN 张（按稀有度）
  const byRarity = list.slice().sort((a, b) => b.rw - a.rw);
  for (const c of byRarity) {
    if (out.length >= MAX_CN) break;
    if (main && c.img === main.img) continue;
    const key = c.col + '|' + c.no;
    if (seen[key]) continue;
    seen[key] = 1;
    out.push([c.img, c.no, c.col, c.rar, cardForm(c.name)]);
  }
  return out;
}

// ---- 英文 TCG 卡图兜底 + 英文版本列表（补充中文数据集未收录的卡，如 M Venusaur-EX）----
// 国际版卡图只在数据里存「相对 key」（如 sv3/228_hires），运行时再由 source.js 拼前缀。
// 6471 条卡面 × 每条省 44 字符 ≈ 省下 285KB 主包体积 —— 这些空间用来放中文技能说明。
const EN_IMG_BASE = 'https://images.pokemontcg.io/';
const RARITY_RANK = {
  'Rare Holo': 10, 'Rare Ultra': 11, 'Rare Secret': 12,
  'Rare Holo EX': 13, 'Rare Holo GX': 14, 'Rare Holo V': 15, 'Rare Holo VMAX': 16,
  'Rare Holo VSTAR': 17, 'Rare Holo VUNION': 15,
  'Rare Holo LV.X': 13, 'Rare Shining': 13, 'Rare Holo Star': 14,
  'Rare Prism Star': 13, 'Rare ACE': 12, 'Amazing Rare': 16,
  'Radiant Rare': 15, 'Trainer Gallery Rare Holo': 12,
  'Double Rare': 15, 'Ultra Rare': 16, 'Illustration Rare': 17,
  'Special Illustration Rare': 19, 'Hyper Rare': 20, 'Rare Rainbow': 18,
  'ACE SPEC Rare': 16, 'Shiny Rare': 15, 'Shiny Ultra Rare': 18,
  'Rare': 7, 'Uncommon': 4, 'Common': 1, 'Promo': 5
};
// 系列 code -> 英文名（缓存文件 tcg_<code>.json 里没有 set 字段，需外部映射）
let tcgSetNames = {};
try {
  const tcgSets = JSON.parse(fs.readFileSync(path.join(CACHE, 'tcg_sets.json'), 'utf8'));
  for (const s of tcgSets) tcgSetNames[s.id] = s.name;
} catch (e) { /* ignore */ }

const tcgMap = {}; // nid -> { best: {img,r}, list: [{img, no, set, rarity, r, name}] }
for (const f of fs.readdirSync(CACHE)) {
  if (!f.startsWith('tcg_') || !f.endsWith('.json')) continue;
  if (f === 'tcg_sets.json' || f === 'tcg_mapping.json') continue;
  const setCode = f.slice(4, -5); // tcg_<code>.json
  const setName = tcgSetNames[setCode] || '';
  let arr; try { arr = JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8')); } catch (e) { continue; }
  if (!Array.isArray(arr)) continue;
  for (const c of arr) {
    if (!c.nationalPokedexNumbers) continue;
    const img = String((c.images && (c.images.large || c.images.small)) || '').replace(EN_IMG_BASE, '');
    if (!img) continue;
    if (String(c.id).indexOf('?') >= 0) continue; // 卡号含 ? 的异形卡，图像地址无规律
    const r = RARITY_RANK[c.rarity] || 0;
    const no = String(c.number || '');
    const name = c.name || '';
    const entry = { img, no, set: setName, rarity: c.rarity || '', r, name };
    for (const nid of c.nationalPokedexNumbers) {
      if (nid < 1 || nid > 809) continue;
      const m = tcgMap[nid] || (tcgMap[nid] = { best: null, list: [] });
      m.list.push(entry);
      if (!m.best || r > m.best.r) m.best = entry;
    }
  }
}
for (const nid in tcgMap) {
  // 优先保证形态多样性，再按稀有度
  const list = tcgMap[nid].list;
  const gotForms = new Set();
  const prefer = []; const rest = [];
  for (const e of list) {
    const f = cardForm(e.name);
    if (f && !gotForms.has(f)) { gotForms.add(f); prefer.push(e); }
    else rest.push(e);
  }
  // 同形态内优先高稀有度
  prefer.sort((a, b) => b.r - a.r);
  rest.sort((a, b) => b.r - a.r);
  const merged = prefer.concat(rest);
  if (merged.length > 12) merged.length = 12;
  tcgMap[nid].list = merged;
}
let tcgMapped = 0; for (let i = 1; i <= 809; i++) if (tcgMap[i] && tcgMap[i].best) tcgMapped++;
console.log('英文 TCG 兜底卡图: ' + tcgMapped + '/809');

// 英文版本列表，用于补充中文数据集未收录的卡面（如 M Venusaur-EX）
// 输出紧凑数组 [img, no, set, rarity, form]
// 第 5 项存「形态标记」而不是英文卡名：页面只展示 系列/卡号/稀有度，
// 卡名唯一用途是识别形态 —— 存标记可比存卡名省约 90KB 主包体积。
function pickEnVers(id, cnList) {
  const m = tcgMap[id];
  if (!m || !m.list.length) return [];
  const cnImgs = new Set((cnList || []).map(c => c.img));
  // 有特殊形态的宝可梦保留更多国际版卡面（形态覆盖优先），普通宝可梦只留最具代表性的
  let hasForm = false;
  for (const e of m.list) { if (cardForm(e.name)) { hasForm = true; break; } }
  const MAX_EN = hasForm ? 12 : 5;
  // 形态多样性优先：每个形态最多保留 2 张（如喷火龙 X / Y 两种 MEGA 异画都能进来）
  const formCnt = {};
  const prefer = []; const rest = [];
  const CAP = hasForm ? 2 : 1;
  for (const e of m.list) {
    if (cnImgs.has(e.img)) continue;
    const f = cardForm(e.name);
    if (f && (formCnt[f] || 0) < CAP) { formCnt[f] = (formCnt[f] || 0) + 1; prefer.push(e); }
    else rest.push(e);
  }
  prefer.sort((a, b) => b.r - a.r);
  rest.sort((a, b) => b.r - a.r);
  const out = [];
  const seen = new Set();
  for (const e of prefer.concat(rest)) {
    if (out.length >= MAX_EN) break;
    if (seen.has(e.img)) continue;
    seen.add(e.img);
    out.push([e.img, e.no, e.set, e.rarity, cardForm(e.name)]);
  }
  return out;
}

// ---- 组装系列 ----
function makeFigure(id) {
  const fz = fanzeyi.find((x) => x.id === id);
  if (!fz) return null;
  const typesEn = fz.type.map((t) => t.toLowerCase());
  const typesCn = typesEn.map((t) => TYPE_CN[t] || t).join('/');
  const color = TYPE_COLOR[typesEn[0]] || '#A8A878';
  const formId = speciesDefaultForm[id] || String(id);
  const phys = formPhys[formId] || { h: 0, w: 0 };
  const abList = (abilByForm[formId] || []).map((a) => ({ name: abilityNameZh[a.id] || abilityNameEn[a.id] || ('#' + a.id), hidden: a.hidden === '1' || a.hidden === true }));
  const seen = new Set(); const uniq = [];
  (movesByForm[formId] || []).forEach((m) => { if (seen.has(m.id)) return; seen.add(m.id); uniq.push(m); });
  const cand = uniq.map((m) => { const d = moveDetail[m.id] || { type: '一般', power: null, acc: null, cls: '变化' }; return { name: moveNameZh[m.id] || moveNameEn[m.id] || ('#' + m.id), power: d.power, type: d.type, cls: d.cls, acc: d.acc, level: m.level }; });
  cand.sort((a, b) => { const pa = a.power == null ? -1 : a.power; const pb = b.power == null ? -1 : b.power; if (pa !== pb) return pb - pa; return b.level - a.level; });
  const moveSel = cand.slice(0, 3).map((m) => ({ name: m.name, power: m.power, type: m.type, cls: m.cls, acc: m.acc }));
  const base = fz.base;
  const dz = descZh[id] || {};
  // 中文卡面（代表卡 + 其他版本）
  const cnList = chsByDex[id] || [];
  const cnMain = pickCnCard(cnList);
  const cn = cnMain ? {
    n: cnMain.name, no: cnMain.no, s: cnMain.col, img: cnMain.img,
    hp: cnMain.hp, a: cnMain.attr, r: cnMain.rar,
    atk: cnMain.atk, ft: cnMain.ft
  } : null;
  // 进化关系：ef=进化前(直接)、et=进化后(直接)、ec=同族全链
  const info = speciesInfo[id] || { from: 0, chain: 0 };
  const ef = info.from && info.from >= 1 && info.from <= 809 ? [info.from] : [];
  const et = [];
  for (let k = 1; k <= 809; k++) { if (speciesInfo[k] && speciesInfo[k].from === id) et.push(k); }
  const ec = orderChain(chainMembers[info.chain] || [id]);
  const tcg = tcgMap[id];
  const enCvs = pickEnVers(id, cnList);
  return {
    id: 'pk-' + String(id).padStart(3, '0'),
    code: String(id).padStart(3, '0'),
    name: fz.name.chinese,
    sub: fz.name.english,
    types: typesCn,
    rarity: rarityOf(id),
    sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
    art: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
    cn: cn,
    cvs: pickCnVers(cnList, cnMain),
    enCvs: enCvs,
    enArt: (!cnMain && tcg && tcg.best) ? tcg.best.img : '',
    ef: ef,
    et: et,
    ec: ec,
    color: color,
    height_m: phys.h,
    weight_kg: phys.w,
    category: dz.category || '',
    desc: dz.desc || '',
    weak: dz.weak || [],
    resist: dz.resist || [],
    abilities: abList,
    base: { hp: base.HP, atk: base.Attack, def: base.Defense, spa: base['Sp. Attack'], spd: base['Sp. Defense'], spe: base.Speed },
    moves: moveSel
  };
}

function rangeFigures(a, b) {
  const out = [];
  for (let i = a; i <= b; i++) { const f = makeFigure(i); if (f) out.push(f); }
  return out;
}

const series = [
  { id: 'kanto', name: '关都地区 (Kanto)', desc: '初代 151 宝可梦，红/绿/蓝/黄。', figures: rangeFigures(1, 151) },
  { id: 'johto', name: '城都地区 (Johto)', desc: '第二世代 152-251，金/银/水晶。', figures: rangeFigures(152, 251) },
  { id: 'hoenn', name: '丰缘地区 (Hoenn)', desc: '第三世代 252-386，红宝石/蓝宝石/绿宝石。', figures: rangeFigures(252, 386) },
  { id: 'sinnoh', name: '神奥地区 (Sinnoh)', desc: '第四世代 387-493，钻石/珍珠/白金。', figures: rangeFigures(387, 493) },
  { id: 'unova', name: '合众地区 (Unova)', desc: '第五世代 494-649，黑/白/黑2/白2。', figures: rangeFigures(494, 649) },
  { id: 'kalos', name: '卡洛斯地区 (Kalos)', desc: '第六世代 650-721，X / Y。', figures: rangeFigures(650, 721) },
  { id: 'alola', name: '阿罗拉地区 (Alola)', desc: '第七世代 722-809，太阳 / 月亮 / 究极日 / 月。', figures: rangeFigures(722, 809) }
];

const out = {
  ip: 'pokemon',
  brand: '宝可梦',
  accent: '#3B7DDD',
  accent2: '#FFCB05',
  unit: '只',
  cnSets: chsSets,
  series
};

// 紧凑输出（不美化）——缩进会让体积翻 2.6 倍，小程序主包有 2MB 上限
const js = 'module.exports = ' + JSON.stringify(out) + ';\n';
fs.writeFileSync(path.join(ROOT, 'data/pokemon.js'), js);
console.log('WROTE data/pokemon.js with', series.reduce((s, x) => s + x.figures.length, 0), 'figures total', (js.length / 1024).toFixed(0) + 'KB');
const s1 = series[0].figures[0];
console.log('sample pk-001 妙蛙种子: cn=' + (s1.cn ? s1.cn.n + ' ' + s1.cn.s + ' #' + s1.cn.no + ' ' + s1.cn.hp + 'HP ' + s1.cn.a : '无'));
if (s1.cn) {
  console.log('  招式:', s1.cn.atk.map((a) => a.n + '(' + (a.p || '-') + ') ' + a.d).join(' | '));
  console.log('  特性:', s1.cn.ft.map((f) => f.n + ': ' + f.d).join(' | '));
  console.log('  版本(' + s1.cvs.length + '):', s1.cvs.map((v) => v[2] + '#' + v[1]).join(', '));
}
const s6 = series[0].figures[5];
console.log('sample pk-006 喷火龙: cn=' + s6.cn.n + ' ' + s6.cn.s + ' #' + s6.cn.no + ' ' + s6.cn.hp + 'HP ' + s6.cn.a + ' ' + s6.cn.r);
console.log('  招式:', s6.cn.atk.map((a) => a.n + '(' + (a.p || '-') + ') ' + a.d).join(' | '));
console.log('  特性:', s6.cn.ft.map((f) => f.n + ': ' + f.d).join(' | '));
console.log('  版本(' + s6.cvs.length + '):', s6.cvs.map((v) => v[2] + '#' + v[1] + ' ' + v[3] + ' ' + v[4]).join(' | '));
console.log('  evo ec=' + s6.ec.map((x) => x).join('→'));
const s494 = series[4].figures[0];
console.log('sample pk-494:', s494.name, 'cn=' + (s494.cn ? s494.cn.n + ' ' + s494.cn.s : '无') + ' enArt=' + (s494.enArt ? '有' : '无'));
let withCn = 0, versSum = 0, atkSum = 0, ftSum = 0, eo = 0;
series.forEach((s) => s.figures.forEach((f) => {
  if (f.cn) { withCn++; versSum += f.cvs.length; atkSum += f.cn.atk.length; ftSum += f.cn.ft.length; }
  if (f.ef.length || f.et.length) eo++;
}));
console.log('统计：中文卡面 ' + withCn + '/809 | 版本均 ' + (versSum / 809).toFixed(1) + ' | 招式均 ' + (atkSum / 809).toFixed(2) + ' | 特性均 ' + (ftSum / 809).toFixed(2) + ' | 有进化关系 ' + eo + '/809');
