// scripts/build_data.mjs —— 合并 fanzeyi(种族值/中文名/属性) + veekun(身高/体重/特性/招式) → data/pokemon.js
import fs from 'fs';
import path from 'path';

const ROOT = 'D:/workBuddy_place/toy-collection-mp';
const CACHE = path.join(ROOT, 'scripts/cache');

// ---- 解析 CSV（按行 + 引号感知拆字段）----
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
  const txt = fs.readFileSync(path.join(CACHE, name), 'utf8');
  const rows = csvRows(txt);
  const head = rows[0];
  return rows.slice(1).map((r) => {
    const o = {};
    head.forEach((h, idx) => { o[h] = r[idx]; });
    return o;
  });
}

// ---- 映射表 ----
const TYPE_ID = { 1:'normal',2:'fighting',3:'flying',4:'poison',5:'ground',6:'rock',7:'bug',8:'ghost',9:'steel',10:'fire',11:'water',12:'grass',13:'electric',14:'psychic',15:'ice',16:'dragon',17:'dark',18:'fairy' };
const TYPE_CN = { normal:'一般',fighting:'格斗',flying:'飞行',poison:'毒',ground:'地面',rock:'岩石',bug:'虫',ghost:'幽灵',steel:'钢',fire:'火',water:'水',grass:'草',electric:'电',psychic:'超能力',ice:'冰',dragon:'龙',dark:'恶',fairy:'妖精' };
const TYPE_COLOR = { normal:'#A8A878',fighting:'#C03028',flying:'#A890F0',poison:'#A040A0',ground:'#E0C068',rock:'#B8A038',bug:'#A8B820',ghost:'#705898',steel:'#B8B8D0',fire:'#F08030',water:'#6890F0',grass:'#78C850',electric:'#F8D030',psychic:'#F85888',ice:'#98D8D8',dragon:'#7038F8',dark:'#705848',fairy:'#EE99AC' };
const DMG_CLS = { 1:'变化', 2:'物理', 3:'特殊' };

const ZH = 12; // veekun local_language_id 中文

// ---- 读取数据 ----
const fanzeyi = JSON.parse(fs.readFileSync(path.join(CACHE, 'pokedex_raw.json'), 'utf8'));
const pokemonRows = readCSV('pokemon.csv');
const speciesRows = readCSV('pokemon_species.csv');
const abilRows = readCSV('pokemon_abilities.csv');
const abilities = readCSV('abilities.csv');
const abilNames = readCSV('ability_names.csv');
const moveRows = readCSV('pokemon_moves.csv');
const moves = readCSV('moves.csv');
const moveNames = readCSV('move_names.csv');

// 名称映射
const abilityNameZh = {};
const abilityNameEn = {};
abilities.forEach((a) => { abilityNameEn[a.id] = a.identifier; });
abilNames.forEach((n) => {
  if (n.local_language_id == ZH) abilityNameZh[n.ability_id] = n.name;
});
const moveNameZh = {};
const moveNameEn = {};
moves.forEach((m) => { moveNameEn[m.id] = m.identifier; });
moveNames.forEach((n) => {
  if (n.local_language_id == ZH) moveNameZh[n.move_id] = n.name;
});

// form -> species
const formToSpecies = {};
pokemonRows.forEach((p) => { formToSpecies[p.id] = p.species_id; });
const speciesDefaultForm = {};
pokemonRows.forEach((p) => {
  if (p.is_default === '1' || p.is_default === 'true') speciesDefaultForm[p.species_id] = p.id;
});
// 身高/体重 by form
const formPhys = {};
pokemonRows.forEach((p) => { formPhys[p.id] = { h: Number(p.height) / 10, w: Number(p.weight) / 10 }; });

// 特性 by form
const abilByForm = {};
abilRows.forEach((a) => {
  (abilByForm[a.pokemon_id] = abilByForm[a.pokemon_id] || []).push({ id: a.ability_id, hidden: a.is_hidden === '1' });
});
// 招式 by form（method 1 = 升级）
const movesByForm = {};
moveRows.forEach((m) => {
  if (m.pokemon_move_method_id !== '1') return;
  (movesByForm[m.pokemon_id] = movesByForm[m.pokemon_id] || []).push({ id: m.move_id, level: Number(m.level) || 0 });
});
// move 详情
const moveDetail = {};
moves.forEach((m) => {
  moveDetail[m.id] = {
    type: TYPE_CN[TYPE_ID[m.type_id]] || '一般',
    power: m.power === '' || m.power == null ? null : Number(m.power),
    acc: m.accuracy === '' || m.accuracy == null ? null : Number(m.accuracy),
    cls: DMG_CLS[m.damage_class_id] || '变化'
  };
});

const LEGENDARY = new Set([144, 145, 146, 150]);
const MYTHICAL = new Set([151]);

function rarityOf(id) {
  if (LEGENDARY.has(id)) return '传说';
  if (MYTHICAL.has(id)) return '幻之';
  return '普通';
}

// ---- 组装 Kanto 1..151 ----
const figures = [];
for (let id = 1; id <= 151; id++) {
  const fz = fanzeyi.find((x) => x.id === id);
  if (!fz) { console.log('MISSING fanzeyi id', id); continue; }
  const typesEn = fz.type.map((t) => t.toLowerCase());
  const typesCn = typesEn.map((t) => TYPE_CN[t] || t).join('/');
  const color = TYPE_COLOR[typesEn[0]] || '#A8A878';
  const formId = speciesDefaultForm[id] || String(id);
  const phys = formPhys[formId] || { h: 0, w: 0 };

  // 特性
  const abList = (abilByForm[formId] || []).map((a) => ({
    name: abilityNameZh[a.id] || abilityNameEn[a.id] || ('#'+a.id),
    hidden: a.hidden === '1' || a.hidden === true
  }));

  // 招式：升级招式（按 move_id 去重，保留最高等级），按 威力降序、无威力按等级降序，取前 3
  const seen = new Set();
  const uniq = [];
  (movesByForm[formId] || []).forEach((m) => {
    if (seen.has(m.id)) return;
    seen.add(m.id);
    uniq.push(m);
  });
  const cand = uniq.map((m) => {
    const d = moveDetail[m.id] || { type: '一般', power: null, acc: null, cls: '变化' };
    return { name: moveNameZh[m.id] || moveNameEn[m.id] || ('#'+m.id), power: d.power, type: d.type, cls: d.cls, acc: d.acc, level: m.level };
  });
  cand.sort((a, b) => {
    const pa = a.power == null ? -1 : a.power;
    const pb = b.power == null ? -1 : b.power;
    if (pa !== pb) return pb - pa;
    return b.level - a.level;
  });
  const moveSel = cand.slice(0, 3).map((m) => ({ name: m.name, power: m.power, type: m.type, cls: m.cls, acc: m.acc }));

  const base = fz.base;
  figures.push({
    id: 'pk-' + String(id).padStart(3, '0'),
    code: String(id).padStart(3, '0'),
    name: fz.name.chinese,
    sub: fz.name.english,
    types: typesCn,
    rarity: rarityOf(id),
    sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
    art: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
    color: color,
    height_m: phys.h,
    weight_kg: phys.w,
    abilities: abList,
    base: {
      hp: base.HP, atk: base.Attack, def: base.Defense,
      spa: base['Sp. Attack'], spd: base['Sp. Defense'], spe: base.Speed
    },
    moves: moveSel
  });
}

const out = {
  ip: 'pokemon',
  brand: '宝可梦',
  accent: '#3B7DDD',
  accent2: '#FFCB05',
  unit: '只',
  series: [{
    id: 'kanto',
    name: '关都地区 (Kanto)',
    desc: '初代 151 宝可梦图鉴，数据源自 PokeAPI / fanzeyi pokedex / veekun。',
    figures: figures
  }]
};

const js = 'module.exports = ' + JSON.stringify(out, null, 2) + ';\n';
fs.writeFileSync(path.join(ROOT, 'data/pokemon.js'), js);
console.log('WROTE data/pokemon.js with', figures.length, 'figures');
// 抽样校验
const s = figures[0];
console.log('sample pk-001:', s.name, 'h=' + s.height_m, 'w=' + s.weight_kg, 'ab=' + JSON.stringify(s.abilities), 'base=' + JSON.stringify(s.base), 'moves=' + s.moves.length);
console.log('  move0:', JSON.stringify(s.moves[0]));
const m = figures[150];
console.log('sample pk-151:', m.name, m.rarity, 'ab=' + JSON.stringify(m.abilities));
