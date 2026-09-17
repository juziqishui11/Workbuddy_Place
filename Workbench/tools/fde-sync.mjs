/* ============================================================
   fde-sync.mjs —— 把「90 天 FDE 学习计划」页面同步进工作台
   ------------------------------------------------------------
   同步源（默认）：
     D:/workBuddy_place/ai_agent_study/agent-90days/fde-90day-plan.html
   产物：
     src/js/71-fde-data.js   （FDE_SRC + FDE_DATA，纯数据，离线可用）

   用法：
     node tools/fde-sync.mjs                    # 用默认路径
     node tools/fde-sync.mjs <另一个 html 路径>   # 指定源文件
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DEFAULT_SRC = 'D:/workBuddy_place/ai_agent_study/agent-90days/fde-90day-plan.html';
const srcPath = path.resolve(process.argv[2] || DEFAULT_SRC);
const outPath = path.join(ROOT, 'src', 'js', '71-fde-data.js');

if (!fs.existsSync(srcPath)) {
  console.error('[fde-sync] 源文件不存在：' + srcPath);
  process.exit(1);
}

const raw = fs.readFileSync(srcPath, 'utf8');
const md5 = crypto.createHash('md5').update(raw, 'utf8').digest('hex');

/* ---- 1. 取出包含 DATA.phases 的那个 script 块 ---- */
const scripts = [...raw.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const dataScript = scripts.find(s => /DATA\.phases\s*=/.test(s) && /DATA\.weeks/.test(s));
if (!dataScript) {
  console.error('[fde-sync] 在源文件里没找到 DATA 数据块，页面结构可能变了。');
  process.exit(2);
}

/* ---- 2. 在隔离作用域里执行，取回结构化数据 ---- */
const FACTORY = `
  var DATA = { phases: [], weeks: [], exercises: [], glossary: [], checklist: [] };
  ${dataScript}
  return DATA;
`;
let DATA;
try {
  DATA = new Function(FACTORY)();
} catch (e) {
  console.error('[fde-sync] 解析 DATA 失败：' + e.message);
  process.exit(3);
}

/* ---- 3. 基本完整性校验 ---- */
const weeks = DATA.weeks || [];
const days = weeks.reduce((n, w) => n + ((w.days || []).length), 0);
if (!weeks.length || days < 80) {
  console.error(`[fde-sync] 数据不完整：weeks=${weeks.length} days=${days}（预期 12 周 / 90 天）`);
  process.exit(4);
}

/* ---- 4. 页面标题 ---- */
const title = (raw.match(/<title>([^<]*)<\/title>/) || [, '90 天 FDE 学习计划'])[1].trim();

/* ---- 5. 写出数据文件 ---- */
const payload = {
  path: srcPath.replace(/\\/g, '/'),
  md5,
  bytes: Buffer.byteLength(raw, 'utf8'),
  title,
  syncedAt: new Date().toISOString(),
  weeks: weeks.length,
  days,
  exercises: (DATA.exercises || []).length,
  glossary: (DATA.glossary || []).length
};

const header = `/* ============================================================
   71-fde-data.js —— 「90 天 FDE 学习计划」离线数据快照
   ⚠ 本文件由 tools/fde-sync.mjs 自动生成，请勿手工编辑。
      源文件：${payload.path}
      md5   ：${payload.md5}
      同步于：${payload.syncedAt}
      规模  ：${payload.weeks} 周 / ${payload.days} 天 / ${payload.exercises} 练习题 / ${payload.glossary} 概念词
   重新同步：node tools/fde-sync.mjs
   ============================================================ */
var FDE_SRC = ${JSON.stringify(payload, null, 2)};

var FDE_DATA = ${JSON.stringify({
  phases: DATA.phases || [],
  weeks: weeks,
  exercises: DATA.exercises || [],
  glossary: DATA.glossary || [],
  checklist: DATA.checklist || []
}).replace(/<\/(script)/gi, '<\\/$1')};
`;

fs.writeFileSync(outPath, header, 'utf8');
console.log(`[fde-sync] 已同步 → ${path.relative(ROOT, outPath).replace(/\\/g, '/')}`);
console.log(`[fde-sync] 源 ${payload.bytes} bytes · md5 ${md5.slice(0, 12)}… · ${payload.weeks} 周 / ${payload.days} 天 / ${payload.exercises} 练习 / ${payload.glossary} 词条`);
console.log(`[fde-sync] 产物 ${(Buffer.byteLength(header, 'utf8') / 1024).toFixed(1)} KB`);
