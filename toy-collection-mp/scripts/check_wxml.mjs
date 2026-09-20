// scripts/check_wxml.mjs —— WXML 静态体检
// 覆盖三类问题：
//   ① 标签配平（view / text / scroll-view / block / image）
//   ② wx:for 与 wx:key 是否成对
//   ③ 【开发者工具「问题」面板误报】内联样式里出现「插值紧跟 %」
//      例如 style="width:{{percent}}%" —— 开发者工具的 CSS 校验器会把 {{...}} 当占位符，
//      后面再粘一个 % 就成了非法值，报 semi-colon expected / identifier expected / { expected。
//      正确做法：在 JS 里把百分比算成字符串（"65%"），WXML 只写 style="width:{{barW}}"。
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const R = path.dirname(fileURLToPath(import.meta.url)) + '/../';
const PAGES = ['index', 'dex', 'detail', 'gacha', 'add', 'settings'];

const TAGS = ['view', 'text', 'scroll-view', 'block', 'image', 'button', 'input', 'picker', 'swiper', 'swiper-item', 'navigator', 'form', 'label', 'radio', 'checkbox'];

let bad = 0;
const problems = [];

for (const p of PAGES) {
  const f = 'pages/' + p + '/' + p + '.wxml';
  const file = R + f;
  if (!fs.existsSync(file)) { console.log(f.padEnd(26), 'MISSING'); bad++; continue; }
  const s = fs.readFileSync(file, 'utf8');
  const lines = s.split('\n');
  const out = [];

  // ① 标签配平
  for (const t of TAGS) {
    const re = new RegExp('<' + t + '(?=[\\s>/])', 'g');
    const reClose = new RegExp('</' + t + '>', 'g');
    const open = (s.match(re) || []).length;
    const close = (s.match(reClose) || []).length;
    const selfClosed = (s.match(new RegExp('<' + t + '[^>]*?/>', 'g')) || []).length;
    if (open - selfClosed !== close) {
      out.push('TAG ' + t + ' open=' + (open - selfClosed) + ' close=' + close);
      problems.push(f + ' 标签不配平: <' + t + '>');
      bad++;
    }
  }

  // ② wx:for / wx:key
  const nFor = (s.match(/wx:for=/g) || []).length;
  const nKey = (s.match(/wx:key=/g) || []).length;
  if (nFor !== nKey) {
    out.push('WXFOR=' + nFor + ' WXKEY=' + nKey);
    problems.push(f + ' wx:for(' + nFor + ') 与 wx:key(' + nKey + ') 不匹配');
    bad++;
  }

  // ③ 内联样式：插值紧跟 %
  lines.forEach((l, i) => {
    const noComment = l.replace(/<!--[\s\S]*?-->/g, '');
    // 找出所有 style="..." 里的内容
    const re = /style="([^"]*)"/g;
    let m;
    while ((m = re.exec(noComment))) {
      const v = m[1];
      if (/\}\}\s*%/.test(v) || /\}\}\s*(rpx|px|vh|vw)/.test(v)) {
        const unit = /\}\}\s*(%)/.test(v) ? '%' : 'rpx/px 等单位';
        out.push('STYLE-UNIT ' + unit);
        problems.push(f + ':' + (i + 1) + ' 内联样式插值紧跟单位（' + unit + '）→ 开发者工具 CSS 校验会误报：style="' + v + '"');
        bad++;
      }
    }
  });

  console.log(f.padEnd(26), out.length ? out.join(' | ') : 'OK');
}

if (problems.length) {
  console.log('\n=== 问题清单 ===');
  problems.forEach((p) => console.log('  ✗ ' + p));
  console.log('\n提示：把 width:{{x}}% 改成 JS 预算的 width:{{barW}}（barW = x + "%"）。');
}

// ---- 规则自测：确认「插值紧跟单位」这条规则真的能抓到（防规则退化成空检查）----
const STYLE_RE = /style="([^"]*)"/g;
function styleUnitHits(s) {
  let n = 0, m;
  const re = new RegExp(STYLE_RE.source, 'g');
  while ((m = re.exec(s))) if (/\}\}\s*(%|rpx|px|vh|vw)/.test(m[1])) n++;
  return n;
}
const CASES = [
  ['<view style="width:{{percent}}%;background:#fff"></view>', 1, '旧 dex.wxml:6'],
  ['<view style="width:{{figure.base[item] / 2}}%;background:{{figure.typeColor}}"></view>', 1, '旧 detail.wxml:90'],
  ['<view style="width:{{barW}}"></view>', 0, '新写法（应为 0）'],
  ['<view style="--accent:{{accent}};--accent2:{{accent2}}"></view>', 0, 'CSS 变量写法（应为 0）'],
  ['<text style="color:#fff;background:{{figure.typeColor}}">x</text>', 0, '普通插值收尾（应为 0）']
];
let st = 0;
CASES.forEach((c) => {
  const got = styleUnitHits(c[0]);
  const ok = got === c[1];
  if (!ok) st++;
  console.log('  自测 ' + (ok ? 'PASS' : 'FAIL') + ' [' + c[2] + '] 命中=' + got + ' 期望=' + c[1]);
});
console.log(st ? '\nSELFTEST FAILED: ' + st : '自测通过（规则有效）');

console.log(bad ? '\nHAS WXML PROBLEMS: ' + bad : '\nALL WXML OK');
