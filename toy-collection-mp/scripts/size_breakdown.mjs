// scripts/size_breakdown.mjs —— 统计 data/pokemon.js 各字段体积
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const p = require('D:/workBuddy_place/toy-collection-mp/data/pokemon.js');
const keys = ['id', 'code', 'name', 'sub', 'types', 'rarity', 'sprite', 'art', 'cn', 'cvs', 'enArt', 'ef', 'et', 'ec', 'color', 'height_m', 'weight_kg', 'category', 'desc', 'weak', 'resist', 'abilities', 'base', 'moves'];
const sz = {};
const all = p.series.flatMap((s) => s.figures);
for (const f of all) {
  for (const k of keys) {
    if (f[k] === undefined) continue;
    const s = JSON.stringify(f[k]);
    sz[k] = (sz[k] || 0) + s.length;
  }
  // cn 内部细分
  if (f.cn) {
    ['n', 'no', 's', 'img', 'hp', 'a', 'r', 'atk', 'ft'].forEach((k) => {
      if (f.cn[k] === undefined) return;
      const kk = 'cn.' + k;
      sz[kk] = (sz[kk] || 0) + JSON.stringify(f.cn[k]).length;
    });
  }
}
const rows = Object.keys(sz).map((k) => ({ k, b: sz[k] })).sort((a, b) => b.b - a.b);
const total = rows.reduce((s, r) => s + r.b, 0);
console.log('字段体积（字节 / 占总计）');
rows.forEach((r) => console.log('  ' + r.k.padEnd(12) + String((r.b / 1024).toFixed(0) + 'KB').padStart(8) + '  ' + (r.b / total * 100).toFixed(1) + '%'));
console.log('  ' + 'TOTAL'.padEnd(12) + String((total / 1024).toFixed(0) + 'KB').padStart(8));
console.log('');
console.log('cnSets:', JSON.stringify(p.cnSets).length, 'B | series 元信息:', JSON.stringify(p.series.map((s) => ({ id: s.id, name: s.name, desc: s.desc }))).length, 'B');
console.log('文件实际:', (fs.statSync('D:/workBuddy_place/toy-collection-mp/data/pokemon.js').size / 1024).toFixed(0) + 'KB');
console.log('');
console.log('平均长度：desc', (all.reduce((s, f) => s + (f.desc || '').length, 0) / 649).toFixed(0),
  '| cn.atk[0].d', (all.reduce((s, f) => s + (f.cn && f.cn.atk[0] ? f.cn.atk[0].d.length : 0), 0) / 649).toFixed(0),
  '| cn.ft[0].d', (all.reduce((s, f) => s + (f.cn && f.cn.ft[0] ? f.cn.ft[0].d.length : 0), 0) / 649).toFixed(0),
  '| cvs', (all.reduce((s, f) => s + (f.cvs ? f.cvs.length : 0), 0) / 649).toFixed(1));
