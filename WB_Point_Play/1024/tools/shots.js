/**
 * 公众号配图批量截图（v3）
 * CDP 驱动真实浏览器：注入种子数据 → 真点交互 → 按内容块裁剪
 * 用法：node tools/shots.js
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9414;
const SITE = 'https://juziqishui11.github.io/Workbuddy_Place/1024/?nointro=1';
const OUT = path.join(__dirname, '..', 'assets', 'shots');
const W = 1360;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getJSON(url) {
  return new Promise((res, rej) => {
    http.get(url, (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } });
    }).on('error', rej);
  });
}

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.waiting = new Map();
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.waiting.has(m.id)) {
        const { res, rej } = this.waiting.get(m.id); this.waiting.delete(m.id);
        m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
      }
    });
  }
  send(method, params) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.waiting.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
      setTimeout(() => { if (this.waiting.has(id)) { this.waiting.delete(id); rej(new Error('timeout ' + method)); } }, 30000);
    });
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', {
      expression: expr, returnByValue: true, awaitPromise: true, allowUnsafeEvalBlockedByCSP: true
    });
    if (r.exceptionDetails) throw new Error('EVAL: ' + (r.exceptionDetails.exception || {}).description);
    return r.result.value;
  }
  async viewport(h) {
    await this.send('Emulation.setDeviceMetricsOverride', { width: W, height: h, deviceScaleFactor: 1.5, mobile: false });
    await sleep(450);
  }
  async grab(file, clip, scale) {
    const p = { format: 'jpeg', quality: 86, captureBeyondViewport: !!clip };
    if (clip) p.clip = { x: clip.x, y: clip.y, width: clip.width, height: clip.height, scale: scale || 1 };
    const { data } = await this.send('Page.captureScreenshot', p);
    const buf = Buffer.from(data, 'base64');
    fs.writeFileSync(file, buf);
    console.log('  OK ' + path.basename(file) + '  ' + (buf.length / 1024).toFixed(0) + ' KB');
  }
  /** 展开面板按内容高度收敛视口 */
  async fit() {
    const h = await this.eval(`(function(){
      var b = document.querySelector('.panel.is-open .panel__body');
      if (!b) return 0;
      b.scrollTop = 0;
      var top = 1e9, bot = -1e9;
      [].slice.call(b.children).forEach(function (k) {
        var q = k.getBoundingClientRect();
        if (q.height > 2) { top = Math.min(top, q.top); bot = Math.max(bot, q.bottom); }
      });
      if (bot < 0) return 0;
      return Math.ceil(bot - Math.min(top, b.getBoundingClientRect().top) + 46);
    })()`);
    const vh = Math.min(Math.max(h + 84, 560), 2200);
    await this.viewport(vh);
    return vh;
  }
  async waitFor(expr, label, total) {
    const t0 = Date.now();
    while (Date.now() - t0 < (total || 25000)) {
      try { if (await this.eval(expr)) return true; } catch (e) {}
      await sleep(300);
    }
    throw new Error('wait timeout: ' + label);
  }
  async open(scene, hold) {
    await this.viewport(1200);
    await this.eval("APP.open('" + scene + "')");
    await this.waitFor('document.querySelector("#panel-' + scene + '").classList.contains("is-open")', 'open ' + scene);
    await sleep(hold || 1300);
  }
  /** 按选择器量出包围盒（可传多个选择器取并集；body 先回顶，避免滚动影响坐标） */
  async span(sels, padTop, padBot, maxH, padX, xSel) {
    const list = Array.isArray(sels) ? sels : [sels];
    const r = await this.eval(`(function(){
      var b = document.querySelector('.panel.is-open .panel__body');
      if (b) b.scrollTop = 0;
      var out = [];
      ${JSON.stringify(list)}.forEach(function (s) {
        var e = document.querySelector(s);
        if (!e) return;
        var q = e.getBoundingClientRect();
        if (q.height < 2) return;
        out.push({ t: q.top, b: q.bottom, l: q.left, r: q.right });
      });
      if (!out.length) return null;
      var xr = null;
      ${xSel ? `var xe = document.querySelector('${xSel}'); if (xe) { var qx = xe.getBoundingClientRect(); xr = { l: qx.left, r: qx.right }; }` : ''}
      return {
        top: Math.min.apply(null, out.map(function (o) { return o.t; })),
        bot: Math.max.apply(null, out.map(function (o) { return o.b; })),
        left: xr ? xr.l : Math.min.apply(null, out.map(function (o) { return o.l; })),
        right: xr ? xr.r : Math.max.apply(null, out.map(function (o) { return o.r; }))
      };
    })()`);
    if (!r) throw new Error('量不到：' + list.join(' / '));
    const px = padX == null ? 0 : padX;
    const x0 = Math.max(0, Math.round(r.left - px));
    const x1 = Math.min(W, Math.round(r.right + px));
    const y0 = Math.max(0, Math.round(r.top - (padTop == null ? 24 : padTop)));
    let y1 = Math.round(r.bot + (padBot == null ? 24 : padBot));
    if (maxH && y1 - y0 > maxH) y1 = y0 + maxH;
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  }
}

// 播种：日期按本地时区算，避免 UTC 偏移把「今天」算成昨天
const SEED = `
(function () {
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var fmt = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var back = function (n) { var d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
  var today = fmt(new Date());
  var mk = function (list) { return list.map(function (id, i) { return { id: id, ts: Date.now() - (list.length - i) * 2520000 }; }); };
  var days = {};
  days[back(6)] = mk(['cr', 'green']);
  days[back(5)] = mk(['freeze', 'nomeet', 'green']);
  days[back(4)] = mk(['build', 'praise']);
  days[back(3)] = mk(['noship', 'nomeet', 'nofri']);
  days[back(2)] = mk(['noalert', 'cr', 'green', 'build']);
  days[back(1)] = mk(['noboss', 'freeze', 'ontime']);
  days[today] = mk(['cr', 'freeze', 'noship', 'green', 'nomeet']);

  localStorage.setItem('p1024.v2.state', JSON.stringify({
    v: 2,
    answers: [0, 1, 1, 0, 1, 0, 1, 1, 0, 1],
    idx: 9,
    num: null,
    board: { days: days, streak: 6, lastDay: today },
    team: {},
    wishes: [
      { text: '希望明年的今天，我还在写代码。', blessing: '这一行，明年再读一遍。', num: 777, ts: Date.now() - 86400000 * 30 },
      { text: '希望下次需求能说人话。', blessing: '话说明白了，活就少一半。', num: 512, ts: Date.now() - 86400000 * 12 },
      { text: '希望六点关电脑的时候，天还亮着。', blessing: '天黑得慢一点。', num: 63, ts: Date.now() - 86400000 * 3 }
    ],
    saved: [],
    cert: { name: '某某某', num: '0429', dept: 'INF', certId: 'fish', skin: 'red' }
  }));
})();
`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const userDir = path.join(os.tmpdir(), 'shot-v3-' + Date.now());
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--disable-dev-shm-usage', '--force-device-scale-factor=1',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + userDir,
    '--window-size=' + W + ',1020', 'about:blank'], { stdio: 'ignore' });

  let ws = null;
  try {
    let target = null;
    for (let i = 0; i < 40 && !target; i++) {
      try { target = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find((t) => t.type === 'page'); } catch (e) {}
      if (!target) await sleep(250);
    }
    if (!target) throw new Error('no target');
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const cdp = new CDP(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.viewport(1020);
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: SEED });
    await cdp.send('Page.navigate', { url: SITE });
    await cdp.waitFor('document.querySelectorAll(".panel").length === 6', 'panels');
    await sleep(2600);
    console.log('shots:');

    /* ── 工号链路：领号 → 工牌 → 1024 格子 ── */
    await cdp.open('profile', 1600);
    await cdp.eval('document.querySelector("#panel-profile [data-act=\\"edit\\"]").click()');
    await sleep(900);
    await cdp.eval('var q=document.querySelector("#panel-profile [data-i=\\"9\\"]"); if(q) q.click();');
    await sleep(900);
    await cdp.viewport(700);
    await sleep(500);
    await cdp.grab(path.join(OUT, '02-bitgrid.jpg'));

    // 出结果，按内容块裁两张
    await cdp.eval('document.querySelector("#panel-profile [data-act=\\"finish\\"]").click()');
    await sleep(2300);
    await cdp.viewport(2600);
    await sleep(600);
    await cdp.grab(path.join(OUT, '03-pass.jpg'),
      await cdp.span(['.resbar', '.radar'], 18, 60));
    await cdp.grab(path.join(OUT, '04-grid.jpg'),
      await cdp.span(['.grid1024', '.glegend'], 58, 10, 0, 82, '.grid1024'), 2);

    /* ── 主视图 ── */
    await cdp.eval('APP.close()');
    await cdp.viewport(1020);
    await sleep(900);
    await cdp.eval('window.scrollTo(0,0)');
    await sleep(500);
    const pageH = await cdp.eval('document.documentElement.scrollHeight');
    await cdp.viewport(Math.min(Math.max(pageH, 900), 2600));
    await cdp.eval('window.scrollTo(0,0)');
    await sleep(500);
    await cdp.grab(path.join(OUT, '01-main.jpg'));

    /* ── 四块面板：整屏自适应 ── */
    const panels = [
      ['board', '05-board.jpg', 1800],
      ['time', '07-timemachine.jpg', 2400]
    ];
    for (const it of panels) {
      await cdp.open(it[0], it[2]);
      await cdp.fit();
      await cdp.grab(path.join(OUT, it[1]));
    }

    /* 证书：cert-wrap 会随视口拉伸，按证书本体 + 表单列裁剪 */
    await cdp.open('cert', 1800);
    await cdp.viewport(1400);
    await sleep(500);
    await cdp.grab(path.join(OUT, '06-cert.jpg'),
      await cdp.span(['.cert-stage', '.cert-fields'], 18, 30));

    /* ── 许愿机：真摇一条 ── */
    await cdp.open('wish', 1300);
    await cdp.eval('document.querySelector("#panel-wish [data-act=\\"lot\\"]").click()');
    await sleep(2400);
    await cdp.fit();
    await cdp.grab(path.join(OUT, '08-wish.jpg'));

    /* ── 翻译机：四栏结果 + 黑话榜 ── */
    await cdp.open('translate', 1300);
    await cdp.eval('(function(){var t=document.querySelector("#trText");t.value="这个页面再丝滑一点，明天能给吗？";t.dispatchEvent(new Event("input",{bubbles:true}));document.querySelector("#panel-translate [data-act=\\"go\\"]").click();})()');
    await sleep(2300);
    await cdp.viewport(1400);
    await sleep(500);
    await cdp.grab(path.join(OUT, '09-translate.jpg'),
      await cdp.span(['.tr'], 16, 8));
    await cdp.grab(path.join(OUT, '10-jargon.jpg'),
      await cdp.span(['.tr-rank'], 10, 20, 940));

    console.log('done');
  } catch (e) {
    console.error('FAIL: ' + e.message);
    process.exitCode = 1;
  } finally {
    if (ws) { try { ws.close(); } catch (e) {} }
    proc.kill();
    await sleep(700);
    try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) {}
    setTimeout(() => process.exit(process.exitCode || 0), 400);
  }
})();
