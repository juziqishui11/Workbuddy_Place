/* ============================================================
   obs-uri-check.mjs —— obsidian://open?file= 解析回归校验
   ------------------------------------------------------------
   背景（2026-09-14 在 D:/Obsidian/resources/obsidian.asar 里实证）：
     Obsidian 的 `open` URI 处理器不直接按路径找文件，而是走内部链接解析
     MetadataCache.getFirstLinkpathDest(linkpath)：
       ① n = linkpath.toLowerCase()
       ② i = basename(n)                      // Al() = 取最后一段路径
       ③ if (i 含 '.') r = uniqueFileLookup.get(i)      // 索引按 file.name.toLowerCase() 建
       ④ if (!r) { n = (linkpath + '.md').toLowerCase(); i = basename(n); r = uniqueFileLookup.get(i) }
       ⑤ if (!r) → 弹「找不到文件」
       ⑥ if (i === n && r.length === 1) return r
          否则用 f.path.toLowerCase().endsWith(n) 过滤候选
     → 对 `xxx.pdf.md` 这类「包装笔记」，若把 .md 剥掉，basename 会撞上
       attachments/ 里的同名原件（Basename 相同、路径后缀不匹配）→ 解析失败。

   本脚本：读真实快照 src/js/84-obs-data.js，复刻上面的算法，对仓库里
   每一个文件断言「旧写法(剥 .md) / 新写法(保留 .md)」的解析结果。
   用法：node tools/obs-uri-check.mjs
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SNAP = path.join(ROOT, 'src/js/84-obs-data.js');

/* ---------- 1. 读快照 ---------- */
const text = fs.readFileSync(SNAP, 'utf8');
const at = text.indexOf('var OBS_SNAPSHOT = ');
if (at < 0) { console.error('快照格式变了：找不到 var OBS_SNAPSHOT = '); process.exit(1); }
const snap = JSON.parse(text.slice(at + 'var OBS_SNAPSHOT = '.length).replace(/;\s*$/, ''));

const files = [];
(function walk(ns) {
  ns.forEach(function (n) {
    if (n.kind === 'dir') walk(n.children || []);
    else files.push({ path: n.path, name: n.name });
  });
})(snap.tree);

/* ---------- 2. 复刻 Obsidian 索引 ---------- */
/* uniqueFileLookup：key = file.name.toLowerCase()（**带扩展名**）→ 候选数组 */
const uniqueFileLookup = new Map();
files.forEach(function (f) {
  const k = f.name.toLowerCase();
  if (!uniqueFileLookup.has(k)) uniqueFileLookup.set(k, []);
  uniqueFileLookup.get(k).push(f);
});

function basename(p) {           /* ≈ Obsidian 的 Al()：取最后一段路径 */
  const i = p.lastIndexOf('/');
  return i < 0 ? p : p.slice(i + 1);
}

function getFirstLinkpathDest(linkpath) {   /* ≈ MetadataCache.getFirstLinkpathDest */
  let n = String(linkpath).toLowerCase();
  let i = basename(n);
  let r = null;
  if (i.indexOf('.') >= 0) r = uniqueFileLookup.get(i) || null;
  if (!r) {
    n = (String(linkpath) + '.md').toLowerCase();
    i = basename(n);
    r = uniqueFileLookup.get(i) || null;
  }
  if (!r) return [];
  if (i === n && r.length === 1) return r.slice();
  return r.filter(function (f) { return f.path.toLowerCase().endsWith(n); });
}

/* ---------- 3. 复刻工作台的 URL 生成（obsOpenUrl） ---------- */
const VAULT = snap.vaultName || 'vault';
function obsOpenUrl(file) {
  let u = 'obsidian://open?vault=' + encodeURIComponent(VAULT);
  if (file) u += '&file=' + encodeURIComponent(file);
  return u;
}

/* ---------- 4. 逐个文件断言 ---------- */
let pass = 0;
const oldFails = [];        /* 旧写法（剥 .md）解析失败或解析到别的文件 */
const newFails = [];        /* 新写法失败 */
const samples = [];

files.forEach(function (f) {
  const oldLink = f.path.replace(/\.md$/i, '');
  const newLink = f.path;

  const oldRes = getFirstLinkpathDest(oldLink);
  const newRes = getFirstLinkpathDest(newLink);

  /* 旧写法：期望解析到「本体」才算好 */
  const oldOk = oldRes.length === 1 && oldRes[0].path === f.path;
  if (!oldOk) {
    oldFails.push({
      file: f.path,
      link: oldLink,
      got: oldRes.map(function (x) { return x.path; }),
      why: oldRes.length === 0 ? '找不到文件' : '解析到别的文件'
    });
  }

  /* 新写法：必须唯一命中本体 */
  const newOk = newRes.length === 1 && newRes[0].path === f.path;
  if (newOk) pass++;
  else {
    newFails.push({
      file: f.path,
      link: newLink,
      got: newRes.map(function (x) { return x.path; })
    });
  }

  if (/Datawhale/i.test(f.name) || /\.(pdf|xlsx|docx)\.md$/i.test(f.name)) {
    samples.push({ file: f.path, oldUrl: obsOpenUrl(oldLink), newUrl: obsOpenUrl(newLink),
      oldGot: oldRes.map(function (x) { return x.path; }), newGot: newRes.map(function (x) { return x.path; }) });
  }
});

/* ---------- 5. 报告 ---------- */
console.log('仓库      :', snap.vault);
console.log('文件总数  :', files.length);
console.log('索引条目  :', uniqueFileLookup.size);
console.log('');
console.log('★ 旧写法（剥掉 .md）失败：' + oldFails.length + ' 个');
oldFails.forEach(function (x) {
  console.log('   ✗ ' + x.file);
  console.log('       link=' + x.link + '  → ' + (x.got.length ? x.got.join(', ') : '(空)') + '   [' + x.why + ']');
});
console.log('');
console.log('★ 新写法（保留 .md）通过：' + pass + ' / ' + files.length);
if (newFails.length) {
  console.log('  失败明细：');
  newFails.forEach(function (x) {
    console.log('   ✗ ' + x.file + '  → ' + (x.got.length ? x.got.join(', ') : '(空)'));
  });
}
console.log('');
console.log('--- 抽样 URL（包装笔记 / Datawhale） ---');
samples.forEach(function (s) {
  console.log(s.file);
  console.log('  old: ' + s.oldUrl);
  console.log('       → ' + (s.oldGot.length ? s.oldGot.join(', ') : '(空 = 找不到文件)'));
  console.log('  new: ' + s.newUrl);
  console.log('       → ' + (s.newGot.length ? s.newGot.join(', ') : '(空 = 找不到文件)'));
});
console.log('');
if (!newFails.length) console.log('ALL PASS —— 每个文件的新写法都唯一解析到本体。');
else { console.log('FAILED —— 有 ' + newFails.length + ' 个文件新写法仍不通过。'); process.exit(1); }
