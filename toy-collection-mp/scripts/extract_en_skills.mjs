/**
 * 从英文 TCG 缓存里提取「国际版卡面」的技能数据，产出两份中间产物：
 *
 *   1. en_skills.json —— 卡片维度：{ cardKey: {n,no,s,hp,ty,form,ft[],atk[],ru[]} }
 *      cardKey = 图片 URL 里 "系列/编号" 段，如 "sv3/228"
 *   2. en_texts.json  —— 唯一英文文本清单（供翻译），[ {en, kind} ]
 *      kind = 'atk' | 'ft'   （招式效果 / 特性效果）
 *
 * 收录两类英文卡：
 *   ① 带特殊形态的（EX/MEGA/GX/V/极巨化/光辉/LV.X/δ/暗之）—— 这些正是简中版数据集
 *      尚未收录、只能用国际版卡面的卡，基础卡本身有中文卡面，无需翻译。
 *   ② 该宝可梦**完全没有简中版卡**的（如青藤蛇、探探鼠）—— 详情页主卡面直接就是
 *      国际版卡面，不收录的话技能区会空白。
 *
 * 用法：node scripts/extract_en_skills.mjs
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const CACHE = 'D:/workBuddy_place/.tmp/toy-collection-cache';
const OUT_DIR = 'D:/workBuddy_place/.tmp';
const POKEMON = 'D:/workBuddy_place/toy-collection-mp/data/pokemon.js';

// ---------- 能量 / 属性 中文映射 ----------
const EN_TYPE = {
  Grass: ['草', '#78C850'], Fire: ['火', '#F08030'], Water: ['水', '#6890F0'],
  Lightning: ['雷', '#F8D030'], Psychic: ['超', '#F85888'], Fighting: ['斗', '#C03028'],
  Darkness: ['恶', '#705848'], Metal: ['钢', '#B8B8D0'], Fairy: ['妖', '#EE99AC'],
  Dragon: ['龙', '#7038F8'], Colorless: ['无', '#A8A878']
};

// ---------- 1. 建立英文卡索引（img URL -> 卡对象） ----------
const setFiles = fs.readdirSync(CACHE)
  .filter(f => f.startsWith('tcg_') && f.endsWith('.json')
    && !['tcg_sets.json', 'tcg_mapping.json'].includes(f));

/** 归一化卡面 key：完整 URL 与 enCvs 里的短键都收敛到 "系列/编号"
 *  https://images.pokemontcg.io/sv3/228_hires.png -> sv3/228
 *  sv3/228_hires.png                              -> sv3/228  */
function cardKeyOf(url) {
  const s = String(url || '');
  const m = s.match(/pokemontcg\.io\/([^/]+)\/([^/]+?)\.png/);
  if (m) return m[1] + '/' + m[2].replace(/_hires$/, '');
  const m2 = s.match(/^([^/]+)\/(.+?)\.png$/);
  if (m2) return m2[1] + '/' + m2[2].replace(/_hires$/, '');
  return '';
}

// 索引统一按 cardKeyOf 归一化（enCvs 存的是短键，缓存里是完整 URL）
const byKey = {};
for (const f of setFiles) {
  let arr;
  try { arr = JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8')); } catch (e) { continue; }
  if (!Array.isArray(arr)) continue;
  for (const c of arr) {
    const k1 = c.images && c.images.large ? cardKeyOf(c.images.large) : '';
    const k2 = c.images && c.images.small ? cardKeyOf(c.images.small) : '';
    if (k1 && !byKey[k1]) byKey[k1] = c;
    if (k2 && !byKey[k2]) byKey[k2] = c;
  }
}

// ---------- 2. 遍历 pokemon.js，挑出带形态的英文卡 ----------
const pk = require(POKEMON);
const allFigures = pk.series.flatMap(s => s.figures);

const skills = {};
const texts = new Map();       // 英文原文 -> kind
let formCards = 0, skipped = 0;

for (const fig of allFigures) {
  // 该宝可梦没有简中版卡（如青藤蛇）→ 详情页主卡面直接就是国际版卡面，必须收录
  const noCn = !fig.cn;
  for (const v of (fig.enCvs || [])) {
    const form = v[4] || '';
    if (!form && !noCn) continue;              // 带形态的必收；无形态的只在「无中文卡」时收
    const card = byKey[cardKeyOf(v[0])];
    if (!card) { skipped++; continue; }
    const key = cardKeyOf(v[0]);
    if (!key || skills[key]) continue;
    formCards++;

    const ft = (card.abilities || []).map(a => ({
      n: a.name || '', t: a.type || '', d: a.text || ''
    })).filter(x => x.n || x.d);

    const atk = (card.attacks || []).map(a => ({
      n: a.name || '',
      c: (a.cost || []).map(x => {
        const m = EN_TYPE[x] || ['', '#888'];
        return { n: m[0], c: m[1] };
      }),
      p: a.damage || '',
      d: a.text || ''
    })).filter(x => x.n || x.d);

    const rules = (card.rules || []).slice(0, 2);

    const ty = (card.types || []).map(t => (EN_TYPE[t] || [t])[0]).join('/');

    skills[key] = {
      n: card.name || '', no: card.number || '', s: v[2] || '',
      hp: card.hp || '', ty: ty, form: form,
      ft: ft, atk: atk, ru: rules
    };

    ft.forEach(x => { if (x.d) texts.set(x.d, 'ft'); });
    atk.forEach(x => { if (x.d) texts.set(x.d, 'atk'); });
  }
}

const textList = [...texts.entries()].map(([en, kind]) => ({ en, kind }));

fs.writeFileSync(path.join(OUT_DIR, 'en_skills.json'), JSON.stringify(skills), 'utf8');
fs.writeFileSync(path.join(OUT_DIR, 'en_texts.json'), JSON.stringify(textList, null, 1), 'utf8');

const bytes = textList.reduce((a, x) => a + x.en.length, 0);
console.log('带形态的英文卡:', formCards, '（缓存未命中跳过', skipped, '）');
console.log('唯一技能文本:', textList.length,
  '| 招式', textList.filter(x => x.kind === 'atk').length,
  '| 特性', textList.filter(x => x.kind === 'ft').length);
console.log('英文原文字符数:', bytes, '(约', (bytes / 1024).toFixed(0), 'KB)');
console.log('样例 key:', Object.keys(skills).slice(0, 5).join(', '));
console.log('产出:', OUT_DIR + '/en_skills.json');
