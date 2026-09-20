// 抓取中文图鉴描述（flavor text）
// 源：PokeAPI 仓库 CSV（首选，覆盖全代） + veekun CSV（兜底）
import fs from 'fs';
import path from 'path';
import https from 'https';

const CACHE = 'D:/workBuddy_place/.tmp/toy-collection-cache';

function download(url, name, retry = 5) {
  return new Promise((res) => {
    let tries = 0;
    const attempt = () => {
      tries++;
      const t = setTimeout(() => {
        console.log('TIMEOUT', name, 'try' + tries);
        tries < retry ? attempt() : res(false);
      }, 40000);
      let d = '';
      https
        .get(url, (r) => {
          r.on('data', (c) => (d += c));
          r.on('end', () => {
            clearTimeout(t);
            if (d.length < 50) {
              tries < retry ? attempt() : res(false);
              return;
            }
            fs.mkdirSync(CACHE, { recursive: true });
            fs.writeFileSync(path.join(CACHE, name), d);
            console.log('OK', name, (d.length / 1024).toFixed(0) + 'KB');
            res(true);
          });
        })
        .on('error', (e) => {
          clearTimeout(t);
          console.log('ERR', name, e.code);
          tries < retry ? attempt() : res(false);
        });
    };
    attempt();
  });
}

// 引号感知的完整 CSV 解析（支持字段内嵌换行 / 逗号 / 双引号转义）
function parseCSV(text) {
  const rows = [];
  let row = [];
  let f = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { f += '"'; i++; }
        else q = false;
      } else f += c;
    } else {
      if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
      else if (c === '\r') { /* skip */ }
      else f += c;
    }
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

function clean(s) {
  return String(s || '')
    .replace(/\u000c/g, ' ')   // 换页符
    .replace(/\s+/g, '')
    .trim();
}

const SOURCES = [
  {
    name: 'flavor_text.csv',
    url: 'https://raw.githubusercontent.com/veekun/pokedex/master/pokedex/data/csv/pokemon_species_flavor_text.csv',
    zh: new Set(['12', '11']), // 12=zh-Hans 11=zh-Hant
    pick: (p) => ({ sid: Number(p[0]), lang: p[2], text: p[3] })
  },
  {
    name: 'pokeapi_flavor.csv',
    url: 'https://cdn.jsdelivr.net/gh/PokeAPI/pokeapi@master/data/v2/csv/pokemon_species_flavor_text.csv',
    zh: new Set(['12', 'zh-Hans', '11', 'zh-Hant', 'zh']),
    // 列：species_id, version_id, language_id, flavor_text（language_id 多为数字：12=zh-Hans 11=zh-Hant）
    pick: (p) => ({ sid: Number(p[0]), lang: p[2], text: p[3] })
  }
];

(async () => {
  const zhHans = {}; // 简体优先
  const zhHant = {}; // 繁体兜底
  for (const src of SOURCES) {
    const file = path.join(CACHE, src.name);
    if (!fs.existsSync(file)) {
      await download(src.url, src.name);
    }
    if (!fs.existsSync(file)) { console.log('skip', src.name); continue; }
    const rows = parseCSV(fs.readFileSync(file, 'utf8'));
    const head = rows[0];
    console.log(src.name, 'rows=', rows.length, 'header=', head.join('|'));
    for (let i = 1; i < rows.length; i++) {
      const p = rows[i];
      if (!p || p.length < 4) continue;
      const { sid, lang, text } = src.pick(p);
      if (!src.zh.has(lang)) continue;
      if (!(sid >= 1 && sid <= 649)) continue;
      const t = clean(text);
      if (!t) continue;
      const bucket = (lang === '12' || lang === 'zh-Hans') ? zhHans : zhHant;
      if (!bucket[sid] || t.length > bucket[sid].length) bucket[sid] = t;
    }
    console.log('  -> zh-Hans:', Object.keys(zhHans).length, ' zh-Hant:', Object.keys(zhHant).length);
  }

  const merged = {};
  for (let i = 1; i <= 649; i++) {
    merged[i] = zhHans[i] || zhHant[i] || '';
  }

  const out = {};
  for (let i = 1; i <= 649; i++) if (merged[i]) out[i] = merged[i];
  fs.writeFileSync(path.join(CACHE, 'desc_zh.json'), JSON.stringify(out, null, 0));
  const missing = [];
  for (let i = 1; i <= 649; i++) if (!merged[i]) missing.push(i);
  console.log('=== 中文描述最终覆盖:', Object.keys(out).length, '/649');
  console.log('缺失', missing.length, missing.slice(0, 40).join(','));
  [1, 4, 25, 150, 152, 255, 386, 494, 649].forEach((i) =>
    console.log('  #' + i, (merged[i] || '<none>').slice(0, 70))
  );
})();
