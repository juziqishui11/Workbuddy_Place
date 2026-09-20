// 抓取 42arch/pokemon-dataset-zh 的逐只中文数据，提取中文图鉴描述 / 分类 / 弱点抵抗
// 走 gh-proxy.com 镜像（raw 直连不稳，jsdelivr 对大文件 ECONNRESET）
import fs from 'fs';
import path from 'path';
import https from 'https';

const CACHE = 'D:/workBuddy_place/.tmp/toy-collection-cache';
const REPO = '42arch/pokemon-dataset-zh';
const BRANCH = 'main';
const MIRROR = (u) => 'https://gh-proxy.com/' + u;

function fetch(url, timeout = 30000) {
  return new Promise((res) => {
    const t = setTimeout(() => res(null), timeout);
    let d = '';
    https
      .get(url, { headers: { 'User-Agent': 'node' } }, (r) => {
        if (r.statusCode !== 200) { r.destroy(); clearTimeout(t); res(null); return; }
        r.on('data', (c) => (d += c));
        r.on('end', () => { clearTimeout(t); res(d); });
      })
      .on('error', () => { clearTimeout(t); res(null); });
  });
}

const API = (p) => `https://api.github.com/repos/${REPO}/contents/${p}?ref=${BRANCH}`;
const RAW = (p) => `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${p}`;

const enc = (p) =>
  p.split('/').map((s) => encodeURIComponent(s)).join('/');

// 并发池
async function pool(items, worker, limit = 8) {
  const out = [];
  let i = 0;
  const runners = Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return out;
}

(async () => {
  // ---- 1. 取 data/pokemon 目录下的真实文件名 ----
  console.log('列出 data/pokemon 目录 ...');
  const listing = await fetch(API('data/pokemon'), 60000);
  if (!listing) { console.log('目录列举失败'); return; }
  let entries;
  try { entries = JSON.parse(listing); } catch (e) { console.log('parse err'); return; }
  const files = entries.filter((e) => e.type === 'file' && e.name.endsWith('.json'));
  console.log('目录文件数:', files.length);

  // index(4位) -> 文件名（同 index 取第一个）
  const byIdx = {};
  for (const f of files) {
    const m = f.name.match(/^(\d{4})-/);
    if (!m) continue;
    const idx = Number(m[1]);
    if (idx >= 1 && idx <= 649 && !byIdx[idx]) byIdx[idx] = f.name;
  }
  const idxList = Object.keys(byIdx).map(Number).sort((a, b) => a - b);
  console.log('1-649 命中文件:', idxList.length, '/649');
  const missingIdx = [];
  for (let i = 1; i <= 649; i++) if (!byIdx[i]) missingIdx.push(i);
  if (missingIdx.length) console.log('  缺文件 index:', missingIdx.slice(0, 40).join(','));

  // ---- 2. 逐只下载并提取 ----
  let done = 0, fail = 0;
  const results = {};
  await pool(idxList, async (idx) => {
    const name = byIdx[idx];
    const rel = 'data/pokemon/' + name;
    let d = await fetch(MIRROR(RAW(rel)));
    if (!d) d = await fetch(MIRROR(RAW(enc(rel))));
    if (!d || d[0] !== '{') { fail++; return; }
    let j;
    try { j = JSON.parse(d); } catch (e) { fail++; return; }

    const form = (j.forms && j.forms[0]) || {};
    // 图鉴介绍：优先第一世代第一条，否则任意第一条
    let flavor = '';
    const pe = j.pokedex_entries || [];
    const gen1 = pe.find((g) => /第一世代/.test(g.name || ''));
    const pickFrom = (g) => {
      const vs = (g && g.versions) || [];
      const v = vs.find((x) => x.text) || vs[0];
      return v && v.text ? v.text : '';
    };
    if (gen1) flavor = pickFrom(gen1);
    if (!flavor) { for (const g of pe) { flavor = pickFrom(g); if (flavor) break; } }

    const desc = flavor || j.description || '';
    const category = form.category || '';
    // 弱点 / 抵抗
    const te = (j.type_effectiveness && j.type_effectiveness[0] && j.type_effectiveness[0].data) || [];
    const weak = te.filter((x) => Number(x.damage) > 1).map((x) => x.type);
    const resist = te.filter((x) => Number(x.damage) > 0 && Number(x.damage) < 1).map((x) => x.type);

    results[idx] = { name: j.name_zh, desc, category, weak, resist };
    done++;
    if (done % 50 === 0) console.log('  进度', done, '/', idxList.length);
  }, 8);

  console.log('下载成功:', done, '失败:', fail);
  fs.writeFileSync(path.join(CACHE, 'desc_zh.json'), JSON.stringify(results));
  const got = Object.keys(results).length;
  console.log('=== desc_zh.json 覆盖:', got, '/649');
  const miss = [];
  for (let i = 1; i <= 649; i++) if (!results[i]) miss.push(i);
  console.log('缺失', miss.length, miss.slice(0, 40).join(','));
  [1, 4, 25, 150, 152, 255, 386, 494, 649].forEach((i) => {
    const r = results[i];
    if (!r) { console.log('  #' + i, '<none>'); return; }
    console.log('  #' + i, r.name, '|', r.category, '| 弱', (r.weak || []).join('/'), '| 抗', (r.resist || []).join('/'));
    console.log('       ', (r.desc || '').slice(0, 70));
  });
})();
