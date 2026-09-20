// scripts/shot_preview.mjs —— 用本机 chromium 给预览页截图（渲染级验证）
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/EDY/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright');

const EXE = 'C:/Users/EDY/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
const target = 'file:///D:/workBuddy_place/.tmp/toy-detail-preview.html';
const out = 'D:/workBuddy_place/.tmp/toy-detail-preview.png';

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await page.goto(target, { waitUntil: 'load' });
// 等图片加载（外链卡图较慢，给足时间）
await page.waitForTimeout(18000);
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
