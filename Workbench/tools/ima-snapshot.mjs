/* ============================================================
   ima-snapshot.mjs —— 把 IMA 原始结构整理成页面快照
   ------------------------------------------------------------
   输入：tools/ima-raw.json   （由 AI 助手通过 ima-mcp 采集后写入）
   输出：src/js/83-ima-data.js（勿手改，由本脚本生成）

   为什么要有中间这一步：
     node 脚本没有任何 MCP 访问能力，拉不到 IMA 数据；能拉的只有 AI 助手。
     所以链路是：AI 采集 → 写 ima-raw.json → 本脚本整理成快照 → build。
   用法：node tools/ima-snapshot.mjs [--dry]
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const RAW = path.join(HERE, 'ima-raw.json');
const OUT = path.join(ROOT, 'src/js/83-ima-data.js');
const DRY = process.argv.indexOf('--dry') >= 0;

function sizeText(b) {
  const n = parseInt(b, 10) || 0;
  if (n <= 0) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}
function trim(s, n) {
  let t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  if (t.length > n) t = t.slice(0, n) + '…';
  return t;
}

if (!fs.existsSync(RAW)) {
  console.error('[错误] 找不到 ' + RAW + '，保持原有快照不变。');
  process.exit(1);
}
let raw;
try { raw = JSON.parse(fs.readFileSync(RAW, 'utf8')); }
catch (e) { console.error('[错误] ima-raw.json 不是合法 JSON：' + e.message); process.exit(1); }

/* folderId → items 索引（按 kbId + folderId 定位，避免跨库撞 ID） */
const idx = {};
(raw.listings || []).forEach(function (L) {
  idx[L.kbId + '|' + (L.folderId || '')] = L.items || [];
});

/* 递归构建节点树 */
function build(kbId, folderId, depth) {
  const items = idx[kbId + '|' + (folderId || '')] || [];
  const folders = [], files = [];
  items.forEach(function (it) {
    if (!it) return;
    const isFolder = it.media_type === 99 || !!it.folder_id;
    if (isFolder) {
      const fid = it.folder_id || it.media_id;
      const kids = depth < 8 ? build(kbId, fid, depth + 1) : [];
      folders.push({
        kind: 'folder',
        id: fid,
        name: it.title || '未命名文件夹',
        type: '文件夹',
        updated: it.time_wording || '',
        count: kids.length,
        children: kids
      });
    } else {
      files.push({
        kind: 'file',
        id: it.media_id || '',
        name: it.title || '未命名文件',
        type: it.media_type_name || '文件',
        size: parseInt(it.file_size, 10) || 0,
        sizeText: sizeText(it.file_size),
        updated: it.time_wording || '',
        fetchable: !!it.can_fetch_content,
        preview: !!it.can_preview,
        intro: trim(it.intro, 320),
        webUrl: it.web_url || it.url || ''   /* 网页直链（下次 AI 采集带上的话，点文件可直接跳浏览器精确位置） */
      });
    }
  });
  /* 文件夹在前、文件在后，各自按名称排序 */
  folders.sort(function (a, b) { return a.name.localeCompare(b.name, 'zh'); });
  files.sort(function (a, b) { return a.name.localeCompare(b.name, 'zh'); });
  return folders.concat(files);
}

function countFiles(nodes) {
  let n = 0;
  nodes.forEach(function (x) { n += x.kind === 'folder' ? countFiles(x.children || []) : 1; });
  return n;
}
function countFolders(nodes) {
  let n = 0;
  nodes.forEach(function (x) { if (x.kind === 'folder') { n += 1 + countFolders(x.children || []); } });
  return n;
}

const kbs = (raw.kbs || []).map(function (k) {
  const tree = build(k.id, '', 0);
  return {
    id: k.id,
    name: k.name,
    note: k.note || '',
    url: k.url || '',   /* 知识库网页直链（若有） */
    files: countFiles(tree),
    folders: countFolders(tree),
    tree: tree
  };
});

const data = {
  fetchedAt: raw.fetchedAt || '',
  source: raw.source || 'ima-mcp',
  kbs: kbs
};
const grand = kbs.reduce(function (s, k) { return s + k.files; }, 0);

if (DRY) {
  console.log('[dry] 采集时间:', data.fetchedAt);
  kbs.forEach(function (k) {
    console.log('  ' + k.name + '  文件 ' + k.files + ' · 文件夹 ' + k.folders);
    (function walk(ns, pre) {
      ns.forEach(function (n) {
        console.log(pre + (n.kind === 'folder' ? '📁 ' : '📄 ') + n.name + (n.kind === 'folder' ? '  (' + n.count + ')' : '  ' + n.sizeText));
        if (n.kind === 'folder') walk(n.children, pre + '   ');
      });
    })(k.tree, '    ');
  });
  console.log('合计文件:', grand);
  process.exit(0);
}

const header =
  '/* ============================================================\n' +
  '   83-ima-data.js —— IMA 知识库结构快照（自动生成，勿手改）\n' +
  '   ------------------------------------------------------------\n' +
  '   由 tools/ima-snapshot.mjs 从 tools/ima-raw.json 生成。\n' +
  '   原始数据由 AI 助手通过 ima-mcp 采集（node 脚本调不了 MCP）。\n' +
  '   刷新方式：让 AI「同步 IMA 快照」→ 重写 ima-raw.json → 跑本脚本 → build\n' +
  '   字段：kind=folder|file / id=media_id / fetchable=能否取正文 / intro=摘要\n' +
  '   ============================================================ */\n\n';

fs.writeFileSync(OUT, header + 'var IMA_SNAPSHOT = ' + JSON.stringify(data) + ';\n', 'utf8');

console.log('采集时间:', data.fetchedAt);
kbs.forEach(function (k) {
  console.log('  ' + k.name + '  → 文件 ' + k.files + ' · 文件夹 ' + k.folders);
});
console.log('合计文件:', grand);
console.log('已写入:', path.relative(ROOT, OUT).replace(/\\/g, '/'));
