#!/usr/bin/env node
/* ============================================================
   tools/skillhub-fetch.mjs —— 抓取 SkillHub 推荐快照
   抓 api.skillhub.cn 热门技能，按 slug 去重后生成
   src/js/77-skillhub-data.js（SKILLHUB_DAILY）。

   用法：node tools/skillhub-fetch.mjs [目标条数]
   为什么需要它：api.skillhub.cn 响应头没有 Access-Control-Allow-Origin，
   浏览器（file:// 与本页部署的云端沙箱）都会被 CORS 拦截 → 页面内无法实时
   拉取。所以只能在这里（Node，无跨域限制）抓取并烘焙进页面。
   零依赖，仅用 Node 内置 fetch。

   通常不用直接跑它 —— 双击 tools/sync-skills.cmd 会依次执行
   本脚本 + skills-sync.mjs + build.mjs。
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';

const TARGET = parseInt(process.argv[2] || '40', 10);   // 期望保留的条数
const PAGE_SIZE = 50;                                    // 每页请求条数
const MAX_PAGES = 4;                                     // 最多翻几页（避免无限翻）
const OUT_FILE = path.resolve(process.cwd(), 'src/js/77-skillhub-data.js');

const API = 'https://api.skillhub.cn/api/skills';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* 归一化 slug：去空白，用于去重键 */
function slugKey(s) {
  return String(s || '').trim().toLowerCase();
}

/* 把接口一条记录映射成快照结构（与页面 renderHub 消费的字段一致） */
function mapItem(s) {
  const ns = s.namespace || {};
  const handle = ns.handle || '';
  const owner = s.upstream_owner_login || s.ownerName || (handle ? String(handle).split('_').pop() : '');
  const subs = (s.subCategories || []).map((c) => (typeof c === 'string' ? c : (c && c.name) || '')).filter(Boolean);
  const slug = s.slug || '';
  return {
    name: s.name || '',
    slug,
    desc: s.description_zh || s.description || '',
    cat: s.category || '',
    subs,
    stars: parseInt(s.stars || 0, 10),
    downloads: parseInt(s.downloads || 0, 10),
    icon: s.iconUrl || '',
    verified: !!s.verified,
    version: s.version || '',
    link: 'https://skillhub.cn/skills/' + slug,
    owner,
    source: s.source || 'clawhub'
  };
}

/* 抓一页 */
async function fetchPage(page) {
  const url = API + '?page=' + page + '&pageSize=' + PAGE_SIZE + '&sortBy=downloads&order=desc';
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'WorkBuddy' } });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' @page ' + page);
  const j = await res.json();
  const arr = (j && j.data && j.data.skills) || [];
  return arr;
}

/* 按 slug 去重（保序，冲突保留 downloads 最大者）——与页面 hubDedupBySlug 语义一致 */
function dedupBySlug(list) {
  const seen = new Map();
  const out = [];
  for (const it of list) {
    const k = slugKey(it.slug) || ('\u0000name:' + (it.name || ''));
    if (!seen.has(k)) { seen.set(k, out.length); out.push(it); continue; }
    const at = seen.get(k);
    if ((it.downloads || 0) > (out[at].downloads || 0)) out[at] = it;
  }
  return out;
}

async function main() {
  const all = [];
  const seenPages = new Set();
  for (let page = 1; page <= MAX_PAGES; page++) {
    let arr;
    try {
      arr = await fetchPage(page);
    } catch (e) {
      console.error('[skillhub-fetch] 第 ' + page + ' 页抓取失败：' + e.message);
      break;
    }
    if (!arr.length) break;
    /* 防止接口忽略 page 参数导致重复抓同一页 */
    const sig = arr.slice(0, 3).map((x) => x.slug).join('|');
    if (seenPages.has(sig)) { console.error('[skillhub-fetch] 第 ' + page + ' 页与上一页重复，停止翻页'); break; }
    seenPages.add(sig);
    all.push(...arr.map(mapItem).filter((x) => x.desc && x.slug));
    console.log('[skillhub-fetch] page ' + page + '：+' + arr.length + '（累计 ' + all.length + '）');
    if (all.length >= TARGET * 2) break;              // 抓够富余量就停
    await sleep(600);                                  // 温和限流，避免 429
  }

  if (!all.length) {
    console.error('[skillhub-fetch] 没抓到任何数据，保留原快照不覆盖。');
    process.exit(1);
  }

  const items = dedupBySlug(all).slice(0, TARGET);
  const today = new Date().toISOString().slice(0, 10);

  const payload = {
    fetchedAt: today,
    source: 'api.skillhub.cn',
    note: '由 tools/skillhub-fetch.mjs 抓取 SkillHub 热门技能生成的内置快照（已按 slug 去重）。' +
      '浏览器无法直连 SkillHub（跨域限制），要更新请双击 tools/sync-skills.cmd。',
    items
  };

  const js = '/* ============================================================\n' +
    '   77-skillhub-data.js —— SkillHub 推荐快照\n' +
    '   本文件由 tools/skillhub-fetch.mjs 生成 —— 请勿手改。\n' +
    '   重建：双击 tools/sync-skills.cmd，或 node tools/skillhub-fetch.mjs && node build.mjs\n' +
    '   ============================================================ */\n' +
    'var SKILLHUB_DAILY = ' + JSON.stringify(payload, null, 2) + ';\n';

  fs.writeFileSync(OUT_FILE, js, 'utf8');

  const dupCount = all.length - dedupBySlug(all).length;
  console.log('[skillhub-fetch] 抓取 ' + all.length + ' 条 → 去重 ' + dupCount + ' 条 → 保留 ' + items.length + ' 条');
  console.log('[skillhub-fetch] fetchedAt: ' + today + ' -> ' + OUT_FILE);
}

main().catch((e) => { console.error('[skillhub-fetch] 失败：' + e.message); process.exit(1); });
