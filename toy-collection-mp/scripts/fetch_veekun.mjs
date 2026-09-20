// scripts/fetch_veekun.mjs —— 下载 veekun pokedex CSV（含身高/体重/特性/招式），并探查结构
import https from 'https';
import fs from 'fs';
import path from 'path';

const CACHE = 'D:/workBuddy_place/toy-collection-mp/scripts/cache';
fs.mkdirSync(CACHE, { recursive: true });

const BASE = 'https://raw.githubusercontent.com/veekun/pokedex/master/pokedex/data/csv/';
const FILES = [
  'pokemon.csv', 'pokemon_species.csv', 'pokemon_abilities.csv',
  'abilities.csv', 'ability_names.csv', 'pokemon_moves.csv',
  'moves.csv', 'move_names.csv'
];

function fetchCap(url, maxBytes) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (r) => {
      if (r.statusCode !== 200) { reject(new Error('HTTP ' + r.statusCode)); return; }
      let d = '';
      r.on('data', (c) => {
        d += c;
        if (maxBytes && d.length > maxBytes) { r.destroy(); resolve(d); }
      });
      r.on('end', () => resolve(d));
      r.on('aborted', () => resolve(d));
    });
    req.on('error', (e) => reject(e));
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('TIMEOUT')); });
  });
}

for (const f of FILES) {
  const isBig = f === 'pokemon_moves.csv';
  const max = isBig ? 4_000_000 : 0;
  try {
    const body = await fetchCap(BASE + f, max);
    fs.writeFileSync(path.join(CACHE, f), body);
    const lines = body.split('\n');
    console.log(`✓ ${f}  bytes=${body.length}  lines=${lines.length}`);
    console.log('   head:', lines[0].slice(0, 200));
    console.log('   row1:', (lines[1] || '').slice(0, 200));
  } catch (e) {
    console.log(`✗ ${f}  ERR ${e.message}`);
  }
}

// 检查 ability_names 的中文 language_id
try {
  const an = fs.readFileSync(path.join(CACHE, 'ability_names.csv'), 'utf8').split('\n');
  const sample = an.slice(1, 12).join('\n');
  console.log('\nability_names sample (找 language_id=中文):\n' + sample);
} catch (e) {}
