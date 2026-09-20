// scripts/fetch_veekun.mjs —— 下载图鉴数据源到本地缓存
//   ① fanzeyi/pokemon.json  pokedex.json（中文名 + 属性 + 种族值，覆盖 809 只）
//   ② veekun pokedex CSV（身高/体重/特性/招式）
// 缓存目录在项目外（D:/workBuddy_place/.tmp/toy-collection-cache），不进上传包与仓库。
import https from 'https';
import fs from 'fs';
import path from 'path';

const CACHE = 'D:/workBuddy_place/.tmp/toy-collection-cache';
fs.mkdirSync(CACHE, { recursive: true });

const VEEKUN = 'https://raw.githubusercontent.com/veekun/pokedex/master/pokedex/data/csv/';
const FANZEYI = 'https://raw.githubusercontent.com/fanzeyi/pokemon.json/master/pokedex.json';

const JOBS = [
  { name: 'pokedex_raw.json', url: FANZEYI },
  { name: 'pokemon.csv', url: VEEKUN + 'pokemon.csv' },
  { name: 'pokemon_species.csv', url: VEEKUN + 'pokemon_species.csv' },
  { name: 'pokemon_abilities.csv', url: VEEKUN + 'pokemon_abilities.csv' },
  { name: 'abilities.csv', url: VEEKUN + 'abilities.csv' },
  { name: 'ability_names.csv', url: VEEKUN + 'ability_names.csv' },
  { name: 'moves.csv', url: VEEKUN + 'moves.csv' },
  { name: 'move_names.csv', url: VEEKUN + 'move_names.csv' },
  { name: 'pokemon_moves.csv', url: VEEKUN + 'pokemon_moves.csv' } // 全量约 8MB，不截断
];

function get(url, retry = 5) {
  return new Promise((res) => {
    let tries = 0;
    function attempt() {
      tries++;
      const t = setTimeout(() => { if (tries < retry) attempt(); else { console.log('TIMEOUT', url.slice(-40)); res(null); } }, 60000);
      let d = '';
      https.get(url, (r) => {
        r.on('data', (c) => (d += c));
        r.on('end', () => { clearTimeout(t); res(d && d.length > 10 ? d : null); });
      }).on('error', () => { clearTimeout(t); if (tries < retry) attempt(); else res(null); });
    }
    attempt();
  });
}

for (const j of JOBS) {
  const body = await get(j.url);
  if (body) {
    fs.writeFileSync(path.join(CACHE, j.name), body);
    console.log('OK', j.name, (body.length / 1024).toFixed(0) + 'KB');
  } else {
    console.log('FAIL', j.name);
  }
}
console.log('DONE — 数据已就绪，可运行 build_data.mjs');
