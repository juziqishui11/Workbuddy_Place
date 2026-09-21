// scripts/make_gacha_preview.mjs —— 用真实数据 + 真实 gacha.wxss 渲染「开包结果页」离线预览
// 目的：渲染级验证「第 1 张卡是卡面而不是卡背（蓝色块）」
// 用法：node scripts/make_gacha_preview.mjs
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const R = 'D:/workBuddy_place/toy-collection-mp/';
const OUT = 'D:/workBuddy_place/.tmp/toy-gacha-result-preview.html';

// ---- wx 桩 ----
global.wx = {
  getStorageSync: () => null, setStorageSync: () => {},
  setNavigationBarTitle: () => {}, setNavigationBarColor: () => {},
  showToast: () => {}, showModal: () => {}, navigateTo: () => {},
  redirectTo: () => {}, navigateBack: () => {}, previewImage: () => {}
};
let captured = null;
global.Page = (cfg) => { captured = cfg; };
require(R + 'pages/gacha/gacha.js');
const g = Object.assign({}, captured);
g.data = JSON.parse(JSON.stringify(captured.data || {}));
g.setData = function (o) { Object.assign(this.data, o); };
g.onShow();
g.setData({ active: 'all' });
const cards = g.draw(5).map((p) => g.lightUp(p));
console.log('抽到：' + cards.map((c) => c.name + (c.form ? '(' + c.form + ')' : '')).join(' / '));

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---- rpx → px（750rpx 视口宽 = 375px）----
let css = fs.readFileSync(R + 'pages/gacha/gacha.wxss', 'utf8');
css = css.replace(/(\d*\.?\d+)rpx/g, (_, n) => (Number(n) / 2) + 'px');
// 预览不做滚动裁剪，全部展开
css += `
html,body{margin:0;padding:0;background:#F6F8FC;}
.wx-page{width:375px;margin:0 auto;background:#F6F8FC;}
.fly-scroll{max-height:none;overflow:visible;}
.secttl{font:700 13px/1.6 -apple-system,"PingFang SC",sans-serif;color:#5B6472;padding:16px 14px 6px;}
.backrow{margin-bottom:8px;}
`;

const litCard = (c, cls) => `
      <div class="fly-card in ${c.glow ? 'glow' : ''} ${c.premium ? 'premium' : ''}">
        <div class="fly-back" style="opacity:0;transform:scale(.85);">
          <div class="back-pattern"></div><div class="back-ball"></div>
        </div>
        <div class="fly-front ${c.glow ? 'glow' : ''} ${c.premium ? 'premium' : ''}" style="opacity:1;transform:scale(1);">
          <div class="front-gleam"></div>
          <div class="fly-img"><img src="${esc(c.img)}" style="width:100%;height:100%;object-fit:contain;"></div>
          <div class="fly-info">
            <div class="fly-row">
              <div class="fly-name">${esc(c.name)}</div>
              ${c.form ? `<div class="fly-form" style="background:${c.color}">${esc(c.form)}</div>` : ''}
            </div>
            <div class="fly-row2">
              <span class="tag" style="color:${c.rarityColor};background:${c.rarityBg}">${esc(c.rarityLabel)}</span>
              <span class="fly-code">No.${esc(c.code)}</span>
              ${c.isNew ? '<div class="fly-new">NEW</div>' : ''}
            </div>
          </div>
        </div>
      </div>`;

const backCard = `
      <div class="fly-card in">
        <div class="fly-back" style="opacity:1;">
          <div class="back-pattern"></div><div class="back-ball"></div>
        </div>
        <div class="fly-front" style="opacity:0;transform:scale(.85);"></div>
      </div>`;

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>开包结果页预览</title><style>${css}</style></head>
<body><div class="wx-page">
  <div class="page" style="--accent:#3B7DDD;--accent2:#FFCB05">

    <div class="secttl">▼ 开局（翻牌前的卡背，仅一瞬间）</div>
    <div class="stage fly-stage" style="padding-top:0;min-height:0;">
      <div class="fly-scroll"><div class="fly-list">${backCard}</div></div>
    </div>

    <div class="secttl">▼ 翻牌后（state = done，5 张全部应为卡面）</div>
    <div class="stage fly-stage" style="padding-top:0;min-height:0;">
      <div class="fly-scroll"><div class="fly-list">${cards.map((c) => litCard(c)).join('')}</div></div>
      <div class="fly-foot">
        <div class="new-tip">本次新获得 ${cards.filter((c) => c.isNew).length} 张！</div>
        <div class="btn primary">再开一包</div>
      </div>
    </div>

  </div>
</div></body></html>`;

fs.mkdirSync('D:/workBuddy_place/.tmp', { recursive: true });
fs.writeFileSync(OUT, html);
console.log('HTML ' + OUT + '  (' + Math.round(html.length / 1024) + 'KB)');
