/* 1024 码上好运 — 自检脚本：node check.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let fails = 0, warns = 0;
const ok = (c, m) => { if (c) console.log('  PASS  ' + m); else { fails++; console.log('  FAIL  ' + m); } };
const warn = (c, m) => { if (!c) { warns++; console.log('  WARN  ' + m); } };

// 1) 载入 data.js
const sandbox = { window: {}, console };
sandbox.window.APP = {};
sandbox.APP = sandbox.window.APP; // 源码里 APP 是全局引用
sandbox.self = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(read('js/data.js'), sandbox);
const D = sandbox.window.APP.DATA;

console.log('\n[1] 数据完整性');
ok(D.QUIZ.length === 10, '题库 10 题（当前 ' + D.QUIZ.length + '）');
ok(Object.keys(D.TYPES).length === 16, '16 种人格类型（当前 ' + Object.keys(D.TYPES).length + '）');
ok(D.RULES.length >= 30, '规则库 ≥30 条（当前 ' + D.RULES.length + '）');
ok(D.BLESS.length >= 60, '祝福语 ≥60 条（当前 ' + D.BLESS.length + '）');
ok(D.GOODTHINGS.length === 12, '好事池 12 条（当前 ' + D.GOODTHINGS.length + '）');
ok(D.CERTS.length === 4, '证书 4 种（当前 ' + D.CERTS.length + '）');

// 1b) 本轮新增的数据层：奖金折算 / 愿望池 / 时光机样例 / 翻译规则
console.log('\n[1b] 新增数据层');
const noCoin = D.GOODTHINGS.filter((g) => typeof g.coin !== 'number' || g.coin <= 0);
ok(noCoin.length === 0, '好事池每条都有正向 coin（好事才折算奖金）'
  + (noCoin.length ? '（缺：' + noCoin.map((g) => g.id).join(',') + '）' : ''));
const coinSum = D.GOODTHINGS.reduce((a, g) => a + (g.coin || 0), 0);
ok(coinSum > 0, '满贯奖金池可累加（合计 ¥' + coinSum + '）');
ok(D.WISH_POOL.length >= 30, '愿望池 ≥30 条（当前 ' + D.WISH_POOL.length + '）');
const tooLong = D.WISH_POOL.filter((s) => typeof s !== 'string' || s.length > 24);
ok(tooLong.length === 0, '愿望池每条 ≤24 字，能塞进一张卡'
  + (tooLong.length ? '（超长：' + tooLong.slice(0, 3).join(' / ') + '）' : ''));
ok(D.SAMPLES.length >= 5, '时光机样例 ≥5 段（当前 ' + D.SAMPLES.length + '）');
const sampBad = D.SAMPLES.filter((s) => !s.id || !s.year || !s.code || s.code.length < 40);
ok(sampBad.length === 0, '每段样例字段齐备（id/年份/标题/代码）'
  + (sampBad.length ? '（缺：' + sampBad.map((s) => s.id).join(',') + '）' : ''));
const sampYears = D.SAMPLES.map((s) => s.year);
ok(new Set(sampYears).size === sampYears.length && Math.max.apply(null, sampYears) - Math.min.apply(null, sampYears) >= 8,
  '样例年份不重复且跨度 ≥8 年（' + Math.min.apply(null, sampYears) + '–' + Math.max.apply(null, sampYears) + '）');
ok(D.TRANSLATIONS.length >= 20, '翻译规则 ≥20 条（当前 ' + D.TRANSLATIONS.length + '）');
const trBad = D.TRANSLATIONS.filter((t) => !t.id || !t.term || !Array.isArray(t.match) || !t.match.length
  || !(t.level >= 1 && t.level <= 5) || !t.real || !t.load || !t.risk || !t.pit);
ok(trBad.length === 0, '每条规则四栏齐备且 level ∈ 1–5'
  + (trBad.length ? '（问题：' + trBad.map((t) => t.id).join(',') + '）' : ''));
ok(new Set(D.TRANSLATIONS.map((t) => t.id)).size === D.TRANSLATIONS.length, '翻译规则 id 唯一');

// 2) 编号空间：16 型 × 64 = 1024
console.log('\n[2] 编号空间穷举');
const bucket = {};
for (let n = 0; n < 1024; n++) {
  const b = n.toString(2).padStart(10, '0');
  const code = '' + b[0] + b[2] + b[4] + b[6];
  bucket[code] = (bucket[code] || 0) + 1;
}
const codes = Object.keys(bucket);
ok(codes.length === 16, '可覆盖 16 种类型码（当前 ' + codes.length + '）');
const bad = codes.filter((c) => bucket[c] !== 64);
ok(bad.length === 0, '每种类型恰好 64 个编号' + (bad.length ? '（异常：' + bad.join(',') + '）' : ''));
const sum = codes.reduce((a, c) => a + bucket[c], 0);
ok(sum === 1024, '总数 1024（当前 ' + sum + '）');
ok(codes.every((c) => D.TYPES[c]), '每个类型码都有对应文案');

// 3) 平票规则自洽：每维固定极性下 2 种组合
console.log('\n[3] 平票规则自洽');
const dims = [
  { b: [0, 1], pilot: 0 }, { b: [2, 3], pilot: 2 }, { b: [4, 5], pilot: 4 }, { b: [6, 7], pilot: 6 }
];
let dimOK = true;
dims.forEach((d, i) => {
  const sets = { 0: 0, 1: 0 };
  for (const x of [0, 1]) for (const y of [0, 1]) {
    const s = x + y;
    const lv = s === 0 ? 0 : s === 2 ? 1 : x; // 定调题 = 该维第一题
    sets[lv]++;
  }
  if (sets[0] !== 2 || sets[1] !== 2) dimOK = false;
  console.log('    维' + (i + 1) + '：低=' + sets[0] + ' 高=' + sets[1] + '（应各为 2）');
});
ok(dimOK, '四个维度高低各 2 种组合 → 2^4 = 16 型');

// 4) 禁用词
console.log('\n[4] 合规禁用词扫描');
const files = ['index.html', 'js/data.js', 'js/core.js', 'js/export.js',
  'js/scene-profile.js', 'js/scene-board.js', 'js/scene-cert.js', 'js/scene-time.js', 'js/scene-wish.js',
  'js/scene-translate.js',
  'css/tokens.css', 'css/base.css', 'css/scenes.css'];
const allow = new Set(['js/data.js']); // data.js 的 BANNED 常量本身含词
let hitFiles = [];
files.forEach((f) => {
  if (!fs.existsSync(path.join(ROOT, f))) return;
  const txt = read(f);
  // data.js 里跳过整个 BANNED 数组字面量（含跨行与紧邻注释）
  const lines = txt.split('\n').map((ln, i) => ({ ln, i }));
  const found = [];
  let inBanned = false;
  lines.forEach((o) => {
    if (f === 'js/data.js') {
      if (!inBanned && o.ln.indexOf('const BANNED') !== -1) { inBanned = true; return; }
      if (inBanned) {
        if (o.ln.indexOf('];') !== -1) inBanned = false;
        return;
      }
      // 紧贴在 BANNED 上方的注释行也跳过（它常引用这些词解释为什么禁用）
      if (o.ln.trim().startsWith('//') && /禁用词|红线/.test(o.ln)) return;
    }
    D.BANNED.forEach((w) => { if (o.ln.indexOf(w) !== -1) found.push(w + '@L' + (o.i + 1)); });
  });
  if (found.length) hitFiles.push(f + ': ' + found.join(','));
});
ok(hitFiles.length === 0, '全部源文件无禁用词' + (hitFiles.length ? '\n        ' + hitFiles.join('\n        ') : ''));

// 5) CSS 大括号平衡（按段统计）
console.log('\n[5] CSS 括号平衡');
['css/tokens.css', 'css/base.css', 'css/scenes.css'].forEach((f) => {
  const t = read(f);
  const o = (t.match(/{/g) || []).length, c = (t.match(/}/g) || []).length;
  ok(o === c, f + ' 大括号 ' + o + '/' + c);
});

// 6) id 引用 vs DOM 定义
console.log('\n[6] DOM 引用检查');
const html = read('index.html');
const htmlIds = new Set([...html.matchAll(/id="([\w-]+)"/g)].map((m) => m[1]));
const jsAll = files.filter((f) => f.endsWith('.js')).map((f) => read(f)).join('\n');
const refs = new Set();
[...jsAll.matchAll(/\$\('#([\w-]+)'\)/g)].forEach((m) => refs.add(m[1]));
[...jsAll.matchAll(/getElementById\('([\w-]+)'\)/g)].forEach((m) => refs.add(m[1]));
// JS 里动态生成的 id
const dynIds = new Set([...jsAll.matchAll(/id="([\w-]+)"/g)].map((m) => m[1]));
const missing = [...refs].filter((r) => !htmlIds.has(r) && !dynIds.has(r));
ok(missing.length === 0, '所有 $(\'#id\') 都有对应节点' + (missing.length ? '（缺：' + missing.join(',') + '）' : ''));

// 6b) 场景注册六处一致性（新增面板最容易漏的就是这里）
console.log('\n[6b] 场景注册一致性');
const coreSrc0 = read('js/core.js');
const sceneList = (coreSrc0.match(/const SCENES = \[([^\]]+)\]/) || [, ''])[1]
  .split(',').map((s) => s.trim().replace(/['"\s]/g, '')).filter(Boolean);
ok(sceneList.length === 6, 'core.js 注册 6 个场景（当前 ' + sceneList.length + '：' + sceneList.join(',') + '）');
const panelIds = [...html.matchAll(/<section[^>]*id="panel-([\w-]+)"/g)].map((m) => m[1]);
ok(panelIds.length === 6, 'index.html 有 6 个 .panel（当前 ' + panelIds.length + '）');
ok(panelIds.join(',') === sceneList.join(','), 'DOM 面板顺序与 SCENES 一致（' + panelIds.join(',') + '）');
const noBody = sceneList.filter((s) => html.indexOf('id="body-' + s + '"') === -1);
ok(noBody.length === 0, '每个场景都有 body 容器' + (noBody.length ? '（缺：' + noBody.join(',') + '）' : ''));
const noScript = sceneList.filter((s) => s !== 'cert'
  ? html.indexOf('js/scene-' + s + '.js') === -1 : false);
ok(noScript.length === 0, '每个场景脚本都引了' + (noScript.length ? '（缺：' + noScript.join(',') + '）' : ''));
const noReg = sceneList.filter((s) => {
  const src = fs.existsSync(path.join(ROOT, 'js/scene-' + s + '.js')) ? read('js/scene-' + s + '.js') : '';
  return src.indexOf('APP.scenes.' + s) === -1;
});
ok(noReg.length === 0, '每个脚本都注册了 APP.scenes.*' + (noReg.length ? '（缺：' + noReg.join(',') + '）' : ''));
ok(html.indexOf("ORDER = ['" + sceneList.join("', '") + "']") !== -1,
  '面板切换器 ORDER 与 SCENES 同序');
// 旧的放大按钮已移除，别再被残留样式/标记带回来
const expandLeft = files.filter((f) => fs.existsSync(path.join(ROOT, f)) && read(f).indexOf('panel__expand') !== -1);
ok(expandLeft.length === 0, '全项目无 panel__expand 残留' + (expandLeft.length ? '（仍有：' + expandLeft.join(',') + '）' : ''));

// 7) 规则库：命中与耗时
console.log('\n[7] 规则库行为');
const SAMPLE = [
  'var self = this;', 'var list = [];', '$.ajax({', "  success: function (data) {",
  '    for (var i = 0; i < data.length; i++) {', '      if (data[i].status == 1) {',
  "        var html = '<li>' + data[i].name + '</li>';",
  "        document.getElementsByClassName('box')[0].innerHTML += html;",
  '      }', '    }', '    var t = new Date().getTime();', '  }', '});'
].join('\n');
let hit = 0;
const t0 = Date.now();
D.RULES.forEach((r) => {
  const re = new RegExp(r.test.source, r.test.flags.replace('g', ''));
  let n = 0;
  SAMPLE.split('\n').forEach((ln) => { re.lastIndex = 0; if (re.test(ln)) n++; });
  if (n) hit++;
});
const dt = Date.now() - t0;
ok(hit >= 8, '2012 年老代码命中 ≥8 条规则（当前 ' + hit + '）');
ok(dt < 50, '规则检测耗时 ' + dt + 'ms < 50ms');

// 大输入不再爆炸（每个正则单独测 10KB）
const big = SAMPLE.repeat(60);
let maxMs = 0;
D.RULES.forEach((r) => {
  const re = new RegExp(r.test.source, r.test.flags.replace('g', ''));
  const s = Date.now();
  big.split('\n').forEach((ln) => { re.lastIndex = 0; re.test(ln); });
  maxMs = Math.max(maxMs, Date.now() - s);
});
ok(maxMs < 200, '10KB 输入最慢单条规则 ' + maxMs + 'ms < 200ms（无灾难回溯）');
ok(new Set(D.RULES.map((r) => r.id)).size === D.RULES.length, '规则 id 唯一');

// 8) 封神原型与形象资源
console.log('\n[8] 封神原型与形象资源');
const typeCodes = Object.keys(D.TYPES).sort();
const heroCodes = Object.keys(D.HEROES).sort();
ok(heroCodes.length === 16, '封神原型 16 条（当前 ' + heroCodes.length + '）');
ok(heroCodes.join() === typeCodes.join(), 'HEROES 与 TYPES 键 1:1 对应');
const heroBad = heroCodes.filter((c) => {
  const h = D.HEROES[c];
  return !h || !h.name || !h.talisman || !h.line || !Array.isArray(h.palette) || h.palette.length !== 2;
});
ok(heroBad.length === 0, '每条原型字段齐备（名号/法宝/一句话/主色）'
  + (heroBad.length ? '（缺：' + heroBad.join(',') + '）' : ''));

const AV = path.join(ROOT, 'assets/avatar');
const noFile = typeCodes.filter((c) => !fs.existsSync(path.join(AV, c + '.webp')));
ok(noFile.length === 0, '16 张形象图齐备（assets/avatar/{类型码}.webp）'
  + (noFile.length ? '（缺：' + noFile.join(',') + '）' : ''));
let avTotal = 0; const oversize = [], empty = [];
typeCodes.forEach((c) => {
  const p = path.join(AV, c + '.webp');
  if (!fs.existsSync(p)) return;
  const kb = fs.statSync(p).size / 1024;
  avTotal += kb;
  if (kb > 80) oversize.push(c + '=' + kb.toFixed(0) + 'KB');
  if (kb < 4) empty.push(c);
});
ok(oversize.length === 0, '单张形象 ≤80KB' + (oversize.length ? '（超：' + oversize.join(',') + '）' : ''));
ok(empty.length === 0, '没有疑似损坏的空图' + (empty.length ? '（过小：' + empty.join(',') + '）' : ''));
const strayFiles = fs.readdirSync(AV).filter((f) => f.endsWith('.webp') && !typeCodes.includes(f.replace('.webp', '')));
ok(strayFiles.length === 0, '没有多余的形象文件' + (strayFiles.length ? '（多余：' + strayFiles.join(',') + '）' : ''));
console.log('    形象合计 ' + avTotal.toFixed(1) + ' KB');

// 形象路径必须与 assets.js 里的拼法一致
const assetsSrc = read('js/assets.js');
ok(assetsSrc.indexOf("'assets/avatar/' + code + '.webp'") !== -1,
  'assets.js 的路径拼法与文件命名一致');

// 9) 文件规模
console.log('\n[9] 文件规模');
let total = 0;
files.forEach((f) => {
  if (!fs.existsSync(path.join(ROOT, f))) return;
  const kb = (fs.statSync(path.join(ROOT, f)).size / 1024).toFixed(1);
  total += Number(kb);
});
console.log('    源码合计 ' + total.toFixed(1) + ' KB');
ok(total < 400, '源码体积 < 400KB');

// 10) 状态机落盘约束（历史上这里出过「一打开就跳结果页」的坑）
console.log('\n[10] 状态机与存档');
const coreSrc = read('js/core.js');
ok(/k !== 'stage'/.test(coreSrc), '写盘快照剔除 stage（UI 态永不落盘）');
ok(coreSrc.indexOf('delete state.showResult') !== -1, '旧存档里的 showResult 影子字段会被清理');
const profSrc = read('js/scene-profile.js');
const openAt = profSrc.indexOf('onOpen()');
const openBody = openAt === -1 ? '' : profSrc.slice(openAt, openAt + 800);
ok(openAt !== -1, '人设面板有 onOpen 钩子');
ok(openBody.indexOf('U.compute()') === -1,
  'onOpen 不再用 compute() 判定是否跳结果页（改按已答数决定 intro/quiz）');
ok(openBody.indexOf('U.setStage(') !== -1, 'onOpen 会显式设置阶段');

console.log('\n' + (fails ? '✗ ' + fails + ' 项失败' : '✓ 全部通过') + (warns ? ' · ' + warns + ' 项警告' : ''));
process.exit(fails ? 1 : 0);
