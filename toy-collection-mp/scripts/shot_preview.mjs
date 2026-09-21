// scripts/shot_preview.mjs —— 用本机 chromium 给预览页截图（渲染级验证）
// 用法：node scripts/shot_preview.mjs [预览页 file:// URL] [输出 PNG] [宽] [高] [等待 ms] [设备像素比]
//   不带参数时默认截取 toy-detail-preview.html
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/EDY/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright');

const EXE = 'C:/Users/EDY/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
const target = process.argv[2] || 'file:///D:/workBuddy_place/.tmp/toy-detail-preview.html';
const out = process.argv[3] || 'D:/workBuddy_place/.tmp/toy-detail-preview.png';
const W = Number(process.argv[4] || 1800);
const H = Number(process.argv[5] || 1200);
// 预览页含外链卡图时给足加载时间
const wait = Number(process.argv[6] || 18000);
// 设备像素比：细线条 / 小控件做近距离验证时传 2~3，避免缩放后看不清
const DPR = Number(process.argv[7] || 1);

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await page.goto(target, { waitUntil: 'load' });
await page.waitForTimeout(wait);
const imgStat = await page.evaluate(() => {
  const imgs = Array.from(document.querySelectorAll('img'));
  return {
    total: imgs.length,
    ok: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
    bad: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src.slice(-40))
  };
});
console.log('图片：共 ' + imgStat.total + ' | 成功 ' + imgStat.ok + ' | 失败 ' + imgStat.bad.length);
if (imgStat.bad.length) console.log('  失败列表:', imgStat.bad.slice(0, 8).join(' | '));
console.log('页面错误:', errs.length ? errs.slice(0, 5).join(' || ') : '无');
await page.screenshot({ path: out, fullPage: true });
console.log('SHOT ' + out);
await browser.close();
