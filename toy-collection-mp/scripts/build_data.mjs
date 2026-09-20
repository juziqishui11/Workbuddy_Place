// scripts/build_data.mjs —— 合并 fanzeyi(种族值/中文名/属性) + veekun(身高/体重/特性/招式) + TCG卡图(pokemon-tcg-data)
// 输出 data/pokemon.js：全国图鉴 1-649（关都/城都/丰缘/神奥/合众），每 figure 含 tcgArt。
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
  for (let i = 1; i <= 649; i++) if (descZh[i] && descZh[i].desc) hasDesc++;
  console.log('中文描述覆盖: ' + hasDesc + '/649');
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

// ---- 稀有度（传说/幻之）跨五世代 ----
const LEGENDARY = new Set([144,145,146,150, 243,244,245,249,250, 377,378,379,380,381,382,383,384, 480,481,482,483,484,485,486,488, 640,641,642,643,644,645,646]);
const MYTHICAL = new Set([151,251,385,386,489,490,491,492,493,494,647,648,649]);
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
const chainMembers = {}; // chainId -> [speciesId]（只保留 1-649）
for (let i = 1; i <= 649; i++) {
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
      if (!(dex >= 1 && dex <= 649)) continue;
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
let chsCov = 0; for (let i = 1; i <= 649; i++) if (chsByDex[i] && chsByDex[i].length) chsCov++;
console.log('中文卡面覆盖: ' + chsCov + '/649 | 商品系列 ' + Object.keys(chsSets).length);

// 「代表卡」= 稀有度 + 技能信息量 综合最高
function pickCnCard(list) {
  if (!list || !list.length) return null;
  return list.slice().sort((a, b) => b.score - a.score)[0];
}
// 「卡面版本」= 其他中文卡面，按商品去重、稀有度优先，最多 5 张
function pickCnVers(list, main) {
  if (!list || !list.length) return [];
  const seen = {}; const out = [];
  const sorted = list.slice().sort((a, b) => b.rw - a.rw);
  for (const c of sorted) {
    if (main && c.img === main.img) continue;
    if (seen[c.col]) continue;
    seen[c.col] = 1;
    out.push([c.img, c.no, c.col, c.rar]);
    if (out.length >= 6) break;
  }
  return out;
}

// ---- 英文 TCG 卡图兜底（少数没有简体中文卡的宝可梦）----
const RARITY_RANK = { 'Rare Holo': 10, 'Rare Ultra': 11, 'Rare Secret': 12, 'Rare Holo EX': 13, 'Rare Holo GX': 14, 'Rare Holo V': 15, 'Rare Holo VMAX': 16, 'Rare': 7, 'Uncommon': 4, 'Common': 1, 'Promo': 5 };
const tcgMap = {};
for (const f of fs.readdirSync(CACHE)) {
  if (!f.startsWith('tcg_') || !f.endsWith('.json')) continue;
  if (f === 'tcg_sets.json' || f === 'tcg_mapping.json') continue;
  let arr; try { arr = JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8')); } catch (e) { continue; }
  if (!Array.isArray(arr)) continue;
  for (const c of arr) {
    if (!c.nationalPokedexNumbers) continue;
    const img = c.images && (c.images.large || c.images.small);
    if (!img) continue;
    if (String(c.id).indexOf('?') >= 0) continue; // 卡号含 ? 的异形卡，图像地址无规律
    const r = RARITY_RANK[c.rarity] || 0;
    for (const nid of c.nationalPokedexNumbers) {
      if (nid < 1 || nid > 649) continue;
      if (!tcgMap[nid] || r > (tcgMap[nid].r || 0)) tcgMap[nid] = { img, r };
    }
  }
}
let tcgMapped = 0; for (let i = 1; i <= 649; i++) if (tcgMap[i]) tcgMapped++;
console.log('英文 TCG 兜底卡图: ' + tcgMapped + '/649');

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
  const ef = info.from && info.from >= 1 && info.from <= 649 ? [info.from] : [];
  const et = [];
  for (let k = 1; k <= 649; k++) { if (speciesInfo[k] && speciesInfo[k].from === id) et.push(k); }
  const ec = orderChain(chainMembers[info.chain] || [id]);
  const tcg = tcgMap[id];
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
    enArt: (!cnMain && tcg) ? tcg.img : '',
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
  { id: 'unova', name: '合众地区 (Unova)', desc: '第五世代 494-649，黑/白/黑2/白2。', figures: rangeFigures(494, 649) }
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
console.log('  版本(' + s6.cvs.length + '):', s6.cvs.map((v) => v[2] + '#' + v[1] + ' ' + v[3]).join(', '));
console.log('  evo ec=' + s6.ec.map((x) => x).join('→'));
const s494 = series[4].figures[0];
console.log('sample pk-494:', s494.name, 'cn=' + (s494.cn ? s494.cn.n + ' ' + s494.cn.s : '无') + ' enArt=' + (s494.enArt ? '有' : '无'));
let withCn = 0, versSum = 0, atkSum = 0, ftSum = 0, eo = 0;
series.forEach((s) => s.figures.forEach((f) => {
  if (f.cn) { withCn++; versSum += f.cvs.length; atkSum += f.cn.atk.length; ftSum += f.cn.ft.length; }
  if (f.ef.length || f.et.length) eo++;
}));
console.log('统计：中文卡面 ' + withCn + '/649 | 版本均 ' + (versSum / 649).toFixed(1) + ' | 招式均 ' + (atkSum / 649).toFixed(2) + ' | 特性均 ' + (ftSum / 649).toFixed(2) + ' | 有进化关系 ' + eo + '/649');
