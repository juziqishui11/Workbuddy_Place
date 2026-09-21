/**
 * 把「国际版卡面」的技能数据打包成小程序分包数据文件 packageSkill/en-skills.js
 *
 * 输入：
 *   .tmp/en_skills.json         —— 由 extract_en_skills.mjs 从英文 TCG 缓存提取（卡片维度）
 *   scripts/en-skill-zh.json    —— 英文原文 → 中文 对照词典（长期维护，可增量补充）
 * 输出：
 *   packageSkill/en-skills.js   —— 紧凑结构，供详情页查表
 *
 * 译文缺失时对应槽位为 ''，页面会回落显示英文原文 —— 因此词典可以分批补充，
 * 不必等全量翻译完成才上线。
 *
 * 用法：node scripts/build_en_skills.mjs
 */
import fs from 'fs';

const TMP = 'D:/workBuddy_place/.tmp';
const ROOT = 'D:/workBuddy_place/toy-collection-mp';
const OUT = ROOT + '/packageSkill/en-skills.js';

const skills = JSON.parse(fs.readFileSync(TMP + '/en_skills.json', 'utf8'));
const dict = fs.existsSync(ROOT + '/scripts/en-skill-zh.json')
  ? JSON.parse(fs.readFileSync(ROOT + '/scripts/en-skill-zh.json', 'utf8'))
  : {};

/** 文本池：英文原文 -> 索引（招式效果、特性效果、规则文本共用） */
const T = [];
const tIdx = {};
function poolId(s) {
  if (!s) return -1;
  if (tIdx[s] === undefined) { tIdx[s] = T.length; T.push(s); }
  return tIdx[s];
}
/** 名称池：招式名 / 特性名 */
const N = [];
const nIdx = {};
function nameId(s) {
  if (!s) return -1;
  if (nIdx[s] === undefined) { nIdx[s] = N.length; N.push(s); }
  return nIdx[s];
}
/** 能量池 */
const E = [];
const eIdx = {};
function energyId(o) {
  const k = o.n + '|' + o.c;
  if (eIdx[k] === undefined) { eIdx[k] = E.length; E.push([o.n, o.c]); }
  return eIdx[k];
}

const C = {};
for (const key in skills) {
  const c = skills[key];
  const ft = (c.ft || []).map(a => [nameId(a.n), a.t || '', poolId(a.d)]);
  const atk = (c.atk || []).map(a => [
    nameId(a.n),
    a.p || '',
    (a.c || []).map(energyId),
    poolId(a.d)
  ]);
  const ru = (c.ru || []).map(poolId);
  C[key] = [c.n || '', c.no || '', c.s || '', c.hp || '', c.ty || '', c.form || '', ft, atk, ru];
}

// 中文译文池（与 T / N 同索引，缺省空串）
const Z = T.map(en => dict[en] || '');
const ZN = N.map(en => dict[en] || '');

const trans = Z.filter(Boolean).length;
const transN = ZN.filter(Boolean).length;

const header = '/* 自动生成，勿手改 —— 由 scripts/build_en_skills.mjs 产出\n' +
  ' * 国际版（英文）卡面的技能数据 + 中文译文对照。\n' +
  ' * 简中版数据集尚未收录 EX / GX / V / MEGA 等形态卡，这些卡只能用国际版卡面，\n' +
  ' * 卡面文字为英文，故在此提供中文对照。译文缺失的条目回落显示英文原文。\n' +
  ' */\n';

const body = 'module.exports = ' + JSON.stringify({ T: T, Z: Z, N: N, ZN: ZN, E: E, C: C }) + ';\n';
fs.mkdirSync(ROOT + '/packageSkill', { recursive: true });
fs.writeFileSync(OUT, header + body, 'utf8');

const size = fs.statSync(OUT).size;
console.log('卡片:', Object.keys(C).length);
console.log('文本池:', T.length, '（已译', trans, '）');
console.log('名称池:', N.length, '（已译', transN, '）');
console.log('能量池:', E.length);
console.log('产出:', OUT, (size / 1024).toFixed(0) + 'KB');
console.log('翻译进度: 文本 ' + (trans / T.length * 100).toFixed(1) + '% | 名称 ' + (transN / N.length * 100).toFixed(1) + '%');
