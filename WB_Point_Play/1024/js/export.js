/* 1024 码上好运 — 统一 Canvas 导出层：所有卡片都是纯函数重绘，与 DOM 动画解耦
   色板取自 APP.theme（CSS 变量的镜像），保证页面与导出图同一套颜色 */
(function () {
  const U = APP.util;
  const S = 2;

  const F = {
    title: '"Arial Black","Impact","PingFang SC","Microsoft YaHei",sans-serif',
    body: 'system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif',
    mono: 'ui-monospace,"JetBrains Mono",Menlo,Consolas,"Courier New",monospace'
  };

  const FALLBACK = {
    bg: '#F7F6FC', bg2: '#EFECFA', surface: '#FFFFFF', surface2: '#F4F2FC', surface3: '#E9E5F7',
    ink: '#191428', tx: '#191428', tx2: '#4E4667', tx3: '#6F6788', tx4: '#9A93AD',
    line: 'rgba(25,20,40,.08)', line2: 'rgba(25,20,40,.14)',
    violet: '#6C4CF1', violetSoft: '#EDE9FF', violetInk: '#4B2BC9',
    magenta: '#F2248C', magentaInk: '#B00E63', cyan: '#16C7E8', cyanInk: '#087A90',
    mint: '#2FE0B0', mintInk: '#087A5E', lemon: '#FFD84D', lemonInk: '#8A6500',
    orange: '#FF8A3D', orangeInk: '#A84A00', lime: '#A8E63A', limeInk: '#4E7A0F',
    coral: '#FF5C7A', coralInk: '#B81F3D',
    codeBg: '#171226', codeTx: '#EDE9FA', paper: '#FFF8EC'
  };
  const T = (APP.theme && APP.theme.T) || FALLBACK;
  const A = (APP.theme && APP.theme.alpha) || function (c) { return c; };

  const SKIN_FALLBACK = {
    red:   { bg: '#FFF7F3', ink: '#7A1620', accent: '#C92A38', sub: '#9A6B62', line: '#E8B4B0', paper: '#FFFFFF', seal: '#C92A38' },
    gold:  { bg: '#FFFBEF', ink: '#6B4E12', accent: '#C79A2E', sub: '#9C8554', line: '#E8D9A8', paper: '#FFFFFF', seal: '#C79A2E' },
    green: { bg: '#F3FCF8', ink: '#0E5C46', accent: '#12A67C', sub: '#5E8A7B', line: '#B9E6D6', paper: '#FFFFFF', seal: '#12A67C' },
    retro: { bg: '#FBF3E2', ink: '#3B2E1C', accent: '#8A6A3A', sub: '#7A6748', line: '#D9C6A4', paper: '#FFFCF3', seal: '#8A6A3A' }
  };
  const SKIN = (APP.theme && APP.theme.skins) || SKIN_FALLBACK;

  function make(w, h) {
    const c = document.createElement('canvas');
    c.width = w * S; c.height = h * S;
    const x = c.getContext('2d');
    x.setTransform(S, 0, 0, S, 0, 0);
    x.textBaseline = 'top';
    return { c, x, w, h };
  }

  function rr(x, X, Y, W, H, R) {
    R = Math.min(R, W / 2, H / 2);
    x.beginPath();
    if (x.roundRect) { x.roundRect(X, Y, W, H, R); return; }
    x.moveTo(X + R, Y);
    x.arcTo(X + W, Y, X + W, Y + H, R);
    x.arcTo(X + W, Y + H, X, Y + H, R);
    x.arcTo(X, Y + H, X, Y, R);
    x.arcTo(X, Y, X + W, Y, R);
    x.closePath();
  }

  function txt(x, s, X, Y, opt) {
    opt = opt || {};
    x.save();
    x.font = (opt.weight || 400) + ' ' + (opt.size || 14) + 'px ' + (opt.font || F.body);
    x.fillStyle = opt.color || T.ink;
    x.textAlign = opt.align || 'left';
    if (opt.spacing) x.letterSpacing = opt.spacing;
    x.fillText(s, X, Y);
    x.restore();
  }

  // 避头尾：这些字符不能出现在行首 / 行尾
  const NO_LEAD = '，。、；：！？）》」』”’,.;:!?)]}%…—·';
  const NO_TAIL = '（【《「『“‘([{';

  function wrap(x, s, X, Y, maxW, lh, opt) {
    opt = opt || {};
    x.save();
    x.font = (opt.weight || 400) + ' ' + (opt.size || 14) + 'px ' + (opt.font || F.body);
    let line = '', yy = Y;
    const chars = Array.from(String(s));
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i], t = line + ch;
      // 标点不落行首：宁可让它挂在本行末尾，也不要换行后以一个逗号起行
      const over = x.measureText(t).width > maxW && NO_LEAD.indexOf(ch) === -1;
      if (over && line) {
        let carry = '';
        if (NO_TAIL.indexOf(line.charAt(line.length - 1)) !== -1) {
          carry = line.charAt(line.length - 1);
          line = line.slice(0, -1);
        }
        txt(x, line, X, yy, opt); yy += lh; line = carry + ch;
      } else line = t;
    }
    if (line) { txt(x, line, X, yy, opt); yy += lh; }
    x.restore();
    return yy;
  }

  function noise(x, w, h, alpha) {
    const n = 64, cv = document.createElement('canvas');
    cv.width = n; cv.height = n;
    const nx = cv.getContext('2d');
    const img = nx.createImageData(n, n);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (Math.random() * 60 - 30);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    nx.putImageData(img, 0, 0);
    x.save();
    x.globalAlpha = alpha == null ? .05 : alpha;
    x.globalCompositeOperation = 'overlay';
    const p = x.createPattern(cv, 'repeat');
    x.fillStyle = p; x.fillRect(0, 0, w, h);
    x.restore();
  }

  function barcode(x, X, Y, W, H, seed) {
    let h = 5381;
    for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
    const bars = 46, bw = W / bars;
    x.save();
    for (let i = 0; i < bars; i++) {
      h = (h * 1103515245 + 12345) >>> 0;
      const on = (h >>> 16) % 100 > 42;
      if (!on) continue;
      const ww = bw * (((h >>> 8) % 3) + 1) / 2;
      x.fillRect(X + i * bw, Y, Math.max(1, ww), H);
    }
    x.restore();
  }

  /* 浅底 + 细网格 + 柔光晕：五张长图共用的底 */
  function backdrop(x, w, h, mesh) {
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, T.bg); g.addColorStop(1, T.bg2);
    x.fillStyle = g; x.fillRect(0, 0, w, h);

    if (mesh) {
      const r1 = x.createRadialGradient(w * .12, 0, 0, w * .12, 0, w * .8);
      r1.addColorStop(0, A(T.violet, .13)); r1.addColorStop(1, A(T.violet, 0));
      x.fillStyle = r1; x.fillRect(0, 0, w, h);
      const r2 = x.createRadialGradient(w * .9, h * .08, 0, w * .9, h * .08, w * .7);
      r2.addColorStop(0, A(T.cyan, .12)); r2.addColorStop(1, A(T.cyan, 0));
      x.fillStyle = r2; x.fillRect(0, 0, w, h);
    }

    x.strokeStyle = A(T.violet, .08); x.lineWidth = 1;
    for (let i = 0; i <= w; i += 40) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
    for (let i = 0; i <= h; i += 40) { x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
  }

  function card(x, X, Y, W, H, R) {
    x.save();
    x.fillStyle = A(T.ink, .07);
    rr(x, X + 6, Y + 6, W, H, R); x.fill();
    x.fillStyle = T.surface;
    rr(x, X, Y, W, H, R); x.fill();
    x.strokeStyle = T.line2; x.lineWidth = 1.5;
    rr(x, X, Y, W, H, R); x.stroke();
    x.restore();
  }

  /* ---------- 证书 ---------- */
  function drawCert(spec) {
    const w = 1200, h = 850;
    const t = make(w, h), x = t.x;
    const sk = SKIN[spec.skin] || SKIN.red;

    x.fillStyle = sk.bg; x.fillRect(0, 0, w, h);

    // 内衬纸 + 双线边框
    x.fillStyle = sk.paper;
    rr(x, 26, 26, w - 52, h - 52, 6); x.fill();
    x.strokeStyle = sk.line; x.lineWidth = 3;
    rr(x, 26, 26, w - 52, h - 52, 6); x.stroke();
    x.lineWidth = 1; x.globalAlpha = .5;
    rr(x, 40, 40, w - 80, h - 80, 4); x.stroke();
    x.globalAlpha = 1;

    // 角标
    const corner = (cx, cy, sx, sy) => {
      x.strokeStyle = sk.accent; x.lineWidth = 2;
      x.beginPath();
      x.moveTo(cx, cy + 22 * sy); x.lineTo(cx, cy); x.lineTo(cx + 22 * sx, cy);
      x.stroke();
    };
    corner(52, 52, 1, 1); corner(w - 52, 52, -1, 1);
    corner(52, h - 52, 1, -1); corner(w - 52, h - 52, -1, -1);

    // 纹章
    const ex = w / 2, ey = 118, er = 34;
    x.save();
    x.strokeStyle = sk.accent; x.lineWidth = 2;
    x.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 30);
      const px = ex + Math.cos(a) * er, py = ey + Math.sin(a) * er;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.closePath(); x.stroke();
    x.globalAlpha = .12; x.fillStyle = sk.accent; x.fill();
    x.restore();
    txt(x, '1024', ex, ey - 9, { font: F.mono, size: 15, weight: 700, align: 'center', color: sk.accent });

    // 标题
    const fsz = spec.title.length > 10 ? 40 : 47;
    txt(x, spec.title, w / 2, 186, { font: F.title, size: fsz, weight: 900, align: 'center', color: sk.ink });
    txt(x, spec.sub, w / 2, 186 + fsz + 12, { font: F.mono, size: 11, align: 'center', color: sk.sub, spacing: '4px' });

    // 横线
    x.strokeStyle = sk.line; x.lineWidth = 1; x.globalAlpha = .45;
    x.beginPath(); x.moveTo(150, 292); x.lineTo(w - 150, 292); x.stroke();
    x.globalAlpha = 1;

    // 正文
    let y = 322;
    spec.body.forEach((ln) => {
      y = wrap(x, ln, 150, y, w - 300, 36, { size: 19, color: sk.ink });
    });

    // 持证人
    y += 14;
    txt(x, '兹 证 明', 150, y, { font: F.mono, size: 12, color: sk.sub, spacing: '3px' });
    y += 30;
    txt(x, spec.name || '某某某', 168, y, { font: F.title, size: 34, weight: 900, color: sk.accent });
    txt(x, '（工号 ' + spec.no + ' · ' + spec.dept + '）', 168 + (spec.name || '').length * 34 + 14, y + 14,
        { size: 13, color: sk.sub, font: F.mono });

    // 授证说明
    y += 56;
    wrap(x, spec.note, 150, y, w - 460, 28, { size: 16, weight: 600, color: sk.ink });

    // 钢印
    x.save();
    x.translate(w - 200, 470);
    x.rotate(-16 * Math.PI / 180);
    x.globalAlpha = .34;
    x.strokeStyle = sk.seal; x.lineWidth = 4;
    x.beginPath(); x.arc(0, 0, 72, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 1.5;
    x.beginPath(); x.arc(0, 0, 62, 0, Math.PI * 2); x.stroke();
    x.restore();
    x.save();
    x.translate(w - 200, 470); x.rotate(-16 * Math.PI / 180);
    x.globalAlpha = .5;
    txt(x, '1024', 0, -22, { font: F.title, size: 26, align: 'center', color: sk.seal });
    txt(x, '码上好运分局', 0, 6, { font: F.body, size: 11, align: 'center', color: sk.seal });
    txt(x, '持证上岗', 0, 24, { font: F.mono, size: 9, align: 'center', color: sk.seal });
    x.restore();

    // 底部
    x.strokeStyle = sk.line; x.globalAlpha = .35; x.lineWidth = 1;
    x.beginPath(); x.moveTo(150, h - 168); x.lineTo(w - 150, h - 168); x.stroke();
    x.globalAlpha = 1;

    txt(x, '签发单位', 150, h - 148, { font: F.mono, size: 10, color: sk.sub, spacing: '2px' });
    txt(x, '1024 程序员节组委会 · 码上好运分局', 150, h - 128, { size: 16, weight: 700, color: sk.ink });
    txt(x, '签发日期  ' + spec.date, 150, h - 100, { font: F.mono, size: 12, color: sk.sub });

    txt(x, '证书编号', w - 150, h - 148, { font: F.mono, size: 10, color: sk.sub, align: 'right', spacing: '2px' });
    txt(x, spec.certNo, w - 150, h - 128, { font: F.mono, size: 15, weight: 700, color: sk.accent, align: 'right' });

    x.save();
    x.fillStyle = sk.sub; x.globalAlpha = .8;
    barcode(x, w - 260, h - 104, 110, 26, spec.certNo);
    x.restore();

    txt(x, '本证书为娱乐性质，不具备任何法定效力', w / 2, h - 62, { size: 11, color: sk.sub, align: 'center' });

    noise(x, w, h, .04);
    return t.c;
  }

  /* ---------- 今日好事板 ---------- */
  function drawBoard(spec) {
    const w = 1080, h = 1920;
    const t = make(w, h), x = t.x;

    backdrop(x, w, h, true);

    // 头部
    txt(x, '[ MONITOR / GOODNESS ]', 64, 68, { font: F.mono, size: 15, color: T.tx3, spacing: '3px' });
    txt(x, '今日好事看板', 64, 100, { font: F.title, size: 72, weight: 900, color: T.ink });
    txt(x, 'TODAY IS A GOOD DAY TO SHIP NOTHING', 64, 196, { font: F.mono, size: 15, color: T.magentaInk, spacing: '3px' });

    txt(x, spec.date, 64, 240, { font: F.mono, size: 17, color: T.tx2 });
    txt(x, '持牌人 #' + spec.no, w - 64, 240, { font: F.mono, size: 17, color: T.violetInk, align: 'right' });

    // 指标 4 宫格：全是正向指标，各带一个霓虹色
    const MC = {
      violet: [T.violet, T.violetInk],
      lemon: [T.lemon, T.lemonInk],
      mint: [T.mint, T.mintInk],
      cyan: [T.cyan, T.cyanInk]
    };
    const bw = (w - 128 - 24) / 2, bh = 168;
    spec.metrics.forEach((m, i) => {
      const X = 64 + (i % 2) * (bw + 24), Y = 300 + Math.floor(i / 2) * (bh + 20);
      const pair = MC[m.c] || MC.mint;
      card(x, X, Y, bw, bh, 18);
      x.fillStyle = pair[0];
      rr(x, X + 24, Y + bh - 16, 46, 5, 3); x.fill();
      txt(x, m.k, X + 24, Y + 26, { font: F.mono, size: 15, color: T.tx3, spacing: '2px' });
      txt(x, m.v, X + 24, Y + 58, { font: F.mono, size: 52, weight: 700, color: pair[1] });
      if (m.sub) txt(x, m.sub, X + 24, Y + bh - 42, { font: F.mono, size: 13, color: T.tx3 });
    });

    // 曲线：07:00–23:00 的累计好事，阶梯往上走
    const cy = 690, ch = 200;
    card(x, 64, cy, w - 128, ch, 18);
    const gx0 = 96, gx1 = w - 96, gy0 = cy + 48, gy1 = cy + ch - 44;
    x.save();
    rr(x, 64, cy, w - 128, ch, 18); x.clip();
    x.strokeStyle = A(T.violet, .10); x.lineWidth = 1;
    for (let i = 0; i <= 2; i++) {
      const yy = gy0 + (gy1 - gy0) * i / 2;
      x.beginPath(); x.moveTo(gx0, yy); x.lineTo(gx1, yy); x.stroke();
    }
    x.restore();

    // 和面板一致：曲线只画到当前时刻，右边留白
    const allCum = spec.cum || [];
    const lastH = Math.max(1, allCum.length - 1);           // 时间轴右端（23 时）
    const nowIdx = Math.min(lastH, Math.max(0, new Date().getHours()));
    const cum = allCum.slice(0, nowIdx + 1);
    const mx = Math.max(2, spec.cumMax || 0);
    const n = cum.length || 1;
    // X 轴按「完整 24 小时」定位，否则曲线被拉伸、刻度会跑出卡片
    const cpx = (i) => gx0 + (gx1 - gx0) * i / lastH;
    const cpy = (v) => gy1 - (gy1 - gy0) * (v / mx);

    x.strokeStyle = T.violet;
    x.lineWidth = 3;
    x.lineJoin = 'round';
    x.beginPath();
    x.moveTo(cpx(0), cpy(cum[0] || 0));
    for (let i = 1; i < n; i++) {
      x.lineTo(cpx(i), cpy(cum[i - 1] || 0));
      x.lineTo(cpx(i), cpy(cum[i] || 0));
    }
    x.stroke();
    x.lineTo(cpx(n - 1), gy1);
    x.lineTo(cpx(0), gy1);
    x.closePath();
    const grad = x.createLinearGradient(0, gy0, 0, gy1);
    grad.addColorStop(0, A(T.violet, .22));
    grad.addColorStop(1, A(T.violet, 0));
    x.fillStyle = grad;
    x.fill();

    txt(x, '累计 ' + (cum[n - 1] || 0) + ' 件', 88, cy + 24, { font: F.mono, size: 13, color: T.tx3 });
    [6, 12, 18].forEach((hh, i) => {
      txt(x, hh + ':00', cpx(hh), cy + ch - 22, {
        font: F.mono, size: 12, color: T.tx4, align: 'center'
      });
    });

    // 好事列表
    let y = cy + ch + 46;
    txt(x, '今日已确认的好事', 64, y, { size: 22, weight: 700, color: T.ink });
    y += 46;
    if (!spec.items.length) {
      txt(x, '还没有打卡。今天的第一个好消息，等你去发现。', 64, y, { size: 17, color: T.tx3 });
      y += 40;
    }
    spec.items.slice(0, 10).forEach((it) => {
      x.fillStyle = T.surface2;
      rr(x, 64, y, w - 128, 54, 12); x.fill();
      x.strokeStyle = T.line; x.lineWidth = 1;
      rr(x, 64, y, w - 128, 54, 12); x.stroke();
      txt(x, it.time, 84, y + 17, { font: F.mono, size: 16, color: T.violetInk });
      txt(x, it.label, 168, y + 15, { size: 19, color: T.ink });
      y += 62;
    });

    // streak
    y = Math.max(y + 24, h - 320);
    txt(x, '连续打卡', 64, y, { font: F.mono, size: 14, color: T.tx3, spacing: '3px' });
    txt(x, spec.streak + ' 天', 64, y + 24, { font: F.title, size: 46, weight: 900, color: T.mintInk });
    spec.week.forEach((n, i) => {
      x.fillStyle = n ? A(T.mint, 0.24 + n * 0.26) : T.surface3;
      rr(x, w - 64 - (6 - i) * 46, y + 14, 34, 34, 8); x.fill();
    });
    txt(x, '近 7 日', w - 64, y - 12, { font: F.mono, size: 12, color: T.tx3, align: 'right' });

    // 底部
    x.strokeStyle = T.line2; x.lineWidth = 1;
    x.beginPath(); x.moveTo(64, h - 176); x.lineTo(w - 64, h - 176); x.stroke();
    txt(x, '1024 码上好运 · 一个程序员的 1024 一日游', 64, h - 148, { size: 19, weight: 700, color: T.ink });
    txt(x, '#WorkBuddy  #1024程序员节', 64, h - 108, { font: F.mono, size: 18, color: T.violetInk });
    txt(x, '本机记录 · 数据不上传', w - 64, h - 108, { font: F.mono, size: 13, color: T.tx3, align: 'right' });

    noise(x, w, h, .04);
    return t.c;
  }

  /* ---------- 愿望封存卡 ---------- */
  function drawWish(spec) {
    const w = 1080, h = 1350;
    const t = make(w, h), x = t.x;
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#FDF4E1'); g.addColorStop(1, '#EFDCBB');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    noise(x, w, h, .05);

    x.strokeStyle = '#B49B72'; x.lineWidth = 2;
    rr(x, 48, 48, w - 96, h - 96, 4); x.stroke();
    x.lineWidth = 1; x.globalAlpha = .6;
    rr(x, 62, 62, w - 124, h - 124, 3); x.stroke();
    x.globalAlpha = 1;

    txt(x, '[ WISH / SEALED ]', 96, 108, { font: F.mono, size: 16, color: '#9C8763', spacing: '3px' });
    txt(x, '愿望封存卡', 96, 142, { font: F.title, size: 60, weight: 900, color: '#2A2015' });
    txt(x, '#' + spec.no + '  ·  ' + spec.date, 96, 220, { font: F.mono, size: 18, color: '#7A6748' });

    x.strokeStyle = '#C9B795'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(96, 268); x.lineTo(w - 96, 268); x.stroke();

    txt(x, '写下的话', 96, 300, { font: F.mono, size: 14, color: '#9C8763', spacing: '2px' });
    const ey = wrap(x, spec.text, 96, 336, w - 220, 62, { size: 40, weight: 700, color: '#2A2015' });

    x.strokeStyle = '#C9B795'; x.beginPath(); x.moveTo(96, ey + 30); x.lineTo(w - 96, ey + 30); x.stroke();

    txt(x, '一句祝福', 96, ey + 58, { font: F.mono, size: 14, color: '#9C8763', spacing: '2px' });
    wrap(x, spec.blessing, 96, ey + 92, w - 200, 44, { size: 26, color: '#564733' });

    // 余下的空白铺成信纸横线：不然中间会空出一大块，像没画完
    x.save();
    x.strokeStyle = 'rgba(150,124,86,.15)'; x.lineWidth = 1;
    for (let ly = ey + 190; ly < h - 330; ly += 58) {
      x.beginPath(); x.moveTo(96, ly); x.lineTo(w - 96, ly); x.stroke();
    }
    x.restore();

    // 封蜡
    x.save();
    x.translate(w - 190, h - 250);
    x.rotate(-12 * Math.PI / 180);
    x.globalAlpha = .85;
    x.fillStyle = '#E11D74';
    x.beginPath(); x.arc(0, 0, 62, 0, Math.PI * 2); x.fill();
    x.globalAlpha = 1;
    txt(x, '已封存', 0, -18, { font: F.title, size: 20, align: 'center', color: '#fff' });
    txt(x, 'SEALED', 0, 8, { font: F.mono, size: 12, align: 'center', color: 'rgba(255,255,255,.85)' });
    x.restore();

    txt(x, '这里不预测任何结果，只是把话存下来，明年再来看。', 96, h - 150, { size: 16, color: '#7A6748' });
    txt(x, '1024 码上好运 · #WorkBuddy #1024程序员节', 96, h - 112, { font: F.mono, size: 14, color: '#9C8763' });
    return t.c;
  }

  /* ---------- 编码史 ---------- */
  function drawHistory(spec) {
    const w = 1080, rowH = 156, h = 280 + Math.max(1, spec.items.length) * rowH + 130;
    const t = make(w, h), x = t.x;

    backdrop(x, w, h, false);

    txt(x, '[ ARCHIVE / TIMELINE ]', 64, 68, { font: F.mono, size: 15, color: T.tx3, spacing: '3px' });
    txt(x, '我的编码史', 64, 100, { font: F.title, size: 64, weight: 900, color: T.ink });
    txt(x, '#' + spec.no + ' · 共 ' + spec.items.length + ' 段封存', 64, 190, { font: F.mono, size: 17, color: T.violetInk });

    let y = 260;
    spec.items.forEach((it) => {
      card(x, 64, y, w - 128, rowH - 20, 14);
      txt(x, String(it.year), 88, y + 20, { font: F.title, size: 30, weight: 900, color: T.violet });
      txt(x, it.title, 88 + 96, y + 26, { size: 19, color: T.ink });
      txt(x, '命中 ' + (it.hits || 0) + ' 条代际写法', w - 88, y + 28, { font: F.mono, size: 14, color: T.cyanInk, align: 'right' });
      const snippet = String(it.code || '').replace(/\s+/g, ' ').slice(0, 90);
      txt(x, snippet, 88, y + 74, { font: F.mono, size: 14, color: T.tx2 });
      y += rowH;
    });

    txt(x, '#WorkBuddy  #1024程序员节', 64, h - 96, { font: F.mono, size: 17, color: T.violetInk });
    txt(x, '1024 码上好运', w - 64, h - 96, { font: F.mono, size: 14, color: T.tx3, align: 'right' });
    noise(x, w, h, .04);
    return t.c;
  }

  /* ---------- 工牌长图（含封神形象） ---------- */
  function cover(x, img, X, Y, W, H) {
    const iw = img.naturalWidth || img.width || 0;
    const ih = img.naturalHeight || img.height || 0;
    if (!iw || !ih) return false;
    const s = Math.max(W / iw, H / ih);
    const dw = iw * s, dh = ih * s;
    x.drawImage(img, X + (W - dw) / 2, Y + (H - dh) / 2, dw, dh);
    return true;
  }

  function heroFallback(x, X, Y, W, H, hero) {
    const pal = (hero && hero.palette) || [T.violet, T.cyan];
    const g = x.createLinearGradient(X, Y, X + W, Y + H);
    g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]);
    x.fillStyle = g;
    rr(x, X, Y, W, H, 22); x.fill();
    txt(x, String((hero && hero.name || '?').slice(0, 1)), X + W / 2, Y + H / 2 - 90,
      { font: F.title, size: 120, weight: 900, align: 'center', color: '#fff' });
    txt(x, hero && hero.name || '', X + W / 2, Y + H - 90,
      { font: F.title, size: 30, weight: 700, align: 'center', color: '#fff' });
  }

  function drawPass(c, hero, img) {
    const w = 1080, h = 1350;
    const t = make(w, h), x = t.x;

    backdrop(x, w, h, true);

    // 头部
    txt(x, '[ STAFF PASS / 1024 ]', 64, 62, { font: F.mono, size: 15, color: T.tx3, spacing: '3px' });
    txt(x, '码上好运', 64, 94, { font: F.title, size: 58, weight: 900, color: T.ink });
    txt(x, '程序员持牌凭证', 64, 172, { font: F.mono, size: 16, color: T.magentaInk, spacing: '2px' });

    // 白卡
    const CX = 64, CY = 216, CW = w - 128, CH = 836;
    card(x, CX, CY, CW, CH, 28);

    // 形象
    const AX = 104, AY = 264, AW = 340, AH = 425;
    x.save();
    rr(x, AX, AY, AW, AH, 22); x.clip();
    let drawn = false;
    if (img) drawn = cover(x, img, AX, AY, AW, AH);
    x.restore();
    if (!drawn) heroFallback(x, AX, AY, AW, AH, hero);
    x.save();
    x.strokeStyle = A(T.ink, .12); x.lineWidth = 1.5;
    rr(x, AX, AY, AW, AH, 22); x.stroke();
    x.restore();

    // 右栏
    const RX = 480;
    txt(x, '封神原型 / ARCHETYPE', RX, AY + 2, { font: F.mono, size: 13, color: T.violetInk, spacing: '2px' });
    txt(x, hero.name, RX, AY + 26, { font: F.title, size: 52, weight: 900, color: T.ink });
    txt(x, '法宝 · ' + hero.talisman, RX, AY + 96, { font: F.mono, size: 15, color: T.tx3 });

    txt(x, '#' + c.cardId, RX, AY + 138, { font: F.mono, size: 66, weight: 800, color: T.ink });
    txt(x, 'TYPE-' + c.code + ' · ' + c.type.name, RX, AY + 222,
      { font: F.title, size: 26, weight: 700, color: T.violetInk });
    wrap(x, c.type.tag, RX, AY + 262, CW - (RX - CX) - 56, 26, { size: 18, color: T.tx2 });

    // 一句话（引用体）
    x.fillStyle = T.violetSoft;
    rr(x, RX - 14, AY + 318, CW - (RX - CX) - 42, 88, 14); x.fill();
    wrap(x, '“' + hero.line + '”', RX, AY + 332, CW - (RX - CX) - 70, 24, { size: 15, color: T.violetInk });

    // 数据行
    const DY = AY + AH + 34;
    const stats = [
      ['BINARY', c.bits.join('')],
      ['置位', c.pc + '/10'],
      ['bug 体质', String(c.bug)],
      ['掉发指数', String(c.hair)],
      ['装备', c.egg]
    ];
    stats.forEach((s, i) => {
      const X = CX + 40 + i * 186;
      txt(x, s[0], X, DY, { font: F.mono, size: 12, color: T.tx3, spacing: '2px' });
      txt(x, s[1], X, DY + 22, { font: F.mono, size: 22, weight: 700, color: T.ink });
    });

    // 四维条
    const BY = DY + 78;
    c.dims.forEach((d, i) => {
      const yy = BY + i * 42;
      txt(x, d.label, CX + 40, yy, { size: 15, color: T.tx2 });
      x.fillStyle = T.surface3;
      rr(x, CX + 186, yy + 5, 380, 10, 5); x.fill();
      x.fillStyle = d.color;
      rr(x, CX + 186, yy + 5, 380 * (d.tie ? .5 : d.lv), 10, 5); x.fill();
      txt(x, d.tie ? '1:1 平' : (d.lv ? d.high : d.low), CX + 594, yy,
        { font: F.mono, size: 14, color: T.ink });
    });

    // 印章
    x.save();
    x.translate(CX + CW - 118, CY + CH - 96);
    x.rotate(-14 * Math.PI / 180);
    x.strokeStyle = T.magenta; x.lineWidth = 4; x.globalAlpha = .62;
    x.beginPath(); x.arc(0, 0, 60, 0, Math.PI * 2); x.stroke();
    x.restore();
    x.save();
    x.translate(CX + CW - 118, CY + CH - 96);
    x.rotate(-14 * Math.PI / 180);
    x.globalAlpha = .8;
    txt(x, '1024', 0, -18, { font: F.title, size: 23, align: 'center', color: T.magentaInk });
    txt(x, '已上岗', 0, 8, { size: 13, align: 'center', color: T.magentaInk });
    x.restore();

    // 页脚
    txt(x, '#WorkBuddy  #1024程序员节', 64, h - 176, { font: F.mono, size: 19, color: T.violetInk });
    txt(x, '1024 码上好运 · 一个程序员的 1024 一日游', 64, h - 138, { size: 19, weight: 700, color: T.ink });
    txt(x, '娱乐向行为偏好自测，不构成任何预测或评价', w - 64, h - 138,
      { size: 13, color: T.tx3, align: 'right' });

    const D = APP.DATA;
    if (D && D.HERO_DISCLAIMER) {
      txt(x, D.HERO_DISCLAIMER, 64, h - 96, { size: 13, color: T.tx3 });
    }

    noise(x, w, h, .04);
    return t;
  }

  /* ---------- 导出 / 预览 ---------- */
  function slug(s) {
    const map = { 老干部守夜人: 'laoganbu', 人间润滑剂: 'runhua', 代码纪检委: 'jijian', 温柔的暴君: 'baojun',
      沉默装修工: 'zhuangxiu', 深夜包工头: 'baogongtou', 架构洁癖症: 'jiagou', 完美主义老好人: 'wanmei',
      周五勇士: 'zhouv', 嘴甜手快侠: 'zuitian', 赛博嘴替: 'saiBo', 气氛组组长: 'qifen',
      混沌工程师: 'hundun', 永动小马达: 'yongdong', 破坏性创新者: 'poHuai', 六边形战士: 'liubianxing' };
    return map[s] || 'card';
  }

  function save(canvas, filename) {
    const done = (url, isBlob) => {
      const a = document.createElement('a');
      if (isBlob && 'download' in a) {
        a.href = URL.createObjectURL(url);
        a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        U.toast('已保存 ' + filename);
      } else {
        const img = document.createElement('img');
        img.src = typeof url === 'string' ? url : URL.createObjectURL(url);
        preview(img, filename);
      }
    };
    if (canvas.toBlob) {
      canvas.toBlob((b) => { if (b) done(b, true); else done(canvas.toDataURL('image/png'), true); }, 'image/png');
    } else done(canvas.toDataURL('image/png'), true);
  }

  function preview(img, filename) {
    const box = document.getElementById('cardModal');
    const holder = document.getElementById('cardModalImg');
    holder.innerHTML = '';
    holder.appendChild(img);
    box.hidden = false;
    const tip = document.getElementById('cardModalTip');
    if (tip) tip.textContent = '移动端请长按图片保存 · ' + filename;
  }

  APP.exporter = { make, rr, txt, wrap, noise, barcode, drawCert, drawBoard, drawWish, drawHistory,
                   drawPass, save, preview, slug };
})();
