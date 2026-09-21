/**
 * 卡牌**规则文本**中文化（detail 页「卡牌规则」区）。
 *
 * 规则文本高度模板化：分包里 86 条唯一规则、405 次出现，绝大多数可以：
 *   ① 从简中数据集（ptcg_chs_infos.json）里挖到官方原文 —— 自动
 *   ② 用「官方表述模板 + 卡名/属性占位」生成 —— 半自动（简中未发售的世代）
 * 只有极少数需要手工兜底（脚本会打印出来）。
 *
 * 输出并入 scripts/en-skill-zh.json（英文原文 → 中文），可反复运行。
 * 用法：node scripts/rules_zh.mjs [--dry-run]
 */
import fs from 'fs';

const ROOT = 'D:/workBuddy_place/toy-collection-mp';
const TMP = 'D:/workBuddy_place/.tmp';
const CACHE = TMP + '/toy-collection-cache';
const CHS = CACHE + '/ptcg_chs_infos.json';
const ALL = TMP + '/translate_all.json';
const DICT = ROOT + '/scripts/en-skill-zh.json';
const DRY = process.argv.indexOf('--dry-run') >= 0;

// ---------- 1. 从简中数据集挖规则原文 ----------
// 简中规则文本按「形态后缀」归类（如 GX 卡的规则句是固定的一句）
const KIND_OF_RULE = [
  [/^当(.+?)【昏厥】时，对手将拿取(\d+)张奖赏卡。$/, null], // 形如「当宝可梦GX【昏厥】时…」
];
const chsRule = {};
{
  const J = JSON.parse(fs.readFileSync(CHS, 'utf8'));
  const cnt = {};
  for (const col of (J.collections || [])) {
    for (const card of (col.cards || [])) {
      const d = card.details || {};
      const rt = String(d.ruleText || '').trim();
      if (!rt) continue;
      // 只看「宝可梦自身」的规则句，排除训练家卡的效果文本
      const isPokeRule = /^当(宝可梦|TAG TEAM).*【昏厥】/.test(rt) || /^1副卡组中只能放入1张光辉宝可梦卡。$/.test(rt);
      if (!isPokeRule) continue;
      cnt[rt] = (cnt[rt] || 0) + 1;
    }
  }
  // 每种「形态」取出现最多的一句
  const pick = (re) => {
    const hit = Object.entries(cnt).filter(([k]) => re.test(k)).sort((a, b) => b[1] - a[1]);
    return hit.length ? hit[0][0] : null;
  };
  chsRule.ex = pick(/^当宝可梦ex【昏厥】时/);
  chsRule.EX = pick(/^当宝可梦EX【昏厥】时/);
  chsRule.GX = pick(/^当宝可梦GX【昏厥】时/);
  chsRule.V = pick(/^当宝可梦V【昏厥】时/);
  chsRule.VMAX = pick(/^当宝可梦VMAX【昏厥】时/);
  chsRule.VSTAR = pick(/^当宝可梦VSTAR【昏厥】时/);
  chsRule.TAG = pick(/^当TAG TEAM【昏厥】时/);
  chsRule.radiant = pick(/^1副卡组中只能放入1张光辉宝可梦卡。$/);
}

// ---------- 2. 属性名（δ 双属性卡用）----------
const TYPE_ZH = {
  Grass: '草', Fire: '火', Water: '水', Lightning: '雷', Psychic: '超',
  Fighting: '斗', Darkness: '恶', Metal: '钢', Fairy: '妖', Dragon: '龙', Colorless: '无'
};
const TYPE_ALT = Object.keys(TYPE_ZH).join('|');

// ---------- 3. 模板 ----------
// 每条：[匹配正则, 生成函数(match)->中文]
const TEMPLATES = [
  // —— 奖品卡规则（世代演进，简中只有部分）——
  [/^When Pokémon-ex has been [Kk]nocked [Oo]ut, your opponent takes 2 Prize cards\.?$/,
    () => chsRule.EX || '当宝可梦EX【昏厥】时，对手将拿取2张奖赏卡。'],
  [/^As long as this Pokémon is on your Bench, prevent all damage done to this Pokémon by attacks.*$/,
    () => '太晶：只要这只宝可梦，处于备战区，就不会受到招式的伤害。'],
  [/^Pokémon-EX rule: When a Pokémon-EX has been Knocked Out, your opponent takes 2 Prize cards\.?$/,
    () => '宝可梦EX规则：' + (chsRule.EX || '当宝可梦EX【昏厥】时，对手将拿取2张奖赏卡。')],
  [/^Mega Evolution rule: When 1 of your Pokémon becomes a Mega Evolution Pokémon, your turn ends\.?$/,
    () => '成为M进化宝可梦时，自己的回合结束。'],
  [/^Tera: As long as this Pokémon is on your Bench, prevent all damage done to this Pokémon by attacks.*$/,
    () => '太晶：只要这只宝可梦，处于备战区，就不会受到招式的伤害。'],
  [/^Pokémon ex rule: When your Pokémon ex is Knocked Out, your opponent takes 2 Prize cards\.?$/,
    () => chsRule.ex || '当宝可梦ex【昏厥】时，对手将拿取2张奖赏卡。'],
  [/^V rule: When your Pokémon V is Knocked Out.*$/,
    () => chsRule.V || '当宝可梦V【昏厥】时，对手将拿取2张奖赏卡。'],
  [/^VMAX rule: When your Pokémon VMAX is Knocked Out.*$/,
    () => chsRule.VMAX || '当宝可梦VMAX【昏厥】时，对手将拿取3张奖赏卡。'],
  [/^VSTAR rule: When your Pokémon VSTAR is Knocked Out.*$/,
    () => chsRule.VSTAR || '当宝可梦VSTAR【昏厥】时，对手将拿取2张奖赏卡。'],
  [/^Pokémon-GX rule: When your Pokémon-GX is Knocked Out.*$/,
    () => chsRule.GX || '当宝可梦GX【昏厥】时，对手将拿取2张奖赏卡。'],
  [/^TAG TEAM rule: When your TAG TEAM is Knocked Out.*$/,
    () => chsRule.TAG || '当TAG TEAM【昏厥】时，对手将拿取3张奖赏卡。'],
  [/^Radiant Pokémon Rule:.*$/,
    () => chsRule.radiant || '1副卡组中只能放入1张光辉宝可梦卡。'],
  [/^You can't use more than 1 GX attack in a game\.?$/,
    () => '1场对战中只能使用1次GX招式。'],
  [/^\(You can't use more than 1 GX attack in a game\.\)$/,
    () => '（1场对战中只能使用1次GX招式。）'],

  // —— δ 双属性（注意英文里两种属性之间可能连写，如 "GrassDarkness type"）——
  [new RegExp('^This Pokémon is both (.+?)\\s*(' + TYPE_ALT + ') type\\.?$'),
    (m) => {
      const a = TYPE_ZH[m[1]] || m[1], b = TYPE_ZH[m[2]] || m[2];
      return '这只宝可梦同时为【' + a + '】【' + b + '】属性。';
    }],

  // —— 卡组放入张数 ——
  [/^You may have as many of this card in your deck as you like\.?$/,
    () => '这张卡牌可以在卡组中放入任意张。'],
  [/^You can't have more than 1 Shining .+? in your deck\.?$/,
    () => '1副卡组中只能放入1张光辉宝可梦卡。'],
  [/^You can't have more than 1 Pokémon Star in your deck\.?$/,
    () => '1副卡组中只能放入1张宝可梦★。'],
  [/^You can't have more than 1 .+ in your deck\.?$/,
    (m) => '1副卡组中只能放入1张' + ZH_NAME(m[0].replace(/^You can't have more than 1 /, '').replace(/ in your deck\.?$/, '')) + '。'],

  // —— LV.X 摆放规则 ——
  [/^Put this card onto your Active (.+?)\.\s*(.+?) LV\.?\s?X can use any attack, Poké-Power, or Poké-Body from its previous [Ll]evel\.?$/,
    (m) => '将这张卡牌放于自己的战斗宝可梦「' + ZH_NAME(m[1]) + '」上。可从上一等级起使用其拥有的招式、宝可力量与宝可身体。'],

  // —— 其它杂项 ——
  [/^\(This card cannot be used at official tournaments\.\)$/,
    () => '（这张卡牌不能在官方比赛中使用。）'],
  [/^This card can't be used at official tournaments\.?$/,
    () => '这张卡牌不能在官方比赛中使用。']
];

/** 宝可梦英文名 → 中文名（用 data/pokemon.js 的名称表；查不到则原样保留） */
const NAME_ZH = {};
{
  const { createRequire } = await import('module');
  const req = createRequire(import.meta.url);
  const pk = req(ROOT + '/data/pokemon.js');
  for (const s of pk.series) {
    for (const f of s.figures) {
      // sub 存的就是英文名（如 喷火龙 → Charizard）
      if (f.sub) NAME_ZH[String(f.sub).trim().toLowerCase()] = f.name;
    }
  }
}
function ZH_NAME(en) {
  const raw = String(en || '').trim();
  // 拆出卡名后缀（G / FB / GL / E4 / C / LV.X），中文卡名同样保留
  let base = raw, suffix = '';
  const m = raw.match(/^(.*?)\s+(G|FB|GL|E4|C|LV\.?\s?X)$/i);
  if (m) { base = m[1]; suffix = m[2].toUpperCase().replace(/\s+/g, ''); }
  const zh = NAME_ZH[base.trim().toLowerCase()];
  if (zh) return zh + suffix;
  const stripped = base.replace(/\s+(g|fb|e4|c|gl|lv\.?x)$/i, '').trim();
  if (NAME_ZH[stripped]) return NAME_ZH[stripped] + suffix;
  return raw;
}

// ---------- 4. 逐条处理 ----------
const all = JSON.parse(fs.readFileSync(ALL, 'utf8'));
const rules = [...new Set(all.filter(x => x.k === 'ru').map(x => x.en))];
const dict = fs.existsSync(DICT) ? JSON.parse(fs.readFileSync(DICT, 'utf8')) : {};

const miss = []; const done = [];
for (const en of rules) {
  let zh = null;
  for (const [re, fn] of TEMPLATES) {
    const m = en.match(re);
    if (m) { zh = fn(m); break; }
  }
  if (zh) { done.push([en, zh]); dict[en] = zh; } else miss.push(en);
}

if (!DRY) fs.writeFileSync(DICT, JSON.stringify(dict, null, 1), 'utf8');

console.log('规则文本总数:', rules.length, '| 模板命中:', done.length, '| 未命中:', miss.length);
console.log('\n=== 模板命中（按规则族）===');
done.forEach(([a, b]) => console.log('  ' + a.slice(0, 78) + '\n      → ' + b));
console.log('\n=== 未命中（需手工兜底）===');
miss.forEach(a => console.log('  - ' + a));
console.log('\n词典总计:', Object.keys(dict).length, DRY ? '[dry-run，未写入]' : '→ ' + DICT);
