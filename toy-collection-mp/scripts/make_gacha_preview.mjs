// scripts/make_gacha_preview.mjs —— 用真实数据 + 真实 gacha.wxss 渲染「开包」离线预览
// 覆盖：① 6 种卡包皮肤 ② 撕口三帧（一条线 + 左右滑动引导点）③ 卡背 ④ done 态 2:3 竖卡
// 用法：node scripts/make_gacha_preview.mjs   （可加 #skin / #pack / #cards 只渲染某段）
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
const skins = g.data.skins;
const cards = g.draw(5).map((p) => g.lightUp(p));
console.log('皮肤 ' + skins.length + ' 种：' + skins.map((s) => s.name).join('/'));
console.log('抽到：' + cards.map((c) => c.name + (c.form ? '(' + c.form + ')' : '')).join(' / '));

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ART = (dex) => 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' + dex + '.png';

// ---- rpx → px（750rpx 视口宽 = 375px）----
let css = fs.readFileSync(R + 'pages/gacha/gacha.wxss', 'utf8');
css = css.replace(/(\d*\.?\d+)rpx/g, (_, n) => (Number(n) / 2) + 'px');
css += `
html,body{margin:0;padding:0;background:#F6F8FC;}
.wx-page{width:375px;margin:0 auto;background:#F6F8FC;padding-bottom:24px;box-sizing:border-box;}
.fly-scroll{max-height:none;overflow:visible;}
.secttl{font:700 13px/1.6 -apple-system,"PingFang SC",sans-serif;color:#5B6472;padding:16px 14px 6px;}
.packgrid{display:flex;flex-wrap:wrap;justify-content:center;gap:14px 22px;padding:6px 8px 0;}
.packcell{display:flex;flex-direction:column;align-items:center;}
.packcap{font:600 11px/1.5 -apple-system,"PingFang SC",sans-serif;color:#8A93A6;text-align:center;margin-top:6px;}
.pack-art img{width:100%;height:100%;object-fit:contain;}
.fly-img img{width:100%;height:100%;object-fit:contain;}
.skinbar-demo{display:flex;align-items:center;justify-content:center;margin-top:12px;}
.only-skin .sec-pack,.only-skin .sec-cards{display:none;}
.only-pack .sec-skin,.only-pack .sec-cards{display:none;}
.only-cards .sec-skin,.only-cards .sec-pack{display:none;}
`;

// ---------- 卡包（可选皮肤 / 撕口状态） ----------
const packBody = (sk, sealStyle, tearing) => `
    <div class="pack-body" style="--c1:${sk.c1};--c2:${sk.c2};">
      <div class="pack-tex"></div>
      <div class="pack-dots"></div>
      <div class="pack-inner" style="opacity:.2"></div>
      <div class="pack-halo"></div>
      <div class="pack-art"><img src="${ART(sk.dex)}"></div>
      <div class="pack-foot">
        <div class="pack-brand">Pokémon TCG</div>
        <div class="pack-name">全图鉴卡包</div>
        <div class="pack-count">${esc(sk.name)} · 5 张 / 包</div>
      </div>
      <div class="pack-seal ${tearing ? 'tearing' : ''}" style="${sealStyle}">
        <div class="seal-line"></div>
        <div class="seal-knob" style="${tearing ? 'animation:none;opacity:0;' : ''}">→</div>
      </div>
    </div>`;

const packCell = (sk, label, sealStyle, tearing) => `
  <div class="packcell">
    ${packBody(sk, sealStyle || '', !!tearing)}
    <div class="packcap">${label}</div>
  </div>`;

// ---------- 卡背 ----------
const backCard = `
  <div class="fly-card in">
    <div class="fly-back" style="opacity:1;">
      <div class="back-pattern"></div>
      <div class="back-frame"></div>
      <div class="back-ball">
        <div class="bb-top"></div><div class="bb-band"></div><div class="bb-btn"></div>
      </div>
    </div>
  </div>`;

// ---------- done 态卡面 ----------
const litCard = (c) => `
  <div class="fly-card in ${c.glow ? 'glow' : ''} ${c.premium ? 'premium' : ''}">
    <div class="fly-back" style="opacity:0;transform:scale(.85);">
      <div class="back-pattern"></div><div class="back-frame"></div>
      <div class="back-ball"><div class="bb-top"></div><div class="bb-band"></div><div class="bb-btn"></div></div>
    </div>
    <div class="fly-front ${c.glow ? 'glow' : ''} ${c.premium ? 'premium' : ''}" style="opacity:1;transform:scale(1);">
      <div class="front-gleam"></div>
      <div class="fly-img"><img src="${esc(c.img)}"></div>
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

const skinDots = skins.map((s, i) =>
  `<div class="skin-dot ${i === 0 ? 'on' : ''}" style="background:linear-gradient(140deg,${s.c1},${s.c2})"></div>`).join('');

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>开包预览</title><style>${css}</style>
<script>
var _h = location.hash.replace('#', '');
if (_h) document.documentElement.classList.add('only-' + _h);
</script>
</head>
<body><div class="wx-page">
  <div class="page" style="--accent:#3B7DDD;--accent2:#FFCB05">

    <div class="sec-skin">
      <div class="secttl">▼ 卡包外观：6 种皮肤可切换（含封面立绘 / 锡箔纹 / 网点 / 光晕）</div>
      <div class="packgrid">
        ${skins.map((s) => packCell(s, s.name + ' · ' + s.tag + '系')).join('')}
      </div>
      <div class="skinbar-demo">
        ${skinDots}
      </div>
    </div>

    <div class="sec-pack">
      <div class="secttl">▼ 撕口：一条易撕线 + 沿线左右滑动的引导点</div>
      <div class="packgrid">
        ${packCell(skins[0], '引导态：滑块沿线左右滑动')}
        ${packCell(skins[0], '撕到一半（向右滑出）', 'transform:translate(105px,-6px);opacity:.6;', true)}
        ${packCell(skins[0], '撕满（抽离出界）', 'transform:translate(225px,-8px);opacity:0;', true)}
      </div>
      <div class="secttl">▼ 卡背（翻牌前，2:3 竖版）</div>
      <div class="stage fly-stage" style="padding-top:0;min-height:0;">
        <div class="fly-scroll"><div class="fly-list">${backCard}</div></div>
      </div>
    </div>

    <div class="sec-cards">
      <div class="secttl">▼ 翻牌后（state = done，全为卡面）</div>
      <div class="stage fly-stage" style="padding-top:0;min-height:0;">
        <div class="fly-scroll"><div class="fly-list">${cards.map(litCard).join('')}</div></div>
        <div class="fly-foot">
          <div class="new-tip">本次新获得 ${cards.filter((c) => c.isNew).length} 张！</div>
          <div class="btn primary">再开一包</div>
        </div>
      </div>
    </div>

  </div>
</div></body></html>`;

fs.mkdirSync('D:/workBuddy_place/.tmp', { recursive: true });
fs.writeFileSync(OUT, html);
console.log('HTML ' + OUT + '  (' + Math.round(html.length / 1024) + 'KB)');
