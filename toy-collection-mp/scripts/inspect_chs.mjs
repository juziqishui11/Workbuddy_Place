// scripts/inspect_chs.mjs —— 查看 CHS 字典表 + 招式/特性字段细节
import fs from 'fs';
const CACHE = 'D:/workBuddy_place/.tmp/toy-collection-cache';
const j = JSON.parse(fs.readFileSync(CACHE + '/ptcg_chs_infos.json', 'utf8'));
console.log('dict 分类:', Object.keys(j.dict).join(', '));
for (const k of Object.keys(j.dict)) {
  if (/attribute|energy|weak|type/i.test(k)) {
    console.log('--- ' + k + ' ---');
    j.dict[k].forEach((x) => console.log('   ' + x.dictCode + ' = ' + x.dictValue));
  }
}

// 找喷火龙（dex 6）的中文卡，看完整字段
const found = [];
for (const col of j.collections) {
  for (const c of (col.cards || [])) {
    const d = c.details || {};
    if (String(d.pokedexCode) === '0006' && found.length < 3) {
      found.push({ col: col.name, c: c, d: d });
    }
  }
}
console.log('');
console.log('=== 喷火龙中文卡样例 ===');
found.forEach((f, i) => {
  console.log('[' + i + '] 系列=' + f.col + ' | 卡名=' + f.d.cardName + ' | 卡号=' + f.d.collectionNumber + ' | HP=' + f.d.hp + ' | 属性=' + f.d.attribute + ' | 稀有=' + f.d.rarityText + ' | 图=' + f.c.image);
  console.log('   特性(cardFeatureItemList):', JSON.stringify(f.d.cardFeatureItemList || []));
  console.log('   招式(abilityItemList):', JSON.stringify(f.d.abilityItemList || []));
  console.log('   evolveText=' + f.d.evolveText + ' | 分类=' + f.d.pokemonCategory + ' | 弱点=' + f.d.weaknessType + f.d.weaknessFormula);
  console.log('   进化自/instruction:', Object.keys(f.d).filter((k) => /evolve|evol/i.test(k)).map((k) => k + '=' + f.d[k]).join(', '));
});
