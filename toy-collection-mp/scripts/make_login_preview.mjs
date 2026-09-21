// scripts/make_login_preview.mjs —— 用真实 WXSS 渲染「微信登录 / 我的」离线预览
// 覆盖：① 登录第一步 ② 登录第二步（头像昵称填写）③ 我的页（已登录）④ 我的页（未登录）
// 用法：node scripts/make_login_preview.mjs   （可加 #login1 / #login2 / #mine / #mine0 只看某段）
import fs from 'fs';

const R = 'D:/workBuddy_place/toy-collection-mp/';
const OUT = 'D:/workBuddy_place/.tmp/toy-login-preview.html';

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---- rpx → px（750rpx 视口 = 375px）----
const rpx = (file) => fs.readFileSync(R + file, 'utf8').replace(/(\d*\.?\d+)rpx/g, (_, n) => (Number(n) / 2) + 'px');

const appCss = rpx('app.wxss');
const loginCss = rpx('pages/login/login.wxss');
const setCss = rpx('pages/settings/settings.wxss');

// ---- 模拟数据 ----
const ACCENT = '#3B7DDD', ACCENT2 = '#FFCB05';
// 用一张纯色 PNG data URI 当作头像，避免外链加载不出
const AVA = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#F5B301"/><text x="60" y="78" font-size="60" text-anchor="middle" fill="#fff" font-family="sans-serif">枫</text></svg>');

// ---------- 登录页 ----------
function loginPage(step) {
  const step1 = step === 1;
  return `
<div class="page lg-page" style="--accent:${ACCENT};--accent2:${ACCENT2}">
  <div class="hero">
    <div class="brand">微信登录</div>
    <div class="sub">登录后可在「我的」页面显示你的头像与昵称</div>
  </div>
  ${step1 ? `
  <div class="card">
    <div class="lg-title">用微信登录</div>
    <div class="lg-desc">登录只用于在本机记录你的头像和昵称，收藏数据不会离开你的手机。</div>
    <button class="btn block lg-btn">微信一键登录</button>
    <div class="lg-skip">暂不登录，先逛逛 →</div>
  </div>` : `
  <div class="card">
    <div class="lg-title">完善你的资料</div>
    <div class="lg-desc">微信已不再下发头像昵称授权，请点一下自行选择头像、确认昵称。</div>
    <div class="lg-ava-row">
      <button class="lg-ava-btn"><img class="lg-ava-img" src="${AVA}"></button>
      <div class="lg-ava-hint">
        <div class="lg-ava-t">点击选择头像</div>
        <div class="lg-ava-s">可选，不选则用昵称首字</div>
      </div>
    </div>
    <div class="label">昵称</div>
    <input class="input" value="枫城" />
    <button class="btn block lg-btn">保存并开始收藏</button>
    <div class="lg-skip">暂不设置 →</div>
  </div>`}
  <div class="card lg-safe">
    <div class="lg-safe-t">🔒 关于你的数据</div>
    收藏、照片、备注、价格全部保存在本机微信存储，不会上传到任何服务器；换设备或清理缓存会丢失。
  </div>
</div>`;
}

// ---------- 我的页 ----------
function minePage(logged) {
  const ava = logged
    ? `<img class="uc-ava" src="${AVA}">`
    : `<div class="uc-ava uc-ava-ph">?</div>`;
  return `
<div class="page" style="--accent:${ACCENT};--accent2:${ACCENT2}">
  <div class="hero">
    <div class="brand">宝可梦 · 口袋卡牌助手</div>
    <div class="sub">全国图鉴 809 只 · 七世代收藏与开包</div>
  </div>

  <div class="card user-card">
    <div class="uc-row">
      ${ava}
      <div class="uc-info">
        <div class="uc-name">${logged ? '枫城' : '未登录'}</div>
        <div class="uc-sub">${logged ? '2026-09-21 登录 · 数据仅存本机' : '点击微信登录，显示你的头像与昵称'}</div>
      </div>
      <div class="uc-arrow"></div>
    </div>
  </div>

  <div class="section-title">账号</div>
  <div class="card">
    <div class="row-btn">${logged ? '编辑头像与昵称' : '微信登录'}</div>
    ${logged ? '<div class="row-btn">退出登录</div>' : ''}
  </div>

  <div class="section-title">数据</div>
  <div class="card"><div class="row-btn">🗑️ 清空全部收藏与心愿</div></div>

  <div class="section-title">关于</div>
  <div class="card" style="color:#9AA0AC;font-size:11px;line-height:1.7;">
    口袋卡牌助手 · 宝可梦卡牌收藏与开包模拟小程序（微信原生）。<br/>
    收藏、照片、备注、价格，以及你的头像昵称，全部保存在本机微信存储，不上传服务器；
    每个微信号的数据各自独立、互不可见，换设备或清理缓存会丢失。<br/>
    图鉴收录全国图鉴七世代共 809 只宝可梦，卡面取自宝可梦集换式卡牌（TCG）。
  </div>

  <div class="card disclaimer">
    <div class="dis-title">版权声明</div>
    本小程序中图片、文字等版权归属均为 Nintendo inc. / Creatures inc. / GAME FREAK inc. / DeNA inc. 及相关企业所有，仅供个人学习、交流、参考使用。
  </div>
</div>`;
}

const cap = (t) => `<div class="cap">▼ ${esc(t)}</div>`;

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>登录 / 我的 预览</title><style>
${appCss}
${loginCss}
${setCss}
/* HTML 侧对齐小程序 button 的默认表现 */
button{font-family:inherit;margin:0;box-sizing:border-box;}
input{font-family:inherit;border:none;outline:none;box-sizing:border-box;}
html,body{margin:0;padding:0;background:#EEF3FB;}
.wx-page{width:375px;margin:0 auto;padding-bottom:20px;}
.cap{font:700 12px/1.6 -apple-system,"PingFang SC",sans-serif;color:#5B6472;padding:14px 14px 2px;}
.cols{display:flex;gap:14px;align-items:flex-start;padding:0 8px;}
.col{width:375px;flex:none;}
.uc-ava{object-fit:cover;}
/* 分段显示：#login1 / #login2 / #mine / #mine0 */
.only-login1 .sec-login2,.only-login1 .sec-mine,.only-login1 .sec-mine0,
.only-login2 .sec-login1,.only-login2 .sec-mine,.only-login2 .sec-mine0,
.only-mine .sec-login1,.only-mine .sec-login2,.only-mine .sec-mine0,
.only-mine0 .sec-login1,.only-mine0 .sec-login2,.only-mine0 .sec-mine{display:none;}
</style></head>
<body><div class="wx-page">

  <div class="sec-login1">${cap('登录第一步：微信登录（可「暂不登录」跳过）')}${loginPage(1)}</div>
  <div class="sec-login2">${cap('登录第二步：完善头像与昵称')}${loginPage(2)}</div>
  <div class="sec-mine">${cap('我的页（已登录）')}${minePage(true)}</div>
  <div class="sec-mine0">${cap('我的页（未登录）')}${minePage(false)}</div>

</div>
<script>
  var h = (location.hash || '').replace('#', '');
  if (h) document.body.className = 'only-' + h;
</script>
</body></html>`;

fs.writeFileSync(OUT, html);
console.log('已生成 ' + OUT);
console.log('分段：#login1 / #login2 / #mine / #mine0');
