/* ============================================================
   obsidian-scan.mjs —— 扫描本地 Obsidian 仓库，生成目录/文件树快照
   ------------------------------------------------------------
   产出：src/js/84-obs-data.js   （勿手改，由本脚本生成）
   用法：node tools/obsidian-scan.mjs [仓库路径]
        默认仓库：D:/workBuddy_place/Obsidian_Place

   额外产出（本期新增）：
     · 每个 .md / .canvas 文件节点带 links:[已解析的目标笔记相对路径]
     · 顶层 graph:{ nodes:[{path,name,dir}], edges:[[from,to],...] }
       关联来自笔记里的 [[双链]]（与 Obsidian 图谱同机制）
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const VAULT = process.argv[2] || 'D:/workBuddy_place/Obsidian_Place';
const OUT = path.join(ROOT, 'src/js/84-obs-data.js');
const SKIP = new Set(['.obsidian', '.trash', '.git', 'node_modules', '.space']);

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function stamp(ms) {
  const d = new Date(ms);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

/* 递归数文件数（不含目录） */
function countFiles(nodes) {
  let n = 0;
  nodes.forEach(function (x) {
    if (x.kind === 'file') n += 1;
    else n += countFiles(x.children || []);
  });
  return n;
}

/* 读取笔记正文，提取 [[...]] / ![[...]] 里的链接目标（未解析） */
function readRawLinks(p) {
  try {
    const txt = fs.readFileSync(p, 'utf8');
    const out = [];
    const re = /\[\[([^\]]+)\]\]/g;
    let m;
    while ((m = re.exec(txt))) {
      let t = m[1].trim();
      /* 去掉别名 |、标题 #、块 ^  */
      t = t.split('|')[0].split('#')[0].split('^')[0].trim();
      if (t) out.push(t);
    }
    return out;
  } catch (e) { return []; }
}

/* 递归扫描 */
function scan(abs, rel) {
  const out = [];
  let names = [];
  try { names = fs.readdirSync(abs); } catch (e) { return out; }
  names.sort(function (a, b) { return a.localeCompare(b, 'zh'); });
  names.forEach(function (n) {
    if (SKIP.has(n)) return;
    if (n.charAt(0) === '.') return;
    const p = path.join(abs, n);
    const r = rel ? rel + '/' + n : n;
    let st;
    try { st = fs.statSync(p); } catch (e) { return; }
    if (st.isDirectory()) {
      const kids = scan(p, r);
      out.push({ kind: 'dir', name: n, path: r, count: countFiles(kids), mtime: stamp(st.mtimeMs), children: kids });
    } else {
      const ext = path.extname(n).slice(1).toLowerCase();
      const node = { kind: 'file', name: n, path: r, ext: ext, size: st.size, mtime: stamp(st.mtimeMs) };
      if (ext === 'md' || ext === 'canvas') node.rawLinks = readRawLinks(p);
      out.push(node);
    }
  });
  return out;
}

if (!fs.existsSync(VAULT)) {
  console.error('[错误] 找不到仓库：' + VAULT);
  process.exit(1);
}

const tree = scan(VAULT, '');
const total = countFiles(tree);
const vaultName = VAULT.replace(/[\\/]+$/, '').split(/[\\/]/).pop();
const scannedAt = stamp(Date.now());

/* 建「笔记名（去扩展）→ 路径」索引，用于解析双链 */
const byBase = {};
const byPath = {};
(function walk(ns) {
  ns.forEach(function (n) {
    if (n.kind === 'dir') walk(n.children || []);
    else {
      byPath[n.path] = n;
      const base = n.name.replace(/\.(md|canvas)$/i, '');
      (byBase[base] = byBase[base] || []).push(n.path);
    }
  });
})(tree);

/* 解析一条双链目标 → 目标文件的相对路径（解析不到返回 null）
   坑：IMA 的包装笔记 `xxx.pdf.md` 与附件 `xxx.pdf` 去扩展名后同名，byBase 里会互相撞名。
   若直接取 arr[0] 常常取到「自己」→ 被调用处的 r!==self 丢掉 → 这些笔记全成孤立节点。
   所以这里优先取「文件名与 target 完全一致」的候选（[[a.pdf]] 就该连 a.pdf 而非 a.pdf.md），
   其次取「不是自己」的候选；与 Obsidian 内部 linkpath 解析的优先级一致。 */
function resolveLink(target, self) {
  if (!target) return null;
  if (target.indexOf('/') >= 0) {
    let cand = target;
    if (!/\.(md|canvas)$/i.test(cand)) cand += '.md';
    return byPath[cand] ? cand : null;
  }
  const arr = byBase[target] || [];
  if (!arr.length) return null;
  const seg = function (p) { return p.split('/').pop(); };
  const exact = arr.filter(function (p) { return seg(p) === target && p !== self; });
  if (exact.length) return exact[0];
  const other = arr.filter(function (p) { return p !== self; });
  if (other.length) return other[0];
  return arr[0];
}

/* 解析每个笔记的 rawLinks → links（只连已存在的笔记，去自环/去重） */
(function walk(ns) {
  ns.forEach(function (n) {
    if (n.kind === 'dir') { walk(n.children || []); return; }
    if (!n.rawLinks) return;
    const self = n.path;
    const seen = {};
    const links = [];
    n.rawLinks.forEach(function (t) {
      const r = resolveLink(t, self);
      if (r && r !== self && !seen[r]) { seen[r] = 1; links.push(r); }
    });
    delete n.rawLinks;
    if (links.length) n.links = links;
  });
})(tree);

/* 生成图谱：节点 = 仓库里所有文件
     · note=true  → .md / .canvas 笔记（页面画成实心圆）
     · note=false → 附件 / 原件（页面画成小空心圆；IMA 的包装 md 会 [[链接]] 到它们）
   边 = 笔记里 [[双链]] 解析成功的目标（可能是笔记，也可能是附件）
   dir = 顶层目录名（根目录下的文件统一记为「（根目录）」） */
const NOTE_RE = /\.(md|canvas)$/i;
const gNodes = [];
const gEdgeSet = {};
(function walk(ns) {
  ns.forEach(function (n) {
    if (n.kind === 'dir') { walk(n.children || []); return; }
    gNodes.push({
      path: n.path,
      name: n.name,
      dir: n.path.indexOf('/') >= 0 ? n.path.split('/')[0] : '（根目录）',
      note: NOTE_RE.test(n.name)
    });
    (n.links || []).forEach(function (t) {
      const key = n.path < t ? n.path + '|' + t : t + '|' + n.path;
      gEdgeSet[key] = [n.path, t];
    });
  });
})(tree);
const gPathSet = {};
gNodes.forEach(function (n) { gPathSet[n.path] = 1; });
const gEdges = Object.keys(gEdgeSet).map(function (k) { return gEdgeSet[k]; })
  .filter(function (e) { return gPathSet[e[0]] && gPathSet[e[1]]; });

const data = {
  scannedAt: scannedAt,
  vault: VAULT.replace(/\\/g, '/'),
  vaultName: vaultName,
  total: total,
  tree: tree,
  graph: { nodes: gNodes, edges: gEdges }
};

const header =
  '/* ============================================================\n' +
  '   84-obs-data.js —— Obsidian 仓库目录快照（自动生成，勿手改）\n' +
  '   ------------------------------------------------------------\n' +
  '   由 tools/obsidian-scan.mjs 扫描 ' + data.vault + ' 生成。\n' +
  '   刷新方式：双击 tools/sync-skills.cmd，或 node tools/obsidian-scan.mjs\n' +
  '   字段：kind=dir|file / path=仓库内相对路径 / count=目录下文件数 / mtime=修改时间\n' +
  '        md/canvas 节点带 links=[已解析目标相对路径]；顶层 graph={nodes,edges} 为知识图谱\n' +
  '   ============================================================ */\n\n';

fs.writeFileSync(OUT, header + 'var OBS_SNAPSHOT = ' + JSON.stringify(data) + ';\n', 'utf8');

console.log('仓库  :', VAULT);
console.log('仓库名:', vaultName);
console.log('文件数:', total);
console.log('顶层  :', tree.map(function (x) { return x.name + (x.kind === 'dir' ? '/' + x.count : ''); }).join('  '));
const noteCnt = gNodes.filter(function (n) { return n.note; }).length;
console.log('图谱  :', gNodes.length + ' 个节点（' + noteCnt + ' 笔记 / ' + (gNodes.length - noteCnt) + ' 附件） / ' + gEdges.length + ' 条边');
console.log('已写入:', path.relative(ROOT, OUT).replace(/\\/g, '/'));
