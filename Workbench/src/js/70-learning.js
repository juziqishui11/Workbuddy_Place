/* ============================================================
   70-learning.js —— FDE 学习
     子页 1：FDE-90天学习（数据来自 71-fde-data.js，可用本地文件重新同步）
     子页 2：AI知识练习（题库来自 72-quiz-data.js，练习引擎/渲染在本文件第三、四节）
   ============================================================ */

/* ---------------- 子页 1 状态 ---------------- */
var FDE_TAB = 'timeline';      // timeline | glossary | exercises | checklist
var FDE_OPEN_WEEK = 0;         // 展开的周号，0 = 全收起
var FDE_OPEN_DAY = 0;          // 展开的天号，0 = 全收起
var FDE_G_Q = '';              // 概念词典搜索
var FDE_G_CAT = 'all';         // 概念词典分类
var FDE_EX_LVL = 'all';        // 题库难度
var FDE_EX_W = 'all';          // 题库周次

/* 子页 2 状态 */
var QUIZ_PICK = ['llm'];       // 已选知识点
var QUIZ_SIZE = 10;            // 10 | 20 | 0(全部)
var QUIZ_SESSION = null;       // { qs, ans, i, startedAt, sec }
var QUIZ_RESULT = null;        // 交卷后的结果对象
var QUIZ_WRONG_ONLY = false;   // 是否只看错题本
var QUIZ_TIMER = null;

ROUTES['learning/90day'] = {
  title: 'FDE 90 天学习',
  desc: '12 周 / 90 天：每日步骤 · 概念卡 · 代码 · 练习 · 自测，进度计入首页与复盘',
  render: renderFde90
};
ROUTES['learning/quiz'] = {
  title: 'AI 知识练习',
  desc: '10 个知识点 · 150 题：选择题 + 判断题，记录分数与错题本',
  render: renderQuiz
};

/* ============================================================
   一、FDE 90 天 —— 数据助手
   ============================================================ */
function fdeOk() { return !!(window.FDE_DATA && FDE_DATA.weeks && FDE_DATA.weeks.length); }

function fdeAllDays() {
  if (!fdeOk()) return [];
  var out = [];
  FDE_DATA.weeks.forEach(function (w) {
    (w.days || []).forEach(function (d) {
      var o = {};
      for (var k in d) o[k] = d[k];
      o.week = w.w; o.theme = w.theme; o.color = w.color;
      out.push(o);
    });
  });
  return out;
}
function fdeTotalDays() { return fdeAllDays().length; }
function fdeMap() { return (S.fdeDays && typeof S.fdeDays === 'object' && !Array.isArray(S.fdeDays)) ? S.fdeDays : {}; }
function fdeDone(n) { return !!fdeMap()[String(n)]; }
function fdeDoneCount() {
  var m = fdeMap(), n = 0;
  for (var k in m) if (m[k]) n++;
  return n;
}
function fdePct() {
  var t = fdeTotalDays();
  return t ? Math.round(fdeDoneCount() / t * 100) : 0;
}
function fdeDoneMinutes() {
  var m = fdeMap(), sum = 0;
  fdeAllDays().forEach(function (d) { if (m[String(d.d)]) sum += (d.min || 0); });
  return sum;
}
/* 本周（按周号）完成度 */
function fdeWeekDone(w) {
  var m = fdeMap(), n = 0;
  (w.days || []).forEach(function (d) { if (m[String(d.d)]) n++; });
  return n;
}
function fdePhaseDone(ph) {
  /* 按阶段取周：phases 3 段 → W1-4 / W5-8 / W9-12 */
  var idx = FDE_DATA.phases.indexOf(ph);
  var lo = idx * 4 + 1, hi = lo + 3;
  var m = fdeMap(), done = 0, total = 0;
  FDE_DATA.weeks.forEach(function (w) {
    if (w.w < lo || w.w > hi) return;
    (w.days || []).forEach(function (d) { total++; if (m[String(d.d)]) done++; });
  });
  return { done: done, total: total, pct: total ? Math.round(done / total * 100) : 0 };
}
/* 学习活跃日（用于连续天数） */
function fdeActiveDates() {
  var m = fdeMap(), set = {};
  for (var k in m) {
    var at = m[k] && m[k].at;
    if (at) set[String(at).slice(0, 10)] = true;
  }
  return Object.keys(set).sort();
}
function fdeStreak() {
  var dates = fdeActiveDates();
  if (!dates.length) return 0;
  var set = {};
  dates.forEach(function (d) { set[d] = true; });
  var cur = dOff(0), n = 0;
  if (!set[cur]) {
    cur = dOff(-1);
    if (!set[cur]) return 0;
  }
  while (set[cur]) { n++; cur = dOff(-(n)); }
  return n;
}
function fdeLongestStreak() {
  var dates = fdeActiveDates();
  if (!dates.length) return 0;
  var best = 1, run = 1;
  for (var i = 1; i < dates.length; i++) {
    var prev = new Date(dates[i - 1] + 'T00:00:00');
    var now = new Date(dates[i] + 'T00:00:00');
    var gap = Math.round((now - prev) / 86400000);
    run = (gap === 1) ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}
/* 当前第几天：按第一个勾选日 / 起始日推算 */
function fdeCurrentDay() {
  var dates = fdeActiveDates();
  if (dates.length) {
    var d = Math.floor((new Date(dOff(0) + 'T00:00:00') - new Date(dates[0] + 'T00:00:00')) / 86400000) + 1;
    return Math.max(1, Math.min(fdeTotalDays(), d));
  }
  return 1;
}
function fdeToggleDay(n) {
  var m = fdeMap(), k = String(n);
  if (m[k]) delete m[k];
  else m[k] = { at: nowISO() };
  S.fdeDays = m;
  commit(); rerender();
}
function fdeToggleWeek(w) {
  var m = fdeMap(), allDone = true;
  (w.days || []).forEach(function (d) { if (!m[String(d.d)]) allDone = false; });
  (w.days || []).forEach(function (d) {
    if (allDone) delete m[String(d.d)];
    else m[String(d.d)] = m[String(d.d)] || { at: nowISO() };
  });
  S.fdeDays = m;
  commit(); rerender();
  toast(allDone ? '已取消第 ' + w.w + ' 周全部勾选' : '已勾选第 ' + w.w + ' 周（' + (w.days || []).length + ' 天）', 'ok');
}

/* ============================================================
   二、FDE 90 天 —— 渲染
   ============================================================ */
function renderFde90(el) {
  if (!fdeOk()) {
    el.innerHTML = '<div class="card">' + emptyBox('◈', '还没有同步 90 天计划数据', '点下面按钮选择本地的 fde-90day-plan.html，导入后即可离线使用') +
      fdeSyncBar() + '</div>';
    return;
  }
  var html = '';
  html += fdeKpiHTML();
  html += fdePhaseHTML();
  html += fdeTabHTML();
  if (FDE_TAB === 'timeline') html += fdeTimelineHTML();
  else if (FDE_TAB === 'glossary') html += fdeGlossaryHTML();
  else if (FDE_TAB === 'exercises') html += fdeExercisesHTML();
  else html += fdeChecklistHTML();
  html += fdeSyncBar();
  el.innerHTML = html;
  /* 概念词典搜索框：回车 / 失焦后生效 */
  var gq = el.querySelector('#fde-gq');
  if (gq) {
    gq.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); FDE_G_Q = gq.value; rerender(); } });
    gq.addEventListener('blur', function () { if (gq.value !== FDE_G_Q) { FDE_G_Q = gq.value; rerender(); } });
  }
}

/* 选择本地 fde-90day-plan.html 重新同步 */
function fdePickFile() {
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.html,text/html';
  inp.style.position = 'fixed';
  inp.style.left = '-9999px';
  document.body.appendChild(inp);
  inp.addEventListener('change', function () {
    var f = inp.files && inp.files[0];
    if (!f) { inp.remove(); return; }
    var fr = new FileReader();
    fr.onload = function () { fdeApplySync(String(fr.result || ''), f.name); inp.remove(); };
    fr.onerror = function () { toast('读取文件失败', 'error'); inp.remove(); };
    fr.readAsText(f, 'utf-8');
  });
  inp.click();
}

function fdeKpiHTML() {
  var total = fdeTotalDays(), done = fdeDoneCount(), pct = fdePct();
  var mins = fdeDoneMinutes();
  var hours = Math.round(mins / 60 * 10) / 10;
  var streak = fdeStreak(), best = fdeLongestStreak();
  var curD = fdeCurrentDay();
  var curW = Math.min(12, Math.ceil(curD / 7.5));
  function card(icon, tone, val, unit, lbl, ft) {
    return '<div class="stat ic ' + tone + '" style="margin-bottom:0">' +
      '<div class="st-ic">' + icon + '</div><div class="st-b">' +
      '<div class="n">' + val + (unit ? '<small style="font-size:15px">' + unit + '</small>' : '') + '</div>' +
      '<div class="l">' + lbl + '</div>' +
      '<div style="font-size:11.5px;color:var(--ink-3);margin-top:3px">' + ft + '</div>' +
      '</div></div>';
  }
  return '<div class="stat-row fde-kpi">' +
    card('◈', '', pct, '%', '总进度', done + ' / ' + total + ' 天') +
    card('📅', 's-ok', done, ' 天', '已完成天数', '第 ' + curD + ' 天 · 第 ' + curW + ' 周') +
    card('🔥', 's-warn', streak, ' 天', '连续学习', '最长 ' + best + ' 天') +
    card('⏱', '', hours, ' h', '累计投入', '按每日计划时长估算') +
    '</div>';
}

function fdePhaseHTML() {
  return '<div class="card tight"><div class="card-hd" style="margin-bottom:10px"><div class="ico">◈</div>' +
    '<h3 style="font-size:14px">三个阶段</h3><span class="hint">12 周 · 90 天</span></div>' +
    '<div class="fde-phases">' + FDE_DATA.phases.map(function (p, i) {
      var st = fdePhaseDone(p);
      var lo = i * 4 + 1, hi = lo + 3;
      return '<div class="fde-phase" style="--pc:' + esc(p.c) + '">' +
        '<div class="fp-top"><b>W' + lo + '–W' + hi + '</b>' +
        '<span class="fp-pct">' + st.pct + '%</span></div>' +
        '<div class="fp-t">' + esc(p.w) + '</div>' +
        '<div class="fp-h">' + esc(p.h) + '</div>' +
        '<div class="fp-p">' + esc(p.p) + '</div>' +
        '<div class="progress-bar"><i style="width:' + st.pct + '%"></i></div>' +
        '<div class="fp-n">' + st.done + ' / ' + st.total + ' 天</div>' +
        '</div>';
    }).join('') + '</div></div>';
}

function fdeTabHTML() {
  var tabs = [['timeline', '时间轴', FDE_DATA.weeks.length + ' 周'], ['glossary', '概念词典', (FDE_DATA.glossary || []).length + ' 词条'],
    ['exercises', '练习题库', (FDE_DATA.exercises || []).length + ' 道'], ['checklist', '验收清单', '']];
  return '<div class="chips">' + tabs.map(function (t) {
    return '<button class="chip ' + (FDE_TAB === t[0] ? 'on' : '') + '" data-act="fde-tab" data-v="' + t[0] + '">' +
      t[1] + (t[2] ? '<span class="n">' + t[2] + '</span>' : '') + '</button>';
  }).join('') +
    '<button class="chip" data-act="fde-pick-week" data-v="0">展开本周</button>' +
    '<button class="chip" data-act="fde-collapse">全部收起</button>' +
    '</div>';
}

/* ---------------- 时间轴 ---------------- */
function fdeTimelineHTML() {
  return FDE_DATA.weeks.map(function (w) {
    return fdeWeekCard(w);
  }).join('');
}

function fdeWeekCard(w) {
  var open = FDE_OPEN_WEEK === w.w;
  var done = fdeWeekDone(w);
  var total = (w.days || []).length;
  var pct = total ? Math.round(done / total * 100) : 0;
  var h = '<div class="card fde-week' + (open ? ' open' : '') + '" style="--wc:' + esc(w.color || '#6d5efc') + '">' +
    '<div class="fw-head click" data-act="fde-week" data-v="' + w.w + '">' +
    '<span class="fw-arrow">' + (open ? '▾' : '▸') + '</span>' +
    '<span class="fw-n" style="background:' + esc(w.color || '#6d5efc') + '">W' + w.w + '</span>' +
    '<span class="fw-main"><b>' + esc(w.theme) + '</b>' +
    '<span class="fw-range">' + esc(w.range || '') + (w.series ? ' · ' + esc(w.series) : '') + '</span></span>' +
    '<span class="fw-prog"><span class="fp-n">' + done + '/' + total + '</span>' +
    '<span class="fw-bar"><i style="width:' + pct + '%;background:' + esc(w.color || '#6d5efc') + '"></i></span></span>' +
    '<span class="fw-min">约 ' + (w.days || []).reduce(function (a, d) { return a + (d.min || 0); }, 0) + ' 分钟</span>' +
    '<button class="btn sm ghost" data-act="fde-week-done" data-v="' + w.w + '" title="勾选/取消整周">' +
    (done === total ? '✓ 整周已完成' : '勾选整周') + '</button>' +
    '</div>';

  if (open) {
    h += '<div class="fw-body">';
    h += '<div class="fw-meta">' +
      '<div class="fwm-row"><span class="fwm-k">工程地基</span><span class="fwm-v">' + esc(w.foundation || '—') + '</span></div>' +
      '<div class="fwm-row"><span class="fwm-k">本周验收物</span><span class="fwm-v">' + esc(w.deliver || '—') + '</span></div>' +
      '</div>';
    h += '<div class="fde-days">' + (w.days || []).map(function (d) { return fdeDayRow(d, w); }).join('') + '</div>';
    h += '</div>';
  }
  return h + '</div>';
}

function fdeDayRow(d, w) {
  var open = FDE_OPEN_DAY === d.d;
  var done = fdeDone(d.d);
  var h = '<div class="fde-day' + (open ? ' open' : '') + (done ? ' done' : '') + '">' +
    '<div class="fd-head">' +
    '<span class="fd-cb" data-act="fde-day" data-v="' + d.d + '" title="标记完成">' + (done ? '✓' : '') + '</span>' +
    '<span class="fd-n">D' + d.d + '</span>' +
    '<span class="fd-t click" data-act="fde-day-open" data-v="' + d.d + '">' + esc(d.t) + '</span>' +
    '<span class="fd-min">' + (d.min || '?') + ' 分钟</span>' +
    '<span class="fd-arrow" data-act="fde-day-open" data-v="' + d.d + '">' + (open ? '▾' : '▸') + '</span>' +
    '</div>';
  if (open) h += fdeDayDetail(d);
  return h + '</div>';
}

function fdeDayDetail(d) {
  var h = '<div class="fd-body">';
  if (d.steps && d.steps.length) {
    h += '<div class="fd-sec"><div class="fd-sh">① 动手步骤</div><ol class="fd-steps">' +
      d.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>';
  }
  if (d.concept && (d.concept.t || d.concept.b)) {
    h += '<div class="fd-sec"><div class="fd-sh">② 概念卡</div>' +
      '<div class="fd-concept"><b>' + esc(d.concept.t || '') + '</b>' +
      '<p>' + esc(d.concept.b || '') + '</p></div></div>';
  }
  if (d.code && d.code.src) {
    h += '<div class="fd-sec"><div class="fd-sh">③ 代码' + (d.code.t ? ' · ' + esc(d.code.t) : '') + '</div>' +
      '<pre class="fd-code">' + esc(d.code.src) + '</pre></div>';
  }
  if (d.practice && d.practice.length) {
    h += '<div class="fd-sec"><div class="fd-sh">④ 练习</div><div class="fd-chips">' +
      d.practice.map(function (p) { return '<span class="fd-chip">' + esc(p) + '</span>'; }).join('') + '</div></div>';
  }
  if (d.quiz && d.quiz.q) {
    h += '<div class="fd-sec"><div class="fd-sh">⑤ 自测</div>' +
      '<div class="fd-quiz"><div class="fdq-q">Q：' + esc(d.quiz.q) + '</div>' +
      '<div class="fdq-a"><span class="fdq-tag">答</span>' + esc(d.quiz.a) + '</div></div></div>';
  }
  return h + '</div>';
}

/* ---------------- 概念词典 ---------------- */
function fdeGlossaryHTML() {
  var list = FDE_DATA.glossary || [];
  var cats = ['all'].concat(list.map(function (g) { return g.c; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }));
  var q = FDE_G_Q.trim().toLowerCase();
  var show = list.filter(function (g) {
    if (FDE_G_CAT !== 'all' && g.c !== FDE_G_CAT) return false;
    if (!q) return true;
    return ((g.t || '') + ' ' + (g.en || '') + ' ' + (g.d || '')).toLowerCase().indexOf(q) >= 0;
  });
  var h = '<div class="card"><div class="card-hd"><div class="ico">📖</div><h3>概念词典</h3>' +
    '<span class="hint">' + show.length + ' / ' + list.length + ' 条</span></div>' +
    '<div class="fde-gsearch"><input type="text" id="fde-gq" value="' + esc(FDE_G_Q) + '" placeholder="搜索术语 / 英文名 / 释义关键词"></div>' +
    '<div class="chips" style="margin-bottom:12px">' + cats.map(function (c) {
      return '<button class="chip ' + (FDE_G_CAT === c ? 'on' : '') + '" data-act="fde-gcat" data-v="' + esc(c) + '">' +
        (c === 'all' ? '全部' : esc(c)) + '</button>';
    }).join('') + '</div>';
  h += show.length ? '<div class="fde-gloss">' + show.map(function (g) {
    return '<div class="fg-item"><div class="fg-t">' + esc(g.t) +
      (g.en ? '<span class="fg-en">' + esc(g.en) + '</span>' : '') +
      '<span class="tag brand">' + esc(g.c || '其他') + '</span></div>' +
      '<div class="fg-d">' + esc(g.d) + '</div></div>';
  }).join('') + '</div>' : emptyBox('📖', '没有匹配的词条', '换个关键词或分类试试');
  return h + '</div>';
}

/* ---------------- 练习题库（计划自带的 Python 练习） ---------------- */
function fdeExercisesHTML() {
  var list = FDE_DATA.exercises || [];
  var lvls = ['all'].concat(list.map(function (e) { return e.lvl; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }));
  var ws = ['all'].concat(list.map(function (e) { return String(e.w); }).filter(function (v, i, a) { return a.indexOf(v) === i; }));
  var show = list.filter(function (e) {
    if (FDE_EX_LVL !== 'all' && e.lvl !== FDE_EX_LVL) return false;
    if (FDE_EX_W !== 'all' && String(e.w) !== FDE_EX_W) return false;
    return true;
  });
  var h = '<div class="card"><div class="card-hd"><div class="ico">⌨</div><h3>Python 练习题库</h3>' +
    '<span class="hint">' + show.length + ' / ' + list.length + ' 道 · 建议每周 3–4 道</span></div>' +
    '<div class="chips" style="margin-bottom:8px">' + lvls.map(function (c) {
      return '<button class="chip ' + (FDE_EX_LVL === c ? 'on' : '') + '" data-act="fde-exlvl" data-v="' + esc(c) + '">' +
        (c === 'all' ? '全部难度' : esc(c)) + '</button>';
    }).join('') + '</div>' +
    '<div class="chips">' + ws.map(function (c) {
      return '<button class="chip ' + (FDE_EX_W === c ? 'on' : '') + '" data-act="fde-exw" data-v="' + esc(c) + '">' +
        (c === 'all' ? '全部周次' : 'W' + c) + '</button>';
    }).join('') + '</div>';
  h += show.length ? '<div class="fde-exs">' + show.map(function (e) {
    return '<div class="fe-item"><div class="fe-h"><span class="fe-n">' + esc(e.id) + '</span>' +
      '<b class="fe-t">' + esc(e.t) + '</b>' +
      '<span class="tag">' + esc(e.lvl || '') + '</span>' +
      '<span class="tag brand">W' + esc(String(e.w)) + '</span></div>' +
      '<div class="fe-d">' + esc(e.d) + '</div>' +
      (e.p ? '<div class="fe-x"><span class="fe-xk">考点</span>' + esc(e.p) + '</div>' : '') +
      '<div class="fe-fold"><div class="fe-fold-h" data-act="fde-fold">查看提示与答案 ▾</div>' +
      '<div class="fe-fold-b">' +
      (e.h ? '<div class="fe-x"><span class="fe-xk">提示</span>' + esc(e.h) + '</div>' : '') +
      (e.a ? '<div class="fe-x fe-a"><span class="fe-xk">参考实现</span><pre class="fd-code">' + esc(e.a) + '</pre></div>' : '') +
      '</div></div></div>';
  }).join('') + '</div>' : emptyBox('⌨', '没有匹配的练习', '换个难度或周次试试');
  return h + '</div>';
}

/* ---------------- 验收清单 ---------------- */
function fdeChecklistHTML() {
  var groups = FDE_DATA.checklist || [];
  var h = '<div class="card"><div class="card-hd"><div class="ico">✓</div><h3>验收清单</h3>' +
    '<span class="hint">每周必须交出一个「东西」，做不到就砍范围</span></div>' +
    '<div class="fde-checks">' + groups.map(function (g) {
      var items = (g.items || []);
      /* auto 组：由 12 周的验收物自动生成 */
      if (g.auto || !items.length) {
        items = FDE_DATA.weeks.map(function (w) {
          return { t: 'W' + w.w + ' · ' + w.theme, s: w.range + ' · ' + (w.deliver || '') };
        });
      }
      return '<div class="fc-group"><div class="fc-g">' + esc(g.g) +
        '<span class="hint">' + items.length + ' 项</span></div>' +
        '<div class="fc-list">' + items.map(function (it, i) {
          var key = 'fde:chk:' + g.g + ':' + i;
          var on = !!(S.fdeChecks && S.fdeChecks[key]);
          return '<label class="fc-item' + (on ? ' on' : '') + '"><input type="checkbox" data-act="fde-chk" data-v="' + esc(key) + '"' + (on ? ' checked' : '') + '>' +
            '<span class="fc-t">' + esc(it.t) + (it.s ? '<em>' + esc(it.s) + '</em>' : '') + '</span></label>';
        }).join('') + '</div></div>';
    }).join('') + '</div></div>';
  return h;
}

/* ---------------- 数据来源 / 同步 ---------------- */
function fdeSyncBar() {
  var src = window.FDE_SRC || {};
  var at = (S.meta && S.meta.fdeSyncedAt) || src.syncedAt || '';
  return '<div class="card tight fde-src"><div class="fs-row">' +
    '<span class="fs-k">数据来源</span>' +
    '<code class="fs-v">' + esc(src.path || '未知') + '</code></div>' +
    '<div class="fs-row"><span class="fs-k">版本</span>' +
    '<span class="fs-v">' + (src.localFp ? '本地指纹 ' : 'md5 ') + esc(String(src.md5 || '').slice(0, 12)) + '… · ' +
    (src.weeks || 0) + ' 周 / ' + (src.days || 0) + ' 天 / ' + (src.exercises || 0) + ' 练习</span>' +
    '<span class="fs-k">同步于</span><span class="fs-v">' + esc(at ? String(at).slice(0, 16).replace('T', ' ') : '—') + '</span></div>' +
    '<div class="fs-acts">' +
    '<button class="btn sm" data-act="fde-open-src">↗ 打开原页面</button>' +
    '<button class="btn sm pri" data-act="fde-sync-local">↻ 从本地文件同步</button>' +
    (src.localFp ? '<button class="btn sm ghost" data-act="fde-sync-reset">↺ 恢复内置版本</button>' : '') +
    '<button class="btn sm ghost" data-act="fde-export-md">⭳ 导出学习记录</button>' +
    '</div>' +
    '<div class="fs-tip">改动 AI 学习计划后，在工作台里点「从本地文件同步」选择 fde-90day-plan.html 即可更新内容（快照存在浏览器里、刷新不丢，打勾进度会保留）。' +
    '也可以在命令行跑 <code>node tools/fde-sync.mjs</code> 重新生成数据文件后重新构建，让新装环境也带上最新内容。</div>' +
    '</div>';
}

/* 解析 90 天页面 HTML，取出 DATA（与 tools/fde-sync.mjs 同逻辑） */
function fdeParsePage(text) {
  var re = /<script[^>]*>([\s\S]*?)<\/script>/g, m, dataScript = '';
  while ((m = re.exec(text))) {
    if (/DATA\.phases\s*=/.test(m[1]) && /DATA\.weeks/.test(m[1])) { dataScript = m[1]; break; }
  }
  if (!dataScript) return null;
  var fn = new Function('var DATA={phases:[],weeks:[],exercises:[],glossary:[],checklist:[]};\n' + dataScript + '\nreturn DATA;');
  var d = fn();
  if (!d || !d.weeks || !d.weeks.length) return null;
  return d;
}
/* 轻量指纹（浏览器里没有 node 的 md5，用 FNV-1a 32 位代替，仅作版本标识） */
function fdeFnv(str) {
  var h = 0x811c9dc5;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
  }
  return ('0000000' + h.toString(16)).slice(-8);
}
/* 从本地文件同步的数据存在独立 key，避免每次 commit 都写 100KB+ */
var FDE_SNAP_KEY = 'wd_fde_snapshot_v1';
function fdeSnapLoad() {
  try {
    var raw = localStorage.getItem(FDE_SNAP_KEY);
    if (!raw) return false;
    var o = JSON.parse(raw);
    if (!o || !o.data || !o.data.weeks || !o.data.weeks.length) return false;
    FDE_DATA = o.data;
    FDE_SRC = o.src || {};
    FDE_SRC.localFp = true;
    return true;
  } catch (e) { return false; }
}
function fdeSnapSave() {
  try {
    localStorage.setItem(FDE_SNAP_KEY, JSON.stringify({ at: nowISO(), src: FDE_SRC, data: FDE_DATA }));
    return true;
  } catch (e) {
    toast('本地快照保存失败（可能超出浏览器存储上限）：' + (e && e.message ? e.message : e), 'error', 6000);
    return false;
  }
}
function fdeSnapClear() {
  try { localStorage.removeItem(FDE_SNAP_KEY); } catch (e) { }
  FDE_SRC = window.FDE_SRC_BUILTIN || FDE_SRC;
  FDE_DATA = window.FDE_DATA_BUILTIN || FDE_DATA;
}
function fdeApplySync(text, fileName) {
  var d = fdeParsePage(text);
  if (!d) { toast('没能在该文件里找到 90 天计划数据，请确认选的是 fde-90day-plan.html', 'error', 5000); return; }
  var days = d.weeks.reduce(function (n, w) { return n + ((w.days || []).length); }, 0);
  FDE_DATA = { phases: d.phases || [], weeks: d.weeks, exercises: d.exercises || [], glossary: d.glossary || [], checklist: d.checklist || [] };
  FDE_SRC = {
    path: (fileName || '本地文件') + '（浏览器本地快照）', md5: fdeFnv(text), localFp: true,
    bytes: text.length, title: '90 天 FDE 学习计划', syncedAt: nowISO(),
    weeks: d.weeks.length, days: days,
    exercises: (d.exercises || []).length, glossary: (d.glossary || []).length
  };
  var saved = fdeSnapSave();
  S.meta = S.meta || {};
  S.meta.fdeSyncedAt = FDE_SRC.syncedAt;
  /* 清理已不存在的天勾选 */
  var valid = {};
  d.weeks.forEach(function (w) { (w.days || []).forEach(function (x) { valid[String(x.d)] = true; }); });
  var map = fdeMap(), kept = {};
  for (var k in map) if (valid[k]) kept[k] = map[k];
  S.fdeDays = kept;
  commit(); rerender();
  toast('已同步：' + d.weeks.length + ' 周 / ' + days + ' 天，原打勾进度已保留' + (saved ? '' : '（但快照未能持久化）'), 'ok', 4000);
}
function fdeResetToBuiltin() {
  confirmDialog({
    title: '恢复内置版本', message: '将清除浏览器里保存的本地同步快照，回到随工作台打包的内置版本（打勾进度与练习记录不受影响）。',
    confirmText: '恢复'
  }).then(function (ok) {
    if (!ok) return;
    fdeSnapClear();
    if (S.meta) S.meta.fdeSyncedAt = '';
    commit(); rerender(); toast('已恢复内置版本', 'ok');
  });
}
function fdeExportMd() {
  var lines = ['# FDE 90 天学习记录', '', '导出时间：' + nowISO().slice(0, 16).replace('T', ' '),
    '总进度：' + fdePct() + '%（' + fdeDoneCount() + '/' + fdeTotalDays() + ' 天）',
    '连续学习：' + fdeStreak() + ' 天（最长 ' + fdeLongestStreak() + ' 天）', ''];
  FDE_DATA.weeks.forEach(function (w) {
    var dn = fdeWeekDone(w);
    lines.push('## W' + w.w + ' ' + w.theme + '（' + w.range + '）  ' + dn + '/' + (w.days || []).length);
    lines.push('- 工程地基：' + (w.foundation || '—'));
    lines.push('- 验收物：' + (w.deliver || '—'));
    (w.days || []).forEach(function (d) {
      lines.push('- [' + (fdeDone(d.d) ? 'x' : ' ') + '] D' + d.d + ' ' + d.t + '（' + (d.min || '?') + ' 分钟）');
    });
    lines.push('');
  });
  var qr = S.quizRecords || [];
  lines.push('## AI 知识练习记录');
  if (!qr.length) lines.push('（暂无记录）');
  else qr.slice().reverse().forEach(function (r) {
    lines.push('- ' + String(r.at).slice(0, 16).replace('T', ' ') + ' · ' + (r.mods || []).join('/') + ' · ' + r.right + '/' + r.total + '（' + r.score + ' 分）');
  });
  var md = lines.join('\n');
  downloadText(md, 'FDE学习记录-' + dOff(0) + '.md');
}
function downloadText(text, name) {
  try {
    var blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
    toast('已导出 ' + name, 'ok');
  } catch (e) { toast('导出失败：' + e.message, 'error'); }
}

/* ============================================================
   三、AI 知识练习 —— 助手
   ============================================================ */
function quizModName(id) { return (QUIZ_MOD_MAP[id] || {}).name || id; }
function quizPickList() {
  return QUIZ_BANK.filter(function (q) { return QUIZ_PICK.indexOf(q.m) >= 0; });
}
function quizWrongMap() {
  return (S.quizWrong && typeof S.quizWrong === 'object' && !Array.isArray(S.quizWrong)) ? S.quizWrong : {};
}
function quizWrongIds() { return Object.keys(quizWrongMap()); }
function quizRecords() { return (S.quizRecords || []).slice().reverse(); }
function quizShuffle(a) {
  var r = a.slice();
  for (var i = r.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = r[i]; r[i] = r[j]; r[j] = t;
  }
  return r;
}
function quizStart() {
  var pool = quizPickList();
  if (!pool.length) { toast('请至少选择一个知识点', 'warn'); return; }
  var n = QUIZ_SIZE === 0 ? pool.length : Math.min(QUIZ_SIZE, pool.length);
  var qs = quizShuffle(pool).slice(0, n);
  QUIZ_SESSION = { qs: qs, ans: {}, i: 0, startedAt: Date.now(), sec: 0 };
  QUIZ_RESULT = null;
  startQuizTimer();
  rerender();
}
function quizStartFromWrong() {
  var ids = quizWrongIds();
  var qs = QUIZ_BANK.filter(function (q) { return ids.indexOf(q.id) >= 0; });
  if (!qs.length) { toast('错题本是空的', 'ok'); return; }
  QUIZ_SESSION = { qs: quizShuffle(qs), ans: {}, i: 0, startedAt: Date.now(), sec: 0, wrongOnly: true };
  QUIZ_RESULT = null;
  startQuizTimer();
  rerender();
}
function startQuizTimer() {
  stopQuizTimer();
  QUIZ_TIMER = setInterval(function () {
    if (!QUIZ_SESSION) { stopQuizTimer(); return; }
    QUIZ_SESSION.sec = Math.round((Date.now() - QUIZ_SESSION.startedAt) / 1000);
    var el = document.querySelector('.fq-timer');
    if (el) el.textContent = fmtMs(QUIZ_SESSION.sec * 1000);
  }, 1000);
}
function stopQuizTimer() { if (QUIZ_TIMER) { clearInterval(QUIZ_TIMER); QUIZ_TIMER = null; } }
function quizAnswer(qid, v) {
  if (!QUIZ_SESSION) return;
  QUIZ_SESSION.ans[qid] = v;
  rerender();
}
function quizTo(i) {
  if (!QUIZ_SESSION) return;
  QUIZ_SESSION.i = Math.max(0, Math.min(QUIZ_SESSION.qs.length - 1, i));
  rerender();
}
function quizQuit() {
  confirmDialog({ title: '退出本次练习', message: '已作答的内容不会保存，确定退出吗？', danger: true, confirmText: '退出' })
    .then(function (ok) { if (!ok) return; stopQuizTimer(); QUIZ_SESSION = null; QUIZ_RESULT = null; rerender(); });
}
function quizSubmit() {
  var s = QUIZ_SESSION;
  if (!s) return;
  var answered = 0;
  s.qs.forEach(function (q) { if (s.ans[q.id] !== undefined) answered++; });
  if (answered < s.qs.length) {
    confirmDialog({
      title: '还有题目未作答', message: '共 ' + s.qs.length + ' 题，已作答 ' + answered + ' 题。未作答将计为错误，确定交卷吗？',
      confirmText: '确定交卷'
    }).then(function (ok) { if (ok) quizGrade(); });
    return;
  }
  quizGrade();
}
function quizGrade() {
  var s = QUIZ_SESSION;
  if (!s) return;
  var detail = [], right = 0;
  s.qs.forEach(function (q) {
    var ua = s.ans[q.id];
    var ok = (q.k === 'c') ? (ua === q.a) : (ua === q.a);
    if (ok) right++;
    detail.push({ qid: q.id, m: q.m, k: q.k, ok: ok, ua: (ua === undefined ? null : ua) });
  });
  var total = s.qs.length;
  var score = Math.round(right / total * 100);
  var rec = {
    id: uid(), at: nowISO(),
    mods: QUIZ_PICK.length ? QUIZ_PICK.slice() : [],
    total: total, right: right, score: score,
    usedSec: s.sec || Math.round((Date.now() - s.startedAt) / 1000),
    wrongOnly: !!s.wrongOnly,
    detail: detail
  };
  S.quizRecords = S.quizRecords || [];
  S.quizRecords.push(rec);
  /* 错题本：答错进入，答对移出 */
  var wm = quizWrongMap();
  detail.forEach(function (d) {
    if (d.ok) { if (wm[d.qid]) delete wm[d.qid]; }
    else { wm[d.qid] = { n: ((wm[d.qid] && wm[d.qid].n) || 0) + 1, lastAt: rec.at }; }
  });
  S.quizWrong = wm;
  stopQuizTimer();
  QUIZ_RESULT = rec;
  QUIZ_SESSION = null;
  commit(); rerender();
  toast('本次得分 ' + score + ' 分（' + right + '/' + total + '）', score >= 80 ? 'ok' : (score >= 60 ? 'warn' : 'error'), 4000);
}

/* 统计：按知识点正确率 */
function quizModStats() {
  var stat = {};
  QUIZ_MODS.forEach(function (m) { stat[m.id] = { done: 0, right: 0 }; });
  (S.quizRecords || []).forEach(function (r) {
    (r.detail || []).forEach(function (d) {
      if (!stat[d.m]) stat[d.m] = { done: 0, right: 0 };
      stat[d.m].done++;
      if (d.ok) stat[d.m].right++;
    });
  });
  return stat;
}
function quizAvg() {
  var rs = S.quizRecords || [];
  if (!rs.length) return 0;
  return Math.round(rs.reduce(function (a, r) { return a + (r.score || 0); }, 0) / rs.length);
}
function quizBest() {
  var rs = S.quizRecords || [];
  if (!rs.length) return 0;
  return Math.max.apply(null, rs.map(function (r) { return r.score || 0; }));
}

/* ============================================================
   四、AI 知识练习 —— 渲染
   ============================================================ */
function renderQuiz(el) {
  if (QUIZ_RESULT) { el.innerHTML = quizResultHTML(); return; }
  if (QUIZ_SESSION) { el.innerHTML = quizRunHTML(); return; }
  el.innerHTML = QUIZ_WRONG_ONLY ? quizWrongHTML() : quizHomeHTML();
}

/* 薄弱知识点（正确率 < 80% 的取最低 3 个） */
function quizWeakHTML(st, played) {
  var weak = played.slice().sort(function (a, b) {
    return (st[a.id].right / st[a.id].done) - (st[b.id].right / st[b.id].done);
  }).slice(0, 3).filter(function (m) {
    return st[m.id].done ? (st[m.id].right / st[m.id].done) < 0.8 : false;
  });
  if (!weak.length) return '<span style="color:var(--ok)">暂无，保持住</span>';
  return weak.map(function (m) {
    return '<button class="fq-weak-b" data-act="quiz-mod-quick" data-v="' + m.id + '">' + esc(m.name) + '</button>';
  }).join('');
}

/* ---------------- 配置页 ---------------- */
function quizHomeHTML() {
  var h = '';
  var avg = quizAvg(), best = quizBest(), cnt = (S.quizRecords || []).length, wn = quizWrongIds().length;
  h += '<div class="stat-row">' +
    '<div class="stat ic"><div class="st-ic">✎</div><div class="st-b"><div class="n">' + cnt + '</div><div class="l">累计练习次数</div></div></div>' +
    '<div class="stat ic ' + (avg >= 80 ? 's-ok' : (avg >= 60 ? 's-warn' : 's-danger')) + '"><div class="st-ic">◈</div><div class="st-b"><div class="n">' + avg + '<small style="font-size:15px">分</small></div><div class="l">平均分</div></div></div>' +
    '<div class="stat ic s-ok"><div class="st-ic">★</div><div class="st-b"><div class="n">' + best + '<small style="font-size:15px">分</small></div><div class="l">最高分</div></div></div>' +
    '<div class="stat ic ' + (wn ? 's-danger' : 's-ok') + '"><div class="st-ic">⚑</div><div class="st-b"><div class="n">' + wn + '</div><div class="l">错题本待攻克</div></div></div>' +
    '</div>';

  /* 设置 */
  h += '<div class="card"><div class="card-hd"><div class="ico">◎</div><h3>选择题库</h3>' +
    '<span class="hint">共 ' + QUIZ_BANK.length + ' 题 · 已选 ' + quizPickList().length + ' 题</span></div>' +
    '<div class="chips">' +
    '<button class="chip ' + (QUIZ_PICK.length === QUIZ_MODS.length ? 'on' : '') + '" data-act="quiz-allmod">全选知识点</button>' +
    '<button class="chip" data-act="quiz-nomod">清空</button></div>' +
    '<div class="qm-grid">' + QUIZ_MODS.map(function (m) {
      var n = QUIZ_BANK.filter(function (q) { return q.m === m.id; }).length;
      var on = QUIZ_PICK.indexOf(m.id) >= 0;
      return '<button class="qm-card' + (on ? ' on' : '') + '" data-act="quiz-mod" data-v="' + m.id + '">' +
        '<span class="qm-ic">' + m.icon + '</span>' +
        '<span class="qm-b"><b>' + esc(m.name) + '</b>' +
        '<em>' + esc(m.desc) + '</em></span>' +
        '<span class="qm-n">' + n + ' 题</span>' +
        '<span class="qm-tag">' + esc(m.w) + '</span>' +
        '</button>';
    }).join('') + '</div>';

  h += '<div class="quiz-size"><span class="qs-l">本次题量</span>' +
    [[10, '10 题'], [20, '20 题'], [0, '全部']].map(function (s) {
      return '<button class="chip ' + (QUIZ_SIZE === s[0] ? 'on' : '') + '" data-act="quiz-size" data-v="' + s[0] + '">' + s[1] + '</button>';
    }).join('') +
    '<span class="qs-tip">' + (QUIZ_SIZE === 0
      ? '将作答已选题库全部 ' + quizPickList().length + ' 题'
      : '从已选知识点中随机抽取 ' + Math.min(QUIZ_SIZE, quizPickList().length) + ' 题') +
    ' · 选择题 + 判断题混合</span></div>';

  h += '<div class="fq-start">' +
    '<button class="btn pri lg" data-act="quiz-start">▶ 开始练习</button>' +
    (quizWrongIds().length ? '<button class="btn lg" data-act="quiz-wrong-open">⚑ 只练错题（' + quizWrongIds().length + ' 题）</button>' : '') +
    '</div></div>';

  /* 知识点正确率 */
  var st = quizModStats();
  var played = QUIZ_MODS.filter(function (m) { return st[m.id] && st[m.id].done; });
  if (played.length) {
    h += '<div class="grid-2" style="align-items:start">';
    h += '<div class="card" style="margin-bottom:0"><div class="card-hd"><div class="ico">◫</div><h3>各知识点正确率</h3>' +
      '<span class="hint">按已练习题数统计</span></div><div class="fq-mods">' + played.map(function (m) {
        var s = st[m.id], pct = Math.round(s.right / s.done * 100);
        var cls = pct >= 80 ? 'ok' : (pct >= 60 ? 'warn' : 'danger');
        return '<div class="fqm-row"><span class="fqm-n">' + m.icon + ' ' + esc(m.name) + '</span>' +
          '<span class="fqm-bar"><i class="' + cls + '" style="width:' + pct + '%"></i></span>' +
          '<span class="fqm-p">' + pct + '%<em>' + s.right + '/' + s.done + '</em></span></div>';
      }).join('') + '</div>' +
      '<div class="fq-weak">薄弱项：' + quizWeakHTML(st, played) + '</div></div>';
    h += '<div class="card" style="margin-bottom:0"><div class="card-hd"><div class="ico">◱</div><h3>得分记录</h3>' +
      '<span class="hint">最近 ' + Math.min(10, quizRecords().length) + ' 次</span>' +
      (quizRecords().length ? '<button class="btn sm ghost" data-act="quiz-clear-rec">清空记录</button>' : '') + '</div>' +
      '<div class="fq-hist">' + quizRecords().slice(0, 10).map(function (r) {
        var cls = r.score >= 80 ? 'ok' : (r.score >= 60 ? 'warn' : 'danger');
        return '<div class="fq-h-row"><span class="fq-h-s ' + cls + '">' + r.score + '</span>' +
          '<span class="fq-h-b"><b>' + r.right + ' / ' + r.total + ' 题</b>' +
          '<em>' + esc((r.mods || []).map(quizModName).join(' · ') || '全部') + '</em></span>' +
          '<span class="fq-h-m">' + fmtMs((r.usedSec || 0) * 1000) + '<br>' + fmtDT(r.at) + '</span></div>';
      }).join('') + '</div></div>';
    h += '</div>';
  }
  return h;
}

/* ---------------- 答题页 ---------------- */
function quizRunHTML() {
  var s = QUIZ_SESSION;
  var q = s.qs[s.i];
  var answered = 0;
  s.qs.forEach(function (x) { if (s.ans[x.id] !== undefined) answered++; });
  var h = '';

  h += '<div class="card fq-top"><div class="fq-bar">' +
    '<span class="fq-prog">第 <b>' + (s.i + 1) + '</b> / ' + s.qs.length + ' 题</span>' +
    '<span class="fq-timer">' + fmtMs((s.sec || 0) * 1000) + '</span>' +
    '<span class="fq-done">已答 ' + answered + ' 题</span>' +
    '<button class="btn sm ghost" data-act="quiz-quit">退出</button></div>' +
    '<div class="progress-bar" style="margin-top:10px"><i style="width:' + Math.round((s.i + 1) / s.qs.length * 100) + '%"></i></div>' +
    '<div class="fq-nav">' + s.qs.map(function (x, i) {
      var cls = 'fq-nav-b';
      if (i === s.i) cls += ' on';
      if (s.ans[x.id] !== undefined) cls += ' done';
      return '<button class="' + cls + '" data-act="quiz-jump" data-v="' + i + '">' + (i + 1) + '</button>';
    }).join('') + '</div></div>';

  h += '<div class="card"><div class="fq-qhead">' +
    '<span class="tag brand">' + esc(quizModName(q.m)) + '</span>' +
    '<span class="tag ' + (q.k === 'c' ? '' : 'warn') + '">' + (q.k === 'c' ? '选择题' : '判断题') + '</span>' +
    '<span class="hint">' + QUIZ_BANK.filter(function (x) { return x.m === q.m; }).length + ' 题题库</span></div>' +
    '<div class="fq-q">' + esc(q.q) + '</div>';

  var ua = s.ans[q.id];
  if (q.k === 'c') {
    h += '<div class="fq-opts">' + q.o.map(function (o, i) {
      var on = ua === i;
      return '<button class="fq-opt' + (on ? ' on' : '') + '" data-act="quiz-ans" data-v="' + i + '" data-id="' + q.id + '">' +
        '<span class="fq-key">' + 'ABCD'[i] + '</span><span>' + esc(o) + '</span></button>';
    }).join('') + '</div>';
  } else {
    h += '<div class="fq-opts">' +
      '<button class="fq-opt' + (ua === true ? ' on' : '') + '" data-act="quiz-ans-t" data-v="1" data-id="' + q.id + '"><span class="fq-key">✓</span><span>正确</span></button>' +
      '<button class="fq-opt' + (ua === false ? ' on' : '') + '" data-act="quiz-ans-t" data-v="0" data-id="' + q.id + '"><span class="fq-key">✕</span><span>错误</span></button>' +
      '</div>';
  }

  h += '<div class="fq-foot">' +
    '<button class="btn" data-act="quiz-prev"' + (s.i === 0 ? ' disabled' : '') + '>← 上一题</button>' +
    (s.i < s.qs.length - 1
      ? '<button class="btn pri" data-act="quiz-next">下一题 →</button>'
      : '<button class="btn ok" data-act="quiz-submit">✓ 交卷评分</button>') +
    (s.i < s.qs.length - 1 ? '<button class="btn ghost" data-act="quiz-submit">提前交卷</button>' : '') +
    '</div></div>';
  return h;
}

/* ---------------- 结果页 ---------------- */
function quizResultHTML() {
  var r = QUIZ_RESULT;
  var pct = r.score;
  var cls = pct >= 80 ? 'ok' : (pct >= 60 ? 'warn' : 'danger');
  var h = '';
  h += '<div class="card fq-res"><div class="fq-res-top">' +
    ringSVG(pct, '本次得分') +
    '<div class="fq-res-b">' +
    '<h3 style="font-size:19px">' + (pct >= 90 ? '优秀' : (pct >= 80 ? '良好' : (pct >= 60 ? '及格，还能再练' : '需要回看知识点'))) + '</h3>' +
    '<div class="fq-res-kv">' +
    '<span>答对 <b class="' + cls + '">' + r.right + '</b> / ' + r.total + ' 题</span>' +
    '<span>用时 <b>' + fmtMs((r.usedSec || 0) * 1000) + '</b></span>' +
    '<span>知识点 <b>' + esc((r.mods || []).map(quizModName).join(' / ') || '全部') + '</b></span>' +
    '</div>' +
    '<div class="fq-res-acts">' +
    '<button class="btn pri" data-act="quiz-again">再练一次</button>' +
    (quizWrongIds().length ? '<button class="btn" data-act="quiz-wrong-open">⚑ 练错题（' + quizWrongIds().length + '）</button>' : '') +
    '<button class="btn ghost" data-act="quiz-back">返回题库</button>' +
    '</div></div></div></div>';

  h += '<div class="card"><div class="card-hd"><div class="ico">◫</div><h3>逐题解析</h3>' +
    '<span class="hint">答错的已自动进错题本</span></div><div class="fq-review">' +
    r.detail.map(function (d, i) {
      var q = QUIZ_BANK.filter(function (x) { return x.id === d.qid; })[0];
      if (!q) return '';
      var uaTxt = d.ua === null ? '<span class="fq-un">未作答</span>'
        : (q.k === 'c' ? esc(q.o[d.ua]) : (d.ua ? '正确' : '错误'));
      var aTxt = q.k === 'c' ? ('ABCD'[q.a] + '. ' + q.o[q.a]) : (q.a ? '正确' : '错误');
      return '<div class="fq-rv' + (d.ok ? ' ok' : ' bad') + '">' +
        '<div class="fq-rv-h"><span class="fq-rv-n">' + (i + 1) + '</span>' +
        '<span class="fq-rv-s">' + (d.ok ? '✓' : '✕') + '</span>' +
        '<span class="fq-rv-t">' + esc(q.q) + '</span>' +
        '<span class="tag">' + esc(quizModName(q.m)) + '</span>' +
        '<span class="tag ' + (q.k === 'c' ? '' : 'warn') + '">' + (q.k === 'c' ? '选择' : '判断') + '</span></div>' +
        '<div class="fq-rv-b"><div class="fq-rv-u"><i>你的答案</i>' + uaTxt + '</div>' +
        '<div class="fq-rv-a"><i>正确答案</i>' + esc(aTxt) + '</div>' +
        '<div class="fq-rv-e"><i>解析</i>' + esc(q.e) + '</div></div></div>';
    }).join('') + '</div></div>';
  return h;
}

/* ---------------- 错题本 ---------------- */
function quizWrongHTML() {
  var wm = quizWrongMap();
  var ids = Object.keys(wm);
  var list = QUIZ_BANK.filter(function (q) { return ids.indexOf(q.id) >= 0; });
  var h = '<div class="chips">' +
    '<button class="chip" data-act="quiz-back">← 返回题库</button>' +
    '<button class="chip on">错题本 ' + list.length + ' 题</button>' +
    (list.length ? '<button class="chip" data-act="quiz-start-wrong">▶ 只练错题</button>' +
      '<button class="chip" data-act="quiz-clear-wrong">清空错题本</button>' : '') +
    '</div>';
  if (!list.length) return h + '<div class="card">' + emptyBox('⚑', '错题本是空的', '去做一组练习，答错的题会自动进这里') + '</div>';
  h += '<div class="card"><div class="card-hd"><div class="ico">⚑</div><h3>错题本</h3>' +
    '<span class="hint">答对后自动移出</span></div><div class="fq-wrong">' +
    list.map(function (q) {
      var w = wm[q.id] || {};
      return '<div class="fqw-item"><div class="fqw-h">' +
        '<span class="tag">' + esc(quizModName(q.m)) + '</span>' +
        '<span class="tag ' + (q.k === 'c' ? '' : 'warn') + '">' + (q.k === 'c' ? '选择' : '判断') + '</span>' +
        '<span class="fqw-n">错 ' + (w.n || 1) + ' 次</span></div>' +
        '<div class="fqw-q">' + esc(q.q) + '</div>' +
        (q.k === 'c' ? '<div class="fqw-o">' + q.o.map(function (o, i) {
          return '<div class="fqw-oo' + (i === q.a ? ' right' : '') + '">' + 'ABCD'[i] + '. ' + esc(o) + '</div>';
        }).join('') + '</div>' : '<div class="fqw-o"><div class="fqw-oo right">正确答案：' + (q.a ? '正确' : '错误') + '</div></div>') +
        '<div class="fqw-e"><i>解析</i>' + esc(q.e) + '</div></div>';
    }).join('') + '</div></div>';
  return h;
}
