/* 1024 码上好运 — 内核：状态、编号算法、路由、数据层适配器 */
(function () {
  const D = APP.DATA;

  /* ---------- 工具 ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pad = (n, w) => String(n).padStart(w, '0');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const store = {
    mem: {},
    ok: (function () { try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return true; } catch (e) { return false; } })(),
    get(k) {
      try { return this.ok ? localStorage.getItem(k) : (this.mem[k] || null); } catch (e) { return this.mem[k] || null; }
    },
    set(k, v) {
      try { this.ok ? localStorage.setItem(k, v) : (this.mem[k] = v); } catch (e) { this.mem[k] = v; }
    },
    del(k) { try { this.ok ? localStorage.removeItem(k) : delete this.mem[k]; } catch (e) { delete this.mem[k]; } }
  };

  const today = () => {
    const d = new Date(), z = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  };
  const nowHM = () => {
    const d = new Date(), z = (n) => String(n).padStart(2, '0');
    return z(d.getHours()) + ':' + z(d.getMinutes());
  };
  const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
  // 距离今天某个整点还剩多少分钟（负数表示已经过了）
  const minutesTo = (h, m) => {
    const d = new Date();
    return (h * 60 + (m || 0)) - (d.getHours() * 60 + d.getMinutes());
  };

  /* ---------- 状态 ---------- */
  const KEY = 'p1024.v2.state';
  const blank = () => ({
    v: 2,
    answers: Array(10).fill(null),
    idx: 0,
    // 答题阶段机：intro / quiz / result。只活在内存，永不落盘（见 save()）
    stage: 'intro',
    num: null,
    board: { days: {}, streak: 0, lastDay: '' },
    team: {},          // { 工号数字: { 'YYYY-MM-DD': [好事 id, ...] } }
    wishes: [],        // { text, blessing, num, ts }
    saved: [],         // 代码时光机存档 { year, title, code, hits, ts }
    cert: { name: '某某某', num: '', dept: 'INF', certId: 'fish', skin: 'red' }
  });

  let state = blank();
  try {
    const raw = store.get(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.v === 2) {
        state = Object.assign(blank(), p, { cert: Object.assign(blank().cert, p.cert || {}) });
        // 迁移：早期版本把「是否显示结果」当影子字段存了下来，
        // 导致每次点开面板都直接跳结果页。清掉它，阶段回到内存态。
        delete state.showResult;
        delete state.stage;
        state.stage = 'intro';
        state.idx = clamp(Number(state.idx) || 0, 0, 9);
        if (!Array.isArray(state.answers) || state.answers.length !== 10) state.answers = Array(10).fill(null);
      }
    }
  } catch (e) { state = blank(); }

  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        // stage 是纯 UI 状态，不写盘：刷新后必须回到 intro，绝不能自动跳结果页
        const snap = {};
        Object.keys(state).forEach((k) => { if (k !== 'stage') snap[k] = state[k]; });
        store.set(KEY, JSON.stringify(snap));
      } catch (e) {}
    }, 180);
  }

  /* ---------- 编号算法 ---------- */
  const bitsOf = () => state.answers.map((a) => (a === 1 ? 1 : a === 0 ? 0 : null));
  const numOf = (bits) => bits.reduce((acc, b) => (b == null ? acc : acc * 2 + b), 0);
  const popcount = (n) => { let c = 0; while (n) { c += n & 1; n >>>= 1; } return c; };

  function locked() {
    const bits = bitsOf();
    return bits.some((b) => b === null);
  }

  function compute() {
    const bits = bitsOf();
    if (bits.some((b) => b === null)) return null;
    const num = numOf(bits);
    const code = '' + bits[0] + bits[2] + bits[4] + bits[6];
    const dims = D.DIMS.map((d) => {
      const two = [bits[d.bits[0]], bits[d.bits[1]]];
      const sum = two[0] + two[1];
      const tie = sum === 1;
      const lv = sum === 0 ? 0 : sum === 2 ? 1 : bits[d.pilot];
      return { key: d.key, label: d.label, low: d.low, high: d.high, color: d.color, sum, tie, lv };
    });
    const lvOf = (k) => dims.find((x) => x.key === k).lv;
    const pc = popcount(num);
    const bug = clamp(Math.round(22 + 24 * lvOf('ship') + 18 * lvOf('itch') + 12 * lvOf('scope') - 14 * lvOf('crit') + 4 * (pc - 5)), 0, 100);
    const hair = clamp(Math.round(bug * 0.45 + lvOf('crit') * 22 + bits[8] * 25 + 8), 0, 100);
    const radar = [
      { k: '上线胆量', v: dims[0].tie ? 50 + (bits[0] ? 8 : -8) : dims[0].lv * 100 },
      { k: '重构冲动', v: dims[1].tie ? 50 + (bits[2] ? 8 : -8) : dims[1].lv * 100 },
      { k: '评审火力', v: dims[2].tie ? 50 + (bits[4] ? 8 : -8) : dims[2].lv * 100 },
      { k: '需求弹性', v: dims[3].tie ? 50 + (bits[6] ? 8 : -8) : dims[3].lv * 100 },
      { k: '续命强度', v: bits[8] ? 40 : 85 },
      { k: '显示适性', v: bits[9] ? 90 : 30 }
    ];
    const egg = '' + bits[8] + bits[9];
    return { bits, num, code, dims, type: D.TYPES[code], egg: D.EGGS[egg], bug, hair, radar, pc,
             cardId: pad(num, 4) };
  }

  function bugParts(c) {
    if (!c) return [];
    const lv = (k) => c.dims.find((x) => x.key === k).lv;
    return [
      { t: '基数', v: 22 }, { t: '上线' + (lv('ship') ? '莽' : '稳'), v: lv('ship') ? 24 : 0 },
      { t: '重构' + (lv('itch') ? '痒' : '忍'), v: lv('itch') ? 18 : 0 },
      { t: '需求' + (lv('scope') ? '柔' : '刚'), v: lv('scope') ? 12 : 0 },
      { t: '评审' + (lv('crit') ? '挑' : '放'), v: lv('crit') ? -14 : 0 },
      { t: '位密度 ' + c.pc + '/10', v: 4 * (c.pc - 5) }
    ];
  }
  const bugBand = (v) => v < 20 ? '铁桶' : v < 40 ? '稳当' : v < 60 ? '平均' : v < 80 ? '高危' : '传奇';
  const hairBand = (v) => v < 20 ? '发量富裕' : v < 40 ? '略有盈余' : v < 60 ? '请开始重视' : v < 80 ? '建议准备帽子' : '已进入稀疏化治理阶段';
  const rarity = (pc) => {
    const C = [1, 10, 45, 120, 210, 252, 210, 120, 45, 10, 1];
    return { count: C[pc], pct: (C[pc] / 1024 * 100).toFixed(2) };
  };

  /* ---------- 多人工号票（无后端的数据交换） ---------- */
  const b64e = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64d = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

  function myTicket() {
    const n = state.num;
    if (n == null) return '';
    const days = {};
    Object.keys(state.board.days).forEach((d) => {
      const arr = state.board.days[d];
      if (arr && arr.length) days[d] = arr.map((x) => x.id);
    });
    const w = state.wishes.slice(-3).map((x) => x.text);
    return 'G' + pad(n, 4) + '.' + b64e(JSON.stringify({ n, d: days, w }));
  }

  function mergeTicket(code) {
    const m = /^G(\d{3,4})\.([A-Za-z0-9_-]+)$/.exec((code || '').trim());
    if (!m) return { ok: false, msg: '票码格式不对，应为 G0742.xxxx 这种' };
    let payload;
    try { payload = JSON.parse(b64d(m[2])); } catch (e) { return { ok: false, msg: '票码解析失败，可能复制不全' }; }
    const n = Number(m[1]);
    state.team[n] = state.team[n] || {};
    let added = 0;
    Object.keys(payload.d || {}).forEach((day) => {
      state.team[n][day] = state.team[n][day] || [];
      (payload.d[day] || []).forEach((id) => {
        if (state.team[n][day].indexOf(id) === -1) { state.team[n][day].push(id); added++; }
      });
    });
    (payload.w || []).forEach((text) => {
      if (!state.wishes.some((x) => x.text === text && x.num === n)) {
        state.wishes.push({ text, blessing: blessFor(n, text), num: n, ts: Date.now(), fromTeam: true });
        added++;
      }
    });
    save();
    return { ok: true, msg: '已并入 #' + pad(n, 4) + ' 的 ' + added + ' 条记录', n, added };
  }

  /* ---------- 许愿（确定性祝福，不随机抽取） ---------- */
  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h;
  }
  const blessFor = (num, text) => D.BLESS[hash(String(num) + '|' + String(text)) % D.BLESS.length];

  /* ---------- 面板开关 / 路由 ---------- */
  const SCENES = ['profile', 'board', 'cert', 'time', 'wish', 'translate'];
  let openScene = null;

  function open(scene) {
    if (!SCENES.includes(scene)) return;
    close(true);
    const panel = $('#panel-' + scene);
    if (!panel) return;
    openScene = scene;
    panel.classList.add('is-open');
    document.body.classList.add('has-open');
    if (panel.scrollTo) panel.scrollTo(0, 0);
    try { history.replaceState(null, '', '#/' + scene); } catch (e) { location.hash = '#/' + scene; }
    if (APP.scenes[scene] && APP.scenes[scene].onOpen) APP.scenes[scene].onOpen();
    const btn = $('.panel__close', panel);
    if (btn) btn.focus({ preventScroll: true });
  }

  function close(silent) {
    if (!openScene) return;
    const panel = $('#panel-' + openScene);
    if (panel) panel.classList.remove('is-open');
    document.body.classList.remove('has-open');
    const prev = openScene;
    openScene = null;
    if (!silent) {
      try { history.replaceState(null, '', '#/'); } catch (e) { try { location.hash = '/'; } catch (e2) {} }
    }
    // onClose 必须无条件触发：open() 走的是 close(true)，
    // 若跟着 silent 一起跳过，切换面板后旧场景的计时器/rAF 会一直空转。
    if (APP.scenes[prev] && APP.scenes[prev].onClose) APP.scenes[prev].onClose();
  }

  function routeFromHash() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    if (SCENES.includes(h)) open(h);
  }

  /* ---------- 提示 ---------- */
  let toastTimer = null;
  function toast(msg, kind) {
    const box = $('#toast');
    if (!box) return;
    box.textContent = msg;
    box.dataset.kind = kind || 'info';
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { box.hidden = true; }, 2600);
  }

  /* ---------- 合规自检 ---------- */
  function auditBanned() {
    // 旧版只拼了 APP.DATA 的「键名」，等于没扫内容。
    // 这里序列化整份数据 + 页面可见文字；BANNED 自身要剔除，否则永远自命中。
    let data = '';
    try {
      const copy = {};
      Object.keys(APP.DATA).forEach((k) => { if (k !== 'BANNED') copy[k] = APP.DATA[k]; });
      data = JSON.stringify(copy) || '';
    } catch (e) { data = ''; }
    const txt = (document.body.innerText || '') + ' ' + data;
    const hit = D.BANNED.filter((w) => txt.indexOf(w) !== -1);
    if (hit.length && window.console) console.warn('[1024] 页面上出现敏感词，请检查文案：', hit);
    return hit;
  }

  /* ---------- 封神原型（视觉层，缺数据时优雅降级） ---------- */
  function heroOf(code) {
    return (D.HEROES && D.HEROES[code]) || D.HERO_FALLBACK;
  }

  /* ---------- 导出 ---------- */
  // stage 只变异不重建：state 是 let，APP.state 持有的是同一个对象引用，
  // 重新赋值 state 会让 APP.state 变成陈旧引用。
  function setStage(s) {
    if (s !== 'intro' && s !== 'quiz' && s !== 'result') return;
    state.stage = s;
  }

  APP.util = { $, $$, clamp, pad, esc, store, today, nowHM, dayDiff, minutesTo, save, bitsOf, numOf, popcount,
               compute, bugParts, bugBand, hairBand, rarity, hash, blessFor, b64e, b64d,
               myTicket, mergeTicket, toast, auditBanned, heroOf, setStage, SCENES };
  APP.state = state;
  APP.save = save;
  APP.open = open;
  APP.close = close;
  APP.chrome = function () {};   // 由页面注入：同步顶栏工号
  APP.scenes = APP.scenes || {};
  APP.audit = auditBanned;

  APP.boot = function () {
    if (!store.ok) toast('本机不记忆进度，刷新会清空', 'warn');
    routeFromHash();
    window.addEventListener('hashchange', routeFromHash);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
    // 面板关闭按钮 + 点击遮罩空白处关闭
    $$('.panel__close').forEach((b) => b.addEventListener('click', () => close()));
    $$('.panel').forEach((p) => {
      p.addEventListener('click', (e) => {
        if (p.classList.contains('is-open') && e.target === p) close();
      });
    });
    // 跨天时重置今日
    const d = today();
    if (state.board.lastDay && state.board.lastDay !== d) {
      if (dayDiff(state.board.lastDay, d) === 1) state.board.streak = (state.board.streak || 0) + 1;
      else if (dayDiff(state.board.lastDay, d) > 1) state.board.streak = 0;
      state.board.lastDay = d;
      save();
    }
    auditBanned();
  };
})();
