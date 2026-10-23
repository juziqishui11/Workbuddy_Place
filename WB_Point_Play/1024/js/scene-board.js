/* S0 今日好事看板：长得像告警大盘，指标全是好事
   12 条好事以垂直滚动信号流呈现，滚到某条高亮时按一下收录 */
(function () {
  const U = APP.util, D = APP.DATA, $ = U.$;
  const body = () => $('#body-board');
  const T = (k, fb) => (APP.theme && APP.theme.T && APP.theme.T[k]) || fb;

  const SHIPPED = { id: 'shipped', t: '我又上线了一次', d: '指标变红了，快去写回滚脚本', k: 'bad' };
  const ALERT = { id: 'alert', t: '又半夜报警了', d: '快去睡，明天再说', k: 'bad' };

  const SPEED = 22;          // px/s
  const HOLD_MS = 1200;      // 收录后暂停
  const SCAN_RATIO = 0.5;

  function dayList(day) { return (APP.state.board.days[day] || []); }
  function todayList() {
    const d = U.today();
    if (!APP.state.board.days[d]) APP.state.board.days[d] = [];
    return APP.state.board.days[d];
  }

  const reduceMotion = () => {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  };
  const isOpen = () => {
    const p = $('#panel-board');
    return !!(p && p.classList.contains('is-open'));
  };

  /* ---------- 信号流运行时 ---------- */
  const sig = {
    el: null, view: null, track: null, scan: null, capture: null, toggle: null,
    rowH: 0, viewH: 0, off: 0, cur: -1,
    raf: 0, last: 0, running: false,
    holds: 0, holdUntil: 0, userPaused: false
  };
  let clockTimer = 0;

  function rows() { return sig.track ? Array.prototype.slice.call(sig.track.children) : []; }

  function measure() {
    const rs = rows();
    let h = 0;
    if (rs.length) {
      try { h = rs[0].getBoundingClientRect().height; } catch (e) { h = 0; }
      if (!h) h = rs[0].offsetHeight || 0;
    }
    sig.rowH = h || (isOpen() ? 58 : 40);
    let vh = 0;
    if (sig.view) vh = sig.view.clientHeight || 0;
    sig.viewH = vh || (isOpen() ? 280 : 104);
  }

  function scanY() { return sig.viewH * SCAN_RATIO; }

  function apply() {
    if (!sig.track) return;
    const total = 12 * sig.rowH;
    if (total > 0) {
      while (sig.off >= total) sig.off -= total;
      while (sig.off < 0) sig.off += total;
    }
    sig.track.style.transform = 'translate3d(0,' + (-sig.off) + 'px,0)';

    const raw = Math.floor((sig.off + scanY()) / sig.rowH);
    // 扫描线贴着当前行的顶边，绝不打在文字中间（否则像删除线）
    if (sig.scan) sig.scan.style.transform = 'translate3d(0,' + (raw * sig.rowH - sig.off) + 'px,0)';

    const next = ((raw % 12) + 12) % 12;
    if (next !== sig.cur) { sig.cur = next; syncCur(); }
  }

  function syncCur() {
    rows().forEach((r) => {
      const on = Number(r.dataset.pos) % 12 === sig.cur;
      if (on) r.classList.add('is-cur'); else r.classList.remove('is-cur');
    });
    if (sig.capture) {
      const g = D.GOODTHINGS[sig.cur] || D.GOODTHINGS[0];
      const done = todayList().some((x) => x.id === g.id);
      sig.capture.textContent = (done ? '已收录 · ' : '收录 · ') + g.t;
      sig.capture.setAttribute('aria-label', '收录当前高亮的好事：' + g.t);
    }
  }

  function syncStates() {
    const list = todayList();
    rows().forEach((r) => {
      const on = list.some((x) => x.id === r.dataset.add);
      if (on) r.classList.add('is-on'); else r.classList.remove('is-on');
    });
    syncCur();
  }

  function frame(now) {
    if (!sig.running) return;
    const dt = Math.min(64, Math.max(0, now - sig.last));
    sig.last = now;
    const held = sig.userPaused || sig.holds > 0 || now < sig.holdUntil;
    if (!held) {
      sig.off += SPEED * dt / 1000;
      apply();
    }
    sig.raf = requestAnimationFrame(frame);
  }

  function start() {
    if (sig.running || reduceMotion() || !sig.track) return;
    sig.running = true;
    sig.last = (window.performance && performance.now) ? performance.now() : Date.now();
    sig.raf = requestAnimationFrame(frame);
    if (sig.toggle) sig.toggle.textContent = sig.userPaused ? '继续' : '暂停';
  }

  function stop() {
    sig.running = false;
    if (sig.raf) cancelAnimationFrame(sig.raf);
    sig.raf = 0;
    if (sig.track) sig.track.style.transform = '';
    sig.off = 0;
    sig.cur = -1;
  }

  function mount() {
    sig.el = $('#boardSignal');
    sig.view = $('#sigView');
    sig.track = $('#sigTrack');
    sig.scan = $('#sigScan');
    sig.capture = $('#sigCapture');
    sig.toggle = $('#sigToggle');
    sig.off = 0; sig.cur = -1;

    if (!sig.el || !sig.track) return;

    // 「距下班」要跟着表走：半分钟刷一次就够，不必每帧
    clearInterval(clockTimer);
    clockTimer = setInterval(function () { paintMetrics(); drawChart(); }, 30000);

    if (reduceMotion()) {
      sig.el.classList.add('signal--static');
      stop();
      measure();
      syncCur();
      return;
    }

    sig.el.classList.remove('signal--static');
    if (isOpen()) {
      // 等 popin 动画与布局稳定后再量行高
      requestAnimationFrame(() => requestAnimationFrame(() => {
        measure(); apply(); start();
      }));
      setTimeout(() => { if (sig.running) { measure(); apply(); } }, 260);
    } else {
      stop();
      measure();
      apply();
    }
  }

  function unmount() {
    stop();
    clearInterval(clockTimer);
    clockTimer = 0;
    sig.el = sig.view = sig.track = sig.scan = sig.capture = sig.toggle = null;
  }

  function hold() { sig.holdUntil = Date.now() + HOLD_MS; }

  function captureCur() {
    const g = D.GOODTHINGS[sig.cur];
    if (!g) return;
    add(g.id);
  }

  /* ---------- 数据 ---------- */
  const COIN = {};
  D.GOODTHINGS.forEach((g) => { COIN[g.id] = g.coin || 0; });
  const coinOf = (id) => COIN[id] || 0;

  function teamToday() {
    return Object.keys(APP.state.team).reduce((a, n) => {
      return a + ((APP.state.team[n] || {})[U.today()] || []).length;
    }, 0);
  }

  function add(id) {
    const d = U.today();
    const list = todayList();
    if (list.some((x) => x.id === id)) {
      if (id === 'shipped' || id === 'alert') { list.push({ id: id, ts: Date.now() }); }
      else { U.toast('这件好事已经记过了'); return; }
    } else list.push({ id: id, ts: Date.now() });
    APP.state.board.lastDay = d;
    if (!APP.state.board.streak) APP.state.board.streak = 1;
    U.save();
    // 局部刷新：整块 render 会把信号流的滚动位置打回顶部
    refreshLive();
    hold();
    const item = D.GOODTHINGS.find((g) => g.id === id) || SHIPPED;
    U.toast('已记下：' + item.t);
  }

  function removeAt(idx) {
    const list = todayList();
    list.splice(idx, 1);
    U.save();
    refreshLive();
  }

  /* 四张卡只做好事，一张都不扎心：
     距下班 / 今日奖金池 / 今日好事 / 连续打卡 */
  function metrics() {
    const list = todayList();
    const mine = list.filter((x) => x.id !== 'shipped' && x.id !== 'alert');
    const teamN = teamToday();
    const coin = list.reduce((a, x) => a + coinOf(x.id), 0);
    const streak = APP.state.board.streak || 0;

    // 距下班：以 18:30 为界
    const m = U.minutesTo(18, 30);
    let offV, offS;
    if (m > 0) {
      const hh = Math.floor(m / 60), mm = m % 60;
      offV = (hh ? hh + 'h ' : '') + mm + 'm';
      offS = '18:30 关电脑';
    } else {
      const over = -m;
      const hh = Math.floor(over / 60), mm = over % 60;
      offV = '已下班';
      offS = '多待了 ' + (hh ? hh + 'h ' : '') + mm + 'm';
    }

    return [
      { k: '距下班', v: offV, sub: offS, c: 'violet' },
      { k: '今日奖金池', v: '¥' + coin, sub: coin ? '每件好事折算' : '还没开张', c: 'lemon' },
      { k: '今日好事', v: String(mine.length + teamN), sub: teamN ? '件 · 含同事 ' + teamN : '件', c: 'mint' },
      { k: '连续打卡', v: String(streak), sub: '天', c: 'cyan' }
    ];
  }

  function metricHTML() {
    return metrics().map((m) => '<div class="metric" data-c="' + m.c + '">'
      + '<div class="metric__k">' + m.k + '</div>'
      + '<div class="metric__v">' + m.v + '</div>'
      + '<div class="metric__s">' + m.sub + '</div></div>').join('');
  }

  // 反向指标不放 KPI 里，收成一行小标签：零的时候是绿的，破零才变红
  function chipsHTML() {
    const list = todayList();
    const shipped = list.filter((x) => x.id === 'shipped').length;
    const alert = list.filter((x) => x.id === 'alert').length;
    const zeroChange = list.some((x) => x.id === 'nochange');
    const chip = (k, v, bad) => '<span class="bchip' + (bad ? ' is-bad' : '') + '">' + k + ' <b>' + v + '</b></span>';
    return '<div class="board-chips">'
      + chip('今日上线', shipped + ' 次', shipped > 0)
      + chip('半夜告警', alert + ' 条', alert > 0)
      + chip('生产变更', zeroChange ? '0 次' : '待确认', !zeroChange)
      + '</div>';
  }

  function weekCells() {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const z = (n) => String(n).padStart(2, '0');
      const key = d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
      const n = dayList(key).length;
      out.push(n === 0 ? 0 : n <= 1 ? 1 : n <= 3 ? 2 : 3);
    }
    return out;
  }

  function feed() {
    const rows2 = [];
    todayList().forEach((x, i) => {
      const g = D.GOODTHINGS.find((y) => y.id === x.id) || (x.id === 'shipped' ? SHIPPED : ALERT);
      const t = new Date(x.ts);
      rows2.push({ ts: x.ts, time: String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'),
        label: g.t, who: APP.state.num != null ? '#' + U.pad(APP.state.num, 4) : '#----', idx: i, bad: g.k === 'bad' });
    });
    const tkey = U.today();
    Object.keys(APP.state.team).forEach((n) => {
      const ids = (APP.state.team[n] || {})[tkey] || [];
      ids.forEach((id) => {
        const g = D.GOODTHINGS.find((y) => y.id === id);
        if (g) rows2.push({ ts: 0, time: '--:--', label: g.t, who: '#' + U.pad(n, 4), idx: -1, bad: false });
      });
    });
    rows2.sort((a, b) => b.ts - a.ts);
    if (!rows2.length) return '<div class="feed__empty">还没有记录。滚到哪条，按一下就记一条。</div>';
    return rows2.map((r) =>
      '<div class="feed__i"><span class="feed__t">' + r.time + '</span>'
      + '<span class="feed__w">' + r.who + '</span>'
      + '<span class="feed__x"' + (r.bad ? ' data-bad="1"' : '') + '>' + U.esc(r.label) + '</span>'
      + (r.idx >= 0 ? '<button class="btn btn--sm btn--ghost feed__del" data-del="' + r.idx + '" title="删掉这条">×</button>' : '')
      + '</div>').join('')
      + '<div class="feed__end">今天到此为止 · 明天零点清空</div>';
  }

  function summaryText() {
    const list = todayList();
    const teamN = Object.keys(APP.state.team).reduce((a, n) => a + ((APP.state.team[n] || {})[U.today()] || []).length, 0);
    if (!list.length && !teamN) return '今天还没有记录。好消息往往很小，记下来才算数。';
    const good = list.filter((x) => x.id !== 'shipped' && x.id !== 'alert');
    const bad = list.filter((x) => x.id === 'shipped' || x.id === 'alert');
    const parts = [];
    if (good.length) {
      const first = D.GOODTHINGS.find((g) => g.id === good[0].id);
      parts.push('今天最值得说的一件：' + (first ? first.t : '—'));
    }
    if (bad.length) parts.push('另有 ' + bad.length + ' 件不太顺的事，也已经记下了');
    if (teamN) parts.push('大盘上还有同事的 ' + teamN + ' 件');
    parts.push('连续打卡 ' + (APP.state.board.streak || 0) + ' 天');
    return parts.join('。') + '。';
  }

  function bdsInner() {
    return '<div class="bds__k">[ 今日小结 ]</div>'
      + '<div class="bds__n">' + todayList().length + ' <small>件好事</small></div>'
      + '<div class="bds__t">' + summaryText() + '</div>';
  }

  /* ---------- 渲染 ---------- */
  function sigRows() {
    const one = reduceMotion() ? 1 : 2;
    let h = '';
    for (let k = 0; k < one; k++) {
      D.GOODTHINGS.forEach((g, i) => {
        h += '<div class="sig" role="listitem" data-add="' + g.id + '" data-pos="' + (k * 12 + i) + '">'
          + '<span class="sig__i">' + String(i + 1).padStart(2, '0') + '</span>'
          + '<span class="sig__t">' + U.esc(g.t) + '</span>'
          + '<span class="sig__d">' + U.esc(g.d) + '</span>'
          + '<span class="sig__ok" aria-hidden="true">✓</span>'
          + '</div>';
      });
    }
    return h;
  }

  function signalBox() {
    return '<div class="signal" id="boardSignal" role="list" tabindex="0" aria-label="今日好事滚动信号流">'
      + '<div class="signal__view" id="sigView">'
      + '<div class="signal__track" id="sigTrack">' + sigRows() + '</div>'
      + '<div class="signal__scan" id="sigScan" aria-hidden="true"></div>'
      + '</div>'
      + '<div class="signal__foot">'
      + '<button class="btn btn--sm btn--main" type="button" id="sigCapture" data-act="capture">收录 · —</button>'
      + '<button class="btn btn--sm btn--ghost" type="button" id="sigToggle" data-act="toggle-play">暂停</button>'
      + '<span class="signal__hint" id="sigHint">空格收录当前条</span>'
      + '</div>'
      + '</div>';
  }

  function render() {
    const box = body();
    if (!box) return;
    unmount();
    const wc = weekCells();

    box.innerHTML = ''
      + '<div class="bd">'
      + '<div class="bd__l">'
      + '<div class="board-metrics">' + metricHTML() + '</div>'

      + '<canvas class="board-chart" id="boardChart" aria-label="今日好事累计曲线"></canvas>'
      + chipsHTML()

      + '<div class="row row--tight">'
      + '<span class="note">不太顺也能记：</span>'
      + '<button class="btn btn--sm btn--ghost btn--bad" data-add="shipped">我又上线了</button>'
      + '<button class="btn btn--sm btn--ghost btn--bad" data-add="alert">又报警了</button>'
      + '</div>'

      + signalBox()
      + '<div class="bds">' + bdsInner() + '</div>'
      + '</div>'

      + '<div class="bd__r">'
      + '<div class="feed" id="boardFeed">' + feed() + '</div>'

      + '<div class="row row--streak">'
      + '<div class="streak">' + wc.map((n) => '<i class="streak__c" data-n="' + n + '"></i>').join('')
      + '<span class="streak__l">近 7 日 · 连续 ' + (APP.state.board.streak || 0) + ' 天</span></div>'
      + '</div>'

      + '<div class="only-open">'
      + '<div class="ticket">'
      + '<input class="input" id="ticketIn" placeholder="粘贴同事的好事票 G0742.xxxx">'
      + '<button class="btn btn--sm btn--lemon" data-act="merge">并入</button>'
      + '<button class="btn btn--sm" data-act="my-ticket">我的票</button>'
      + '</div>'
      + '<div class="row" style="margin-top:8px">'
      + '<button class="btn btn--main" data-act="export">生成今日好事板长图</button>'
      + '<span class="note">本机记录，不上传</span></div>'
      + '</div>'
      + '</div>'
      + '</div>';

    if (!box.dataset.bound) {
      box.dataset.bound = '1';
      box.addEventListener('click', onClick);
      box.addEventListener('mouseover', onOver);
      box.addEventListener('mouseout', onOut);
      box.addEventListener('keydown', onKey);
      // 图表 hover 走委托：canvas 每次 render 都会被重建，直接绑会丢
      box.addEventListener('mousemove', onChartMove);
      box.addEventListener('mouseleave', function () {
        if (hoverH !== -1) { hoverH = -1; drawChart(); }
      });
    }

    requestAnimationFrame(drawChart);
    setTimeout(drawChart, 220);
    mount();
    syncStates();
  }

  /* 只重画四张卡与标签行（倒计时用） */
  function paintMetrics() {
    const box = body();
    if (!box) return;
    const mb = box.querySelector('.board-metrics');
    if (mb) mb.innerHTML = metricHTML();
    const ch = box.querySelector('.board-chips');
    if (ch) ch.innerHTML = chipsHTML();
  }

  /* 局部刷新：只更新会变的部分，保住信号流滚动位置 */
  function refreshLive() {
    const box = body();
    if (!box) return;
    if (!sig.track) { render(); return; }

    paintMetrics();
    const fb = $('#boardFeed');
    if (fb) fb.innerHTML = feed();
    const bds = box.querySelector('.bds');
    if (bds) bds.innerHTML = bdsInner();
    const st = box.querySelector('.streak');
    if (st) {
      const wc = weekCells();
      st.innerHTML = wc.map((n) => '<i class="streak__c" data-n="' + n + '"></i>').join('')
        + '<span class="streak__l">近 7 日 · 连续 ' + (APP.state.board.streak || 0) + ' 天</span>';
    }
    syncStates();
    drawChart();
  }

  /* 00:00–23:00 的好事累计曲线：每记一件，曲线往上跳一格。
     只累计好事，上线/告警不计入这条线（它们在下面的小标签里）。 */
  const CH_FROM = 0, CH_TO = 23, CH_N = CH_TO - CH_FROM + 1;
  const CH_TICKS = [6, 9, 12, 15, 18, 21];
  let hoverH = -1;

  function cumSeries(list) {
    const bins = new Array(CH_N).fill(0);
    list.forEach((x) => {
      if (x.id === 'shipped' || x.id === 'alert') return;
      const h = new Date(x.ts).getHours();
      bins[Math.max(0, Math.min(CH_N - 1, h - CH_FROM))] += 1;
    });
    let acc = 0;
    return bins.map((v) => (acc += v));
  }

  function drawChart() {
    const cv = $('#boardChart');
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // 高度读 CSS 算出来的真实值：写死 72 会让展开态被拉伸模糊
    const w = cv.clientWidth || 400;
    const h = cv.clientHeight || 96;
    const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
    const x = cv.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, w, h);

    const padL = 8, padR = 8, padT = 18, padB = 15;
    const iw = Math.max(1, w - padL - padR);
    const ih = Math.max(1, h - padT - padB);
    const cum = cumSeries(todayList());
    const total = cum[CH_N - 1] || 0;
    const max = Math.max(2, total);
    // 只画到「现在」为止：右边留给还没到的时段，别把未来的空白也涂成累计值
    const nowH = new Date().getHours();
    const nowIdx = Math.max(0, Math.min(CH_N - 1, nowH - CH_FROM));

    const px = (i) => padL + iw * i / (CH_N - 1);
    const py = (v) => padT + ih - ih * (v / max);

    const VIOLET = T('violet', '#6C4CF1');
    const MINT = T('mint', '#2FE0B0');
    const TX3 = T('tx3', '#6F6788');

    function axis() {
      x.font = '10px ui-monospace,Menlo,monospace';
      x.fillStyle = TX3;
      x.textAlign = 'center';
      CH_TICKS.forEach((hh) => {
        x.fillText(hh + ':00', px(hh - CH_FROM), h - 3);
      });
      x.textAlign = 'left';
      if (total) {
        x.fillStyle = T('tx3', '#6F6788');
        x.fillText('累计 ' + total + ' 件', padL, 11);
      }
    }

    // 横向参考线
    x.strokeStyle = 'rgba(25,20,40,.07)';
    x.lineWidth = 1;
    for (let i = 0; i <= 2; i++) {
      const y = padT + ih * i / 2;
      x.beginPath(); x.moveTo(padL, y); x.lineTo(w - padR, y); x.stroke();
    }

    if (!total) {
      x.save();
      x.strokeStyle = 'rgba(108,76,241,.32)';
      x.setLineDash([4, 5]);
      x.beginPath(); x.moveTo(padL, py(0)); x.lineTo(w - padR, py(0)); x.stroke();
      x.restore();
      x.fillStyle = 'rgba(25,20,40,.42)';
      x.font = '11px system-ui,sans-serif';
      x.textAlign = 'center';
      x.fillText('今天还是 0 件，滚到下面收录一条', w / 2, py(0) - 10);
      x.textAlign = 'left';
      axis();
      return;
    }

    // 还没到的时段压一层浅色，说明曲线只画到此刻为止
    const fz = px(nowIdx);
    if (fz < w - padR - 2) {
      x.fillStyle = 'rgba(25,20,40,.028)';
      x.fillRect(fz, padT, w - padR - fz, ih);
      x.fillStyle = 'rgba(25,20,40,.30)';
      x.font = '10px system-ui,sans-serif';
      x.textAlign = 'left';
      x.fillText('还没到', fz + 6, padT + 12);
      x.textAlign = 'left';
    }

    // 阶梯线：同一小时内先横着走，再往上跳；到此刻为止
    x.beginPath();
    x.moveTo(px(0), py(cum[0]));
    for (let i = 1; i <= nowIdx; i++) {
      x.lineTo(px(i), py(cum[i - 1]));
      x.lineTo(px(i), py(cum[i]));
    }
    x.strokeStyle = VIOLET;
    x.lineWidth = 1.8;
    x.lineJoin = 'round';
    x.stroke();

    // 面积
    x.lineTo(px(nowIdx), py(0));
    x.lineTo(px(0), py(0));
    x.closePath();
    const g = x.createLinearGradient(0, padT, 0, py(0));
    g.addColorStop(0, 'rgba(108,76,241,.22)');
    g.addColorStop(1, 'rgba(108,76,241,0)');
    x.fillStyle = g;
    x.fill();

    // hover：竖直参考线 + 一个数值气泡
    if (hoverH >= 0 && hoverH < CH_N) {
      const hx = px(hoverH);
      x.save();
      x.strokeStyle = 'rgba(25,20,40,.22)';
      x.setLineDash([3, 3]);
      x.beginPath(); x.moveTo(hx, padT - 2); x.lineTo(hx, py(0)); x.stroke();
      x.restore();
      const txt = (CH_FROM + hoverH) + ':00 · 累计 ' + cum[hoverH] + ' 件';
      x.font = '10px ui-monospace,Menlo,monospace';
      const tw = x.measureText(txt).width;
      let bx = hx - tw / 2 - 6;
      bx = Math.max(2, Math.min(w - tw - 14, bx));
      x.fillStyle = 'rgba(25,20,40,.86)';
      x.beginPath();
      if (x.roundRect) x.roundRect(bx, 2, tw + 12, 16, 4); else x.rect(bx, 2, tw + 12, 16);
      x.fill();
      x.fillStyle = '#fff';
      x.textAlign = 'left';
      x.fillText(txt, bx + 6, 13);
    }

    // 当前时刻
    {
      const cx = px(nowIdx);
      const cy = py(cum[nowIdx]);
      x.save();
      x.strokeStyle = 'rgba(108,76,241,.40)';
      x.setLineDash([3, 4]);
      x.beginPath(); x.moveTo(cx, padT - 2); x.lineTo(cx, py(0)); x.stroke();
      x.restore();
      x.beginPath(); x.arc(cx, cy, 3.4, 0, Math.PI * 2);
      x.fillStyle = MINT; x.fill();
      x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.stroke();
    }

    axis();
  }

  /* ---------- 交互 ---------- */
  function onChartMove(e) {
    const cv = e.target;
    if (!cv || cv.id !== 'boardChart') return;
    const r = cv.getBoundingClientRect();
    const padL = 8, padR = 8;
    const iw = Math.max(1, r.width - padL - padR);
    const i = Math.round(((e.clientX - r.left - padL) / iw) * (CH_N - 1));
    const nowIdx = Math.max(0, Math.min(CH_N - 1, new Date().getHours() - CH_FROM));
    const v = Math.max(0, Math.min(nowIdx, i));
    if (v !== hoverH) { hoverH = v; drawChart(); }
  }

  function onOver(e) {
    const t = e.target.closest('.signal, .signal__foot');
    if (t) sig.holds = Math.max(sig.holds, 1);
  }
  function onOut(e) {
    const t = e.target.closest('.signal, .signal__foot');
    if (t && !(e.relatedTarget && t.contains(e.relatedTarget))) sig.holds = 0;
  }

  function onKey(e) {
    if (e.target !== sig.el) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); captureCur(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!sig.rowH) return;
      sig.off += (e.key === 'ArrowDown' ? 1 : -1) * sig.rowH;
      apply();
    }
  }

  function onClick(e) {
    const del = e.target.closest('[data-del]');
    if (del) { removeAt(Number(del.dataset.del)); return; }

    const addBtn = e.target.closest('[data-add]');
    if (addBtn) { add(addBtn.dataset.add); return; }

    const act = e.target.closest('[data-act]');
    if (!act) return;
    const a = act.dataset.act;

    if (a === 'capture') { captureCur(); return; }
    if (a === 'toggle-play') {
      sig.userPaused = !sig.userPaused;
      act.textContent = sig.userPaused ? '继续' : '暂停';
      if (!sig.userPaused && !sig.running && !reduceMotion()) start();
      return;
    }
    if (a === 'merge') {
      const v = ($('#ticketIn') || {}).value || '';
      const r = U.mergeTicket(v);
      U.toast(r.msg, r.ok ? 'info' : 'warn');
      if (r.ok) { $('#ticketIn').value = ''; render(); }
      return;
    }
    if (a === 'my-ticket') {
      const t = U.myTicket();
      if (!t) { U.toast('先去「我的程序员设」领个工号', 'warn'); return; }
      const inp = $('#ticketIn');
      if (inp) { inp.value = t; inp.select(); }
      try { navigator.clipboard.writeText(t); U.toast('票码已复制，发给同事让他们并入'); }
      catch (err) { U.toast('票码已填在输入框，手动复制'); }
      return;
    }
    if (a === 'export') exportBoard();
  }

  function exportBoard() {
    const ms = metrics();
    const list = todayList().slice().sort((a, b) => a.ts - b.ts);
    const items = list.map((x) => {
      const g = D.GOODTHINGS.find((y) => y.id === x.id) || (x.id === 'shipped' ? SHIPPED : ALERT);
      const t = new Date(x.ts);
      return { time: String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'), label: g.t };
    });
    const teamItems = [];
    Object.keys(APP.state.team).forEach((n) => {
      ((APP.state.team[n] || {})[U.today()] || []).forEach((id) => {
        const g = D.GOODTHINGS.find((y) => y.id === id);
        if (g) teamItems.push({ time: '#' + U.pad(n, 4), label: g.t });
      });
    });
    const cum = cumSeries(list);

    const cv = APP.exporter.drawBoard({
      date: U.today(),
      no: APP.state.num != null ? U.pad(APP.state.num, 4) : '----',
      metrics: ms,
      items: items.concat(teamItems),
      cum: cum,
      cumMax: Math.max(2, cum[cum.length - 1] || 0),
      streak: APP.state.board.streak || 0,
      week: weekCells().map((n) => (n ? 1 : 0))
    });
    APP.exporter.save(cv, '1024-gooddays-' + U.today() + '.png');
  }

  APP.scenes.board = {
    render,
    refresh: function () {
      // 外部（如领号后同步工号）触发时重建，重建后重新挂载并尽量停在原位置
      const keep = sig.off;
      render();
      if (sig.track && keep) { sig.off = keep; apply(); }
    },
    onOpen() {
      render();
      const hint = $('#sigHint');
      if (hint) hint.textContent = reduceMotion() ? '点击任一条收录' : '空格收录当前条';
    },
    onClose() { unmount(); }
  };

  window.__boardStream = {
    tick: function (px) { sig.off += Number(px) || 0; apply(); return sig.cur; },
    index: function () { return sig.cur; },
    offset: function () { return sig.off; },
    running: function () { return sig.running; },
    pause: function (v) { sig.userPaused = !!v; },
    capture: captureCur
  };

  window.addEventListener('resize', function () {
    if ($('#boardChart')) drawChart();
    if (sig.track && isOpen()) { measure(); apply(); }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (sig.running) { sig.running = false; if (sig.raf) cancelAnimationFrame(sig.raf); sig.raf = 0; } }
    else if (sig.track && isOpen() && !sig.userPaused && !reduceMotion() && !sig.running) start();
  });
})();
