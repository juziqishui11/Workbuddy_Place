// scripts/analyze_chs.mjs —— 分析简体中文版 TCG 数据集结构与覆盖率
import fs from 'fs';

const CACHE = 'D:/workBuddy_place/.tmp/toy-collection-cache';
const j = JSON.parse(fs.readFileSync(CACHE + '/ptcg_chs_infos.json', 'utf8'));
const cols = j.collections;
console.log('collections:', cols.length);

let total = 0, withDex = 0, withAbility = 0, withImg = 0;
const byDex = {};
const sample = [];
const colSample = [];
for (const col of cols) {
  colSample.push(col.commodityCode + '=' + col.name);
  for (const c of (col.cards || [])) {
    total++;
    const d = c.details || {};
    if (d.pokedexCode) withDex++;
    if ((d.abilityItemList || []).length) withAbility++;
    if (c.image) {
      withImg++;
      if ((c.image || '').indexOf('img/') === 0) {
        const dexn = Number(d.pokedexCode);
        if (dexn >= 1 && dexn <= 649) {
          (byDex[dexn] = byDex[dexn] || []).push({
            col: col.name, colCode: col.commodityCode, seriesText: col.seriesText,
            name: c.name, cardName: d.cardName, collectionNumber: d.collectionNumber,
            rarityText: d.rarityText, hp: d.hp, attribute: d.attribute,
            nAtk: (d.abilityItemList || []).length, img: c.image
          });
        }
      }
    }
    if (sample.length < 2 && d.pokedexCode && (d.abilityItemList || []).length) sample.push({ card: c, details: d });
  }
}
console.log('卡牌总数:', total, '| 有图鉴号:', withDex, '| 有招式:', withAbility, '| 有图:', withImg);
console.log('collections 列表:', colSample.slice(0, 12).join(' | '));
console.log('');
console.log('=== details 字段 ===');
console.log(Object.keys(sample[0] ? sample[0].details : {}).join(', '));
console.log('=== 卡对象字段 ===');
console.log(Object.keys(sample[0] ? sample[0].card : {}).join(', '));
console.log('');
console.log('=== 样例 ===');
console.log(JSON.stringify(sample[0], null, 1).slice(0, 1800));
console.log('');
const cov = Object.keys(byDex).map(Number).filter((n) => n >= 1 && n <= 649);
console.log('=== 1-649 覆盖 ===');
console.log('有中文卡的宝可梦:', cov.length, '/649');
const miss = [];
for (let i = 1; i <= 649; i++) if (!byDex[i]) miss.push(i);
console.log('缺失:', miss.length, miss.slice(0, 40).join(','));
let multi = 0;
cov.forEach((d) => { if (byDex[d].length > 1) multi++; });
console.log('有多张中文卡的:', multi, '| 平均', (cov.reduce((s, d) => s + byDex[d].length, 0) / cov.length).toFixed(1), '张');
