/* ============================================================
   40-work.js —— 今日工作台 + 任务台账 + 任务 CRUD
   ============================================================ */
var WORK_DATE = '';
var CAL_MONTH_OFFSET = 0;
var FOCUS_MODE = false;
var POMO = null; // {taskId, endAt, paused, timerId}

var STATUS_ICON = { todo: '○', doing: '⏵', waiting: '⏸', done: '✓' };
var PRIO_ICON = { high: '🔥', mid: '▴', low: '▿' };

function statusIcon(st) { return STATUS_ICON[st] || '○'; }
function prioIcon(pr) { return PRIO_ICON[pr] || '▴'; }
function taskLeadIcon(t) {
  return '<span class="t-icon" title="' + esc((STATUS[t.status] || STATUS.todo).t) + '">' + statusIcon(t.status) + '</span>';
}
function taskTags(t) {
  var s = STATUS[t.status] || STATUS.todo;
  var p = PRIO[t.priority] || PRIO.mid;
  var dc = dueClass(t.dueDate);
  var overdue = isOverdueTask(t);
  var isDone = t.status === 'done';
  /* 已完成的任务不再累计逾期天数（按 0 天计，只显示日期） */
  var dueHTML;
  if (!t.dueDate) {
    dueHTML = '<span class="due">无截止</span>';
  } else if (isDone) {
    dueHTML = '<span class="due done-due">' + esc(t.dueDate.slice(5).replace('-', '/')) + '</span>';
  } else {
    dueHTML = '<span class="due ' + (overdue ? 'red' : dc) + '">' + esc(fmtDue(t.dueDate, t.dueTime)) + (overdue ? ' · 已延期' : '') + '</span>';
  }
  return '<span class="tag ' + s.c + '">' + s.t + '</span>' +
    '<span class="tag ' + p.c + '">' + p.t + '优先</span>' +
    dueHTML +
    (t.focus ? '<span class="tag brand">今日重点</span>' : '');
}
/* ---------------- ONES 字段小部件 ---------------- */
function onsBadge(onsId) {
  return onsId ? '<span class="ons-badge" title="ONES 任务 ID">' + esc(onsId) + '</span>' : '';
}
function progChip(t) {
  var p = (typeof t.progress === 'number') ? t.progress : null;
  var cls = p === null ? 'mut' : (p >= 100 ? 'ok' : (p > 0 ? 'doing' : 'todo'));
  return '<span class="prog-chip ' + cls + '"><i style="width:' + (p || 0) + '%"></i><b>' + (p === null ? '—' : p + '%') + '</b></span>';
}
function planChip(t) {
  if (!t.planStart && !t.planEnd) return '';
  return '<span class="plan-chip">计划 ' + esc((t.planStart || '—').slice(5)) + ' → ' + esc((t.planEnd || '—').slice(5)) + '</span>';
}
function onesMetaLine(t) {
  return '<div class="meta ones-meta">' +
    onsBadge(t.onsId) +
    (t.owner ? '<span class="tag">👤 ' + esc(t.owner) + '</span>' : '') +
    (t.onesStatus ? '<span class="tag ' + ((STATUS[t.status] || STATUS.todo).c) + '">' + esc(t.onesStatus) + '</span>' : '') +
    progChip(t) + planChip(t) +
  '</div>';
}
function taskRow(t, opts) {
  opts = opts || {};
  var pj = projectOf(t.projectId);
  return '<div class="row' + (t.status === 'done' ? ' done' : '') + '">' +
    '<div class="cb" data-act="task-done" data-id="' + t.id + '" role="button" aria-label="切换完成状态">✓</div>' +
    '<div class="body">' +
      '<div class="t1">' + taskLeadIcon(t) + '<span class="t-prio">' + prioIcon(t.priority) + '</span>' + esc(t.title) + '</div>' +
      '<div class="meta">' + taskTags(t) +
        (pj ? '<span class="tag brand">' + esc(pj.name) + '</span>' : '<span class="tag">临时事项</span>') +
      '</div>' +
      (isOnesTask(t) ? onesMetaLine(t) : '') +
    '</div>' +
    '<div class="acts">' +
      (t.onesUrl ? '<button class="btn xs" data-act="open-url" data-url="' + esc(t.onesUrl) + '" title="打开 ONES 任务" aria-label="打开 ONES 任务">🔗 ONES</button>' : '') +
      (opts.showPomo && t.status !== 'done' ? '<button class="icon-btn" data-act="pomo-start" data-id="' + t.id + '" title="开始专注" aria-label="开始专注">🍅</button>' : '') +
      '<button class="icon-btn" data-act="task-due" data-id="' + t.id + '" title="修改截止日期和时间" aria-label="修改截止日期和时间">⏰</button>' +
      '<button class="icon-btn" data-act="task-status" data-id="' + t.id + '" title="修改状态" aria-label="修改状态">⇄</button>' +
      '<button class="icon-btn" data-act="task-edit" data-id="' + t.id + '" title="编辑" aria-label="编辑">✎</button>' +
      '<button class="icon-btn danger" data-act="task-del" data-id="' + t.id + '" title="删除" aria-label="删除">✕</button>' +
    '</div></div>';
}
function taskListHTML(list, emptyIc, emptyT, emptyS, opts) {
  if (!list.length) return emptyBox(emptyIc, emptyT, emptyS);
  return '<div class="list">' + list.map(function (t) { return taskRow(t, opts); }).join('') + '</div>';
}
function sectionCard(icon, cls, title, tasks, emptyT, emptyS, opts) {
  return '<div class="card">' +
    '<div class="card-hd"><div class="ico ' + (cls || '') + '">' + icon + '</div><h3>' + esc(title) + '</h3>' +
    '<span class="hint">' + tasks.length + ' 项</span></div>' +
    taskListHTML(tasks, '◔', emptyT, emptyS, opts) + '</div>';
}

/* ---------------- 日期筛选 / 小型月历 ---------------- */
function tasksForDate(dateStr) {
  if (!dateStr) return [];
  return (S.tasks || []).filter(function (t) {
    return t.dueDate === dateStr;
  }).sort(sortTasks);
}
function hasTaskOn(dateStr) {
  return (S.tasks || []).some(function (t) { return t.dueDate === dateStr && t.status !== 'done'; });
}
/** 某天任务的等级色点：高优先/已延期=红，中=琥珀，低=品牌紫，已完成=绿；最多 3 个 */
function calDots(dateStr) {
  var ts = (S.tasks || []).filter(function (t) { return t.dueDate === dateStr; });
  if (!ts.length) return '';
  var rank = { high: 0, mid: 1, low: 2, done: 3 };
  var seen = {}, ks = [];
  ts.forEach(function (t) {
    var k = t.status === 'done' ? 'done' : (isOverdueTask(t) ? 'high' : (t.priority || 'mid'));
    if (!seen[k]) { seen[k] = 1; ks.push(k); }
  });
  ks.sort(function (a, b) { return rank[a] - rank[b]; });
  return ks.slice(0, 3).map(function (k) { return '<i class="cd cd-' + k + '"></i>'; }).join('');
}
function miniCalendarHTML() {
  var today = ymd(new Date());
  var base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + CAL_MONTH_OFFSET);
  var year = base.getFullYear(), month = base.getMonth();
  var firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var monthLabel = year + ' 年 ' + (month + 1) + ' 月';
  var lmObj = solarToLunar(year, month + 1, Math.min(15, daysInMonth));
  var lmLabel = (lmObj.leap ? '闰' : '') + LUNAR_MONTH_NAMES[lmObj.m];
  var heads = ['一', '二', '三', '四', '五', '六', '日'];
  var cells = '';
  for (var i = 0; i < firstDay; i++) cells += '<div class="cal-cell empty"></div>';
  for (var d = 1; d <= daysInMonth; d++) {
    var ds = year + '-' + p2(month + 1) + '-' + p2(d);
    var on = ds === WORK_DATE;
    var isToday = ds === today;
    cells += '<button class="cal-cell' + (on ? ' on' : '') + (isToday ? ' today' : '') + '" data-act="calendar-select" data-v="' + ds + '" title="' + ds + ' 农历' + esc(lunarText(ds)) + '">' +
      '<span class="cd-n">' + d + '</span>' +
      '<span class="cd-l">' + esc(lunarText(ds)) + '</span>' +
      '<span class="cd-dots">' + calDots(ds) + '</span>' +
    '</button>';
  }
  return '<div class="mini-cal">' +
    '<div class="cal-hd">' +
      '<button class="icon-btn" data-act="calendar-prev" aria-label="上个月">‹</button>' +
      '<span class="cal-t">' + monthLabel + (lmLabel ? '<i>农历' + esc(lmLabel) + '</i>' : '') + '</span>' +
      '<button class="icon-btn" data-act="calendar-next" aria-label="下个月">›</button>' +
      (WORK_DATE ? '<button class="btn sm" data-act="calendar-clear">重置</button>' : '') +
    '</div>' +
    '<div class="cal-week">' + heads.map(function (h) { return '<div>' + h + '</div>'; }).join('') + '</div>' +
    '<div class="cal-days">' + cells + '</div>' +
    '</div>';
}

/* ============================================================
   今日工作台
   ============================================================ */
ROUTES['work/today'] = { title: '今日工作台', desc: '30 秒内明确今天要做什么', render: renderToday };

function renderToday(el) {
  if (FOCUS_MODE) { renderFocus(el); return; }
  var st = todayStats();
  var all = S.tasks || [];
  var open = all.filter(function (t) { return t.status !== 'done'; });
  var dateLabel = WORK_DATE ? WORK_DATE : ymd(new Date());
  var dateTasks = WORK_DATE ? tasksForDate(WORK_DATE) : null;

  var html = '';
  html += '<div class="page-note">' + (WORK_DATE ? '已选中 ' + dateLabel : ymd(new Date())) +
    ' · 共 ' + st.openTotal + ' 项未完成，其中 ' + st.overdue + ' 项已延期</div>';

  html += '<div class="focus-bar">' +
    '<div style="display:flex;align-items:center;gap:12px">' +
      '<button class="btn pri" data-act="focus-mode">🍅 进入专注模式</button>' +
      '<span class="hint">隐藏干扰，只看任务清单</span>' +
    '</div>' +
    '<button class="btn" data-act="task-new">＋ 新增任务</button>' +
  '</div>';

  html += '<div class="stat-row">' +
    '<div class="stat ic s-brand"><div class="st-ic">📝</div><div class="st-b"><div class="n">' + st.todayTodo + '</div><div class="l">今日待完成</div></div></div>' +
    '<div class="stat ic s-ok"><div class="st-ic">✅</div><div class="st-b"><div class="n">' + st.todayDone + '</div><div class="l">今日已完成</div></div></div>' +
    '<div class="stat ic ' + (st.overdue ? 's-danger' : 's-ok') + '"><div class="st-ic">' + (st.overdue ? '⚠️' : '🛡️') + '</div><div class="st-b"><div class="n">' + st.overdue + '</div><div class="l">已延期</div></div></div>' +
    '<div class="stat ic s-brand"><div class="st-ic">🚀</div><div class="st-b"><div class="n">' + st.openProjects + '</div><div class="l">进行中项目</div></div></div>' +
  '</div>';

  if (WORK_DATE) {
    html += '<div class="today-top">';
    html += miniCalendarHTML();
    html += '<div class="card"><div class="card-hd"><div class="ico">📅</div><h3>' + dateLabel + ' 的任务</h3>' +
      '<span class="hint">' + (dateTasks ? dateTasks.length : 0) + ' 项</span></div>' +
      taskListHTML(dateTasks || [], '◔', '这一天没有任务', '选其他日期看看，或点「＋ 新增任务」') + '</div>';
    html += '</div>';
  } else {
    var dueToday = open.filter(isDueToday).sort(sortTasks);
    var overdue = open.filter(isOverdueTask).sort(sortTasks);
    var waiting = open.filter(function (t) { return t.status === 'waiting'; }).sort(sortTasks);
    var doneToday = all.filter(function (t) {
      return t.status === 'done' && t.completedAt && ymd(new Date(t.completedAt)) === ymd(new Date());
    }).sort(function (a, b) { return new Date(b.completedAt) - new Date(a.completedAt); });

    /* 今日最重要的 3 件事 —— 与月历并排对齐 */
    var t3 = open.sort(sortTasks).slice(0, 3);
    html += '<div class="today-top">';
    html += miniCalendarHTML();
    html += '<div class="card">' +
      '<div class="card-hd"><div class="ico">★</div><h3>今日最重要的 3 件事</h3>' +
      '<span class="hint">已延期 / 今日截止 优先</span></div>' +
      (t3.length ? '<div class="top3">' + t3.map(function (t, i) {
        var pj = projectOf(t.projectId);
        return '<div class="top3-item r' + (i + 1) + '">' +
          '<div class="rk">' + (i + 1) + '</div>' +
          '<div class="b"><div class="tt">' + esc(t.title) + '</div>' +
          '<div class="mm">' + taskTags(t) + (pj ? '<span class="tag brand">' + esc(pj.name) + '</span>' : '<span class="tag">临时事项</span>') + '</div></div>' +
          '<div class="acts" style="display:flex;gap:4px">' +
            '<button class="icon-btn" data-act="task-done" data-id="' + t.id + '" title="标记完成">✓</button>' +
            '<button class="icon-btn" data-act="task-edit" data-id="' + t.id + '" title="编辑">✎</button>' +
          '</div></div>';
      }).join('') + '</div>' : emptyBox('★', '没有待办任务', '点「＋ 新增任务」添加')) +
    '</div>';
    html += '</div>';

    html += '<div class="grid-2" style="align-items:start">';
    html += '<div>' +
      sectionCard('⏰', 'warn', '今日截止', dueToday, '今天没有到期任务', '可以提前推进明后天的任务', { showPomo: true }) +
      sectionCard('⚠', 'danger', '已延期', overdue, '没有延期任务', '保持住', { showPomo: true }) +
    '</div>';
    html += '<div>' +
      sectionCard('⏳', 'warn', '等待别人', waiting, '没有等待中的事项', '所有事情都在自己手上', { showPomo: true }) +
      sectionCard('✓', 'ok', '今日已完成', doneToday, '今天还没有完成的任务', '完成第一项试试') +
    '</div>';
    html += '</div>';
  }

  el.innerHTML = html;
}

function renderFocus(el) {
  var dateStr = WORK_DATE || ymd(new Date());
  var list = WORK_DATE ? tasksForDate(WORK_DATE) : (S.tasks || []).filter(function (t) { return t.status !== 'done'; });
  list = list.sort(sortTasks);
  var html = '';
  html += '<div class="focus-view">' +
    '<div class="focus-head">' +
      '<div><h1>🍅 专注模式</h1><div class="desc">' + (WORK_DATE ? dateStr : '今天') + ' · ' + list.length + ' 项待处理</div></div>' +
      '<button class="btn" data-act="focus-mode">退出专注</button>' +
    '</div>' +
    '<div class="focus-body">' +
      (list.length ? taskListHTML(list, '◔', '没有任务', '点「＋ 新增任务」添加', { showPomo: true }) : emptyBox('🍅', '当前没有可专注的任务', '先添加或选择一些任务')) +
    '</div>' +
  '</div>';
  el.innerHTML = html;
  document.body.classList.add('in-focus');
}
function exitFocus() {
  FOCUS_MODE = false;
  document.body.classList.remove('in-focus');
  rerender();
}

/* ============================================================
   任务台账（ONES：ONS-ID / 内容 / 进度 / 完成情况 / 计划时间）
   ============================================================ */
var LEDGER_FILTER = { q: '', owner: 'all', status: 'all', project: 'all', month: 'all', src: 'all' };
ROUTES['work/tasks'] = { title: '任务台账', desc: 'ONES 任务清单，按负责人 / 状态 / 计划时间筛选', render: renderLedger };

function ledgerSort(a, b) {
  var ea = a.planEnd || '0000-00-00', eb = b.planEnd || '0000-00-00';
  if (ea !== eb) return ea < eb ? 1 : -1; /* 计划完成日期新的在前 */
  return String(a.onsId || '').localeCompare(String(b.onsId || ''));
}
function ledgerList() {
  var f = LEDGER_FILTER;
  var q = (f.q || '').trim().toLowerCase();
  return (S.tasks || []).filter(function (t) {
    if (f.src === 'ones' && !isOnesTask(t)) return false;
    if (f.src === 'local' && isOnesTask(t)) return false;
    if (f.owner !== 'all' && (t.owner || '') !== f.owner) return false;
    if (f.status !== 'all' && t.status !== f.status) return false;
    if (f.project === 'none') { if (t.projectId) return false; }
    else if (f.project !== 'all' && t.projectId !== f.project) return false;
    if (f.month !== 'all' && (t.planEnd || '').slice(0, 7) !== f.month) return false;
    if (q) {
      var hay = (t.title + ' ' + (t.onsId || '') + ' ' + (t.owner || '') + ' ' + (t.note || '')).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }).sort(ledgerSort);
}
function ledgerRow(t) {
  var pj = projectOf(t.projectId);
  var st = STATUS[t.status] || STATUS.todo;
  var prog = (typeof t.progress === 'number') ? t.progress : null;
  var progCls = prog === null ? 'mut' : (prog >= 100 ? 'ok' : (prog > 0 ? 'doing' : 'todo'));
  return '<div class="led-row' + (t.status === 'done' ? ' done' : '') + '">' +
    '<div class="lc-id">' + (t.onsId ? onsBadge(t.onsId) : '<span class="ons-badge none">—</span>') + '</div>' +
    '<div class="lc-main">' +
      '<div class="lt">' + taskLeadIcon(t) + esc(t.title) + '</div>' +
      '<div class="lm">' +
        (pj ? '<span class="tag brand">' + esc(pj.name) + '</span>' : '<span class="tag">临时事项</span>') +
        '<span class="due ' + (isOverdueTask(t) ? 'red' : dueClass(t.dueDate)) + '">截止 ' + esc(t.dueDate || '—') + (isOverdueTask(t) ? ' · 已延期' : '') + '</span>' +
        '<span class="tag ' + (PRIO[t.priority] || PRIO.mid).c + '">' + (PRIO[t.priority] || PRIO.mid).t + '优先</span>' +
      '</div>' +
    '</div>' +
    '<div class="lc-owner">' + esc(t.owner || '—') + '</div>' +
    '<div class="lc-prog"><span class="prog-chip ' + progCls + '"><i style="width:' + (prog || 0) + '%"></i><b>' + (prog === null ? '—' : prog + '%') + '</b></span></div>' +
    '<div class="lc-st"><span class="tag ' + st.c + '">' + esc(t.onesStatus || st.t) + '</span></div>' +
    '<div class="lc-plan">' + esc(t.planStart || '—') + ' <span class="arw">→</span> ' + esc(t.planEnd || '—') + '</div>' +
    '<div class="lc-acts">' +
      (t.onesUrl ? '<button class="icon-btn" data-act="open-url" data-url="' + esc(t.onesUrl) + '" title="打开 ONES 任务" aria-label="打开 ONES 任务">🔗</button>' : '') +
      '<button class="icon-btn" data-act="task-status" data-id="' + t.id + '" title="改状态" aria-label="改状态">⇄</button>' +
      '<button class="icon-btn" data-act="task-edit" data-id="' + t.id + '" title="编辑" aria-label="编辑">✎</button>' +
      '<button class="icon-btn danger" data-act="task-del" data-id="' + t.id + '" title="删除" aria-label="删除">✕</button>' +
    '</div>' +
  '</div>';
}
function renderLedger(el) {
  var all = S.tasks || [];
  var list = ledgerList();
  var facets = onesFacets();
  var onesN = all.filter(isOnesTask).length;
  var done = all.filter(function (t) { return t.status === 'done'; }).length;
  var doing = all.filter(function (t) { return t.status === 'doing'; }).length;
  var overdue = all.filter(isOverdueTask).length;

  var html = '';
  html += '<div class="page-note">共 ' + all.length +
    ' 条任务（ONES 导入 ' + onesN + ' 条）· 当前筛选命中 <b>' + list.length + '</b> 条</div>';

  html += '<div class="stat-row">' +
    '<div class="stat ic s-brand"><div class="st-ic">📋</div><div class="st-b"><div class="n">' + list.length + '</div><div class="l">筛选命中</div></div></div>' +
    '<div class="stat ic s-brand"><div class="st-ic">⏵</div><div class="st-b"><div class="n">' + doing + '</div><div class="l">进行中</div></div></div>' +
    '<div class="stat ic s-ok"><div class="st-ic">✅</div><div class="st-b"><div class="n">' + done + '</div><div class="l">已完成</div></div></div>' +
    '<div class="stat ic ' + (overdue ? 's-danger' : 's-ok') + '"><div class="st-ic">' + (overdue ? '⚠️' : '🛡️') + '</div><div class="st-b"><div class="n">' + overdue + '</div><div class="l">已延期</div></div></div>' +
  '</div>';

  var popts = '<option value="all">全部需求</option><option value="none">无关联需求</option>' +
    (S.projects || []).map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('');
  html += '<div class="card tight">' +
    '<div class="led-filters">' +
      '<input type="text" id="lg-q" placeholder="搜索 ONS-ID / 内容 / 负责人" value="' + esc(LEDGER_FILTER.q) + '">' +
      '<select id="lg-owner"><option value="all">全部负责人</option>' + facets.owners.map(function (o) {
        return '<option value="' + esc(o) + '"' + (LEDGER_FILTER.owner === o ? ' selected' : '') + '>' + esc(o) + '</option>';
      }).join('') + '</select>' +
      '<select id="lg-st"><option value="all">全部状态</option>' + Object.keys(STATUS).map(function (k) {
        return '<option value="' + k + '"' + (LEDGER_FILTER.status === k ? ' selected' : '') + '>' + STATUS[k].t + '</option>';
      }).join('') + '</select>' +
      '<select id="lg-month"><option value="all">全部计划月份</option>' + facets.months.map(function (m) {
        return '<option value="' + esc(m) + '"' + (LEDGER_FILTER.month === m ? ' selected' : '') + '>' + esc(m.replace('-', ' 年 ') + ' 月') + '</option>';
      }).join('') + '</select>' +
      '<select id="lg-proj">' + popts + '</select>' +
    '</div>' +
    '<div class="chips" style="margin-top:11px;margin-bottom:0">' +
      [['all', '全部来源'], ['ones', 'ONES'], ['local', '本地']].map(function (c) {
        return '<button class="chip ' + (LEDGER_FILTER.src === c[0] ? 'on' : '') + '" data-act="lg-src" data-v="' + c[0] + '">' + c[1] + '</button>';
      }).join('') +
      '<button class="chip" data-act="lg-reset" style="margin-left:auto">↺ 重置筛选</button>' +
    '</div>' +
  '</div>';

  html += '<div class="card">' +
    '<div class="card-hd"><div class="ico">▤</div><h3>任务清单</h3>' +
      '<span class="hint">' + list.length + ' / ' + all.length + ' 条</span>' +
      '<button class="btn sm" data-act="task-new">＋ 新建任务</button></div>';
  if (!list.length) {
    html += emptyBox('▤', '没有符合条件的任务', '调整筛选条件，或点「＋ 新建任务」');
  } else {
    html += '<div class="led-wrap"><div class="led">' +
      '<div class="led-hd"><div>ONS-ID</div><div>内容</div><div>负责人</div><div>进度</div><div>完成情况</div><div>计划时间</div><div>操作</div></div>' +
      list.map(ledgerRow).join('') +
    '</div></div>';
  }
  html += '</div>';

  el.innerHTML = html;

  var q = el.querySelector('#lg-q');
  q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { LEDGER_FILTER.q = q.value; rerender(); } });
  q.addEventListener('blur', function () { if (q.value !== LEDGER_FILTER.q) { LEDGER_FILTER.q = q.value; rerender(); } });
  var map = { owner: 'owner', st: 'status', ones: 'ones', month: 'month', proj: 'project' };
  Object.keys(map).forEach(function (k) {
    var sel = el.querySelector('#lg-' + k);
    if (!sel) return;
    sel.onchange = function () { LEDGER_FILTER[map[k]] = sel.value; rerender(); };
  });
}

/* ============================================================
   任务表单 / 操作
   ============================================================ */
function taskForm(task) {
  var isNew = !task;
  var t = task || { title: '', projectId: null, dueDate: '', dueTime: '', priority: 'mid', status: 'todo', focus: false, note: '', onesUrl: '', onsId: '', owner: '', progress: null, planStart: '', planEnd: '' };
  /* 所属项目：使用自定义预设菜单；若当前项目不在预设内（如 ONES 导入的需求），额外保留一项 */
  var curName = t.projectId ? ((projectOf(t.projectId) || {}).name || '') : '';
  var presets = (typeof PROJECT_PRESETS !== 'undefined') ? PROJECT_PRESETS.slice() : [];
  if (curName && presets.indexOf(curName) === -1) presets.unshift(curName);
  var pjOpts = '<option value="">（无 · 临时事项）</option>' +
    presets.map(function (n) {
      return '<option value="' + esc(n) + '"' + (curName === n ? ' selected' : '') + '>' + esc(n) + '</option>';
    }).join('');
  var body =
    '<div class="field"><label>任务名称<span class="req">*</span></label>' +
      '<input type="text" id="f-title" value="' + esc(t.title) + '" placeholder="必填" autocomplete="off"></div>' +
    '<div class="f-row">' +
      '<div class="field"><label>所属项目</label><select id="f-proj">' + pjOpts + '</select>' +
        '<div class="tip">不选即为临时事项</div></div>' +
      '<div class="field"><label>优先级</label><select id="f-prio">' +
        ['high', 'mid', 'low'].map(function (k) {
          return '<option value="' + k + '"' + (t.priority === k ? ' selected' : '') + '>' + PRIO[k].t + '</option>';
        }).join('') + '</select></div>' +
    '</div>' +
    '<div class="f-row">' +
      '<div class="field"><label>ONS-ID</label><input type="text" id="f-ons" value="' + esc(t.onsId || '') + '" placeholder="如 #67147（可空）"></div>' +
      '<div class="field"><label>负责人</label><input type="text" id="f-owner" value="' + esc(t.owner || '') + '" placeholder="如 毛华良"></div>' +
    '</div>' +
    '<div class="f-row">' +
      '<div class="field" style="flex:2"><label>ONES 链接</label><input type="url" id="f-oneslink" value="' + esc(t.onesUrl || '') + '" placeholder="粘贴 ONES 任务链接，保存后可点击跳转"></div>' +
      '<div class="field"><label>状态</label><select id="f-status">' +
        Object.keys(STATUS).map(function (k) {
          return '<option value="' + k + '"' + (t.status === k ? ' selected' : '') + '>' + STATUS[k].t + '</option>';
        }).join('') + '</select></div>' +
    '</div>' +
    '<div class="f-row">' +
      '<div class="field"><label>计划开始日期</label><input type="date" id="f-pstart" value="' + esc(t.planStart || '') + '"></div>' +
      '<div class="field"><label>计划完成日期</label><input type="date" id="f-pend" value="' + esc(t.planEnd || '') + '"></div>' +
    '</div>' +
    '<div class="field"><label>进度（%）</label><input type="number" id="f-prog" min="0" max="100" step="5" value="' + (typeof t.progress === 'number' ? t.progress : '') + '" placeholder="留空表示暂无进度">' +
      '<div class="tip">ONES 任务导入时会带上原进度；本地任务可留空。</div></div>' +
    '<div class="f-row">' +
      '<div class="field"><label>截止日期</label><input type="date" id="f-date" value="' + esc(t.dueDate || '') + '"></div>' +
      '<div class="field"><label>截止时间</label><input type="time" id="f-time" value="' + esc(t.dueTime || '') + '">' +
        '<div class="tip">留空按当天 23:59 计</div></div>' +
    '</div>' +
    '<label class="check"><input type="checkbox" id="f-focus"' + (t.focus ? ' checked' : '') + '><span>标记为「今日重点」</span></label>' +
    '<div class="field" style="margin-top:12px"><label>任务详情</label><textarea id="f-note" placeholder="填任务详情、步骤、验收标准、依赖…">' + esc(t.note || '') + '</textarea></div>';

  var wrap = openModal({
    title: isNew ? '新建任务' : '编辑任务',
    body: body,
    footer: (isNew ? '' : '<button class="btn danger" data-del="1">删除</button>') +
      '<button class="btn" data-no="1">取消</button><button class="btn pri" data-ok="1">保存</button>'
  });
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
  if (!isNew) {
    wrap.querySelector('[data-del]').onclick = function () {
      closeModal(wrap);
      deleteTask(t.id);
    };
  }
  wrap.querySelector('[data-ok]').onclick = function () {
    var title = wrap.querySelector('#f-title').value.trim();
    if (!title) { toast('任务名称必填', 'warn'); wrap.querySelector('#f-title').focus(); return; }
    var stNew = wrap.querySelector('#f-status').value;
    var progRaw = wrap.querySelector('#f-prog').value.trim();
    var pName = wrap.querySelector('#f-proj').value;
    var obj = {
      title: title,
      projectId: pName ? findOrCreateProject(pName) : null,
      dueDate: wrap.querySelector('#f-date').value,
      dueTime: wrap.querySelector('#f-time').value,
      priority: wrap.querySelector('#f-prio').value,
      focus: wrap.querySelector('#f-focus').checked,
      note: wrap.querySelector('#f-note').value.trim(),
      onesUrl: wrap.querySelector('#f-oneslink').value.trim(),
      onsId: wrap.querySelector('#f-ons').value.trim(),
      owner: wrap.querySelector('#f-owner').value.trim(),
      planStart: wrap.querySelector('#f-pstart').value,
      planEnd: wrap.querySelector('#f-pend').value,
      progress: progRaw === '' ? null : Math.max(0, Math.min(100, parseInt(progRaw, 10) || 0))
    };
    if (isNew) {
      var nt = Object.assign({
        id: uid(), status: stNew,
        createdAt: nowISO(), updatedAt: nowISO(),
        completedAt: stNew === 'done' ? nowISO() : '',
        statusChangedAt: nowISO()
      }, obj);
      S.tasks.push(nt);
      if (commit()) toast('已新增任务', 'ok');
    } else {
      if (stNew !== t.status) { t.status = stNew; t.statusChangedAt = nowISO(); }
      if (stNew === 'done' && !t.completedAt) t.completedAt = nowISO();
      if (stNew !== 'done') t.completedAt = '';
      Object.keys(obj).forEach(function (k) { t[k] = obj[k]; });
      t.updatedAt = nowISO();
      if (commit()) toast('已保存修改', 'ok');
    }
    closeModal(wrap);
    rerender();
  };
}

function toggleTaskDone(id) {
  var t = getTask(id); if (!t) return;
  if (t.status === 'done') {
    t.status = 'todo'; t.completedAt = '';
    t.statusChangedAt = nowISO(); t.updatedAt = nowISO();
    if (commit()) toast('已取消完成：' + t.title);
  } else {
    t.status = 'done'; t.completedAt = nowISO();
    t.statusChangedAt = nowISO(); t.updatedAt = nowISO();
    if (commit()) toast('已完成：' + t.title, 'ok');
  }
  rerender();
}
function getTask(id) { return (S.tasks || []).filter(function (t) { return t.id === id; })[0] || null; }
function deleteTask(id) {
  var t = getTask(id); if (!t) return;
  confirmDialog({ title: '删除任务', message: '<b>' + esc(t.title) + '</b><br>删除后无法恢复，确定继续吗？', danger: true, confirmText: '删除' })
    .then(function (ok) {
      if (!ok) return;
      S.tasks = S.tasks.filter(function (x) { return x.id !== id; });
      if (commit()) toast('已删除任务');
      rerender();
    });
}
function changeStatusDialog(id) {
  var t = getTask(id); if (!t) return;
  var wrap = openModal({
    title: '修改状态：' + t.title,
    body: '<div style="display:flex;flex-direction:column;gap:8px">' +
      Object.keys(STATUS).map(function (k) {
        return '<button class="btn lg ' + (t.status === k ? 'pri' : '') + '" data-st="' + k + '" style="justify-content:flex-start">' + STATUS[k].t + (t.status === k ? '（当前）' : '') + '</button>';
      }).join('') + '</div>' +
      '<div class="tip" style="margin-top:10px">改为「等待别人」会重新开始计算等待时长，超过 3 天会在风险雷达中提示。</div>',
    footer: '<button class="btn" data-no="1">关闭</button>'
  });
  wrap.querySelectorAll('[data-st]').forEach(function (b) {
    b.onclick = function () {
      var k = b.getAttribute('data-st');
      if (k !== t.status) { t.status = k; t.statusChangedAt = nowISO(); }
      if (k === 'done' && !t.completedAt) t.completedAt = nowISO();
      if (k !== 'done') t.completedAt = '';
      t.updatedAt = nowISO();
      commit(); closeModal(wrap); rerender();
      toast('状态已改为「' + STATUS[k].t + '」', 'ok');
    };
  });
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
}
/* ---------------- 番茄钟 ---------------- */
function pomoTimeLeft() {
  if (!POMO || POMO.paused) return null;
  return Math.max(0, POMO.endAt - Date.now());
}
function fmtMs(ms) {
  var m = Math.floor(ms / 60000);
  var s = Math.floor((ms % 60000) / 1000);
  return p2(m) + ':' + p2(s);
}
function startPomo(id) {
  var t = getTask(id); if (!t) return;
  if (POMO) { clearInterval(POMO.timerId); POMO = null; }
  POMO = { taskId: id, endAt: Date.now() + 25 * 60 * 1000, paused: false, timerId: null };
  renderPomoModal();
  POMO.timerId = setInterval(function () {
    if (!POMO || POMO.paused) return;
    var left = pomoTimeLeft();
    var el = document.getElementById('pomo-timer');
    if (el) el.textContent = fmtMs(left);
    if (left <= 0) {
      clearInterval(POMO.timerId);
      POMO = null;
      closeModal();
      toast('🍅 专注时间结束：' + t.title, 'ok', 5000);
      if (t.status !== 'done') { t.status = 'doing'; t.statusChangedAt = nowISO(); t.updatedAt = nowISO(); commit(); rerender(); }
    }
  }, 1000);
}
function renderPomoModal() {
  if (!POMO) return;
  var t = getTask(POMO.taskId) || { title: '任务' };
  var wrap = openModal({
    title: '🍅 专注中：' + t.title,
    body: '<div style="text-align:center;padding:20px 10px">' +
      '<div id="pomo-timer" style="font-size:64px;font-weight:700;letter-spacing:-2px;color:var(--brand);font-family:var(--mono)">25:00</div>' +
      '<div style="font-size:13.5px;color:var(--ink-3);margin-top:8px">25 分钟倒计时，专注于当前任务</div></div>',
    footer: '<button class="btn" data-act="pomo-pause">暂停</button>' +
      '<button class="btn danger" data-act="pomo-stop">放弃</button>' +
      '<button class="btn ok" data-act="pomo-done">完成</button>'
  });
  /* buttons handled by global dispatcher */
}
function pausePomo() {
  if (!POMO) return;
  if (POMO.paused) {
    POMO.endAt = Date.now() + POMO.left;
    POMO.paused = false;
    toast('继续专注');
  } else {
    POMO.left = POMO.endAt - Date.now();
    POMO.paused = true;
    toast('已暂停');
  }
  rerender(); // if modal is open, we'd need to update button text; for now just toggle
}
function stopPomo() {
  if (POMO) { clearInterval(POMO.timerId); POMO = null; }
  closeModal();
  toast('已放弃本次专注');
}
function donePomo() {
  var id = POMO ? POMO.taskId : null;
  if (POMO) { clearInterval(POMO.timerId); POMO = null; }
  closeModal();
  if (id) {
    var t = getTask(id); if (t && t.status !== 'done') { toggleTaskDone(id); return; }
  }
  rerender();
}

function changeDueDialog(id) {
  var t = getTask(id); if (!t) return;
  var wrap = openModal({
    title: '修改截止：' + t.title,
    body: '<div class="f-row">' +
        '<div class="field"><label>截止日期</label><input type="date" id="d-date" value="' + esc(t.dueDate || '') + '"></div>' +
        '<div class="field"><label>截止时间</label><input type="time" id="d-time" value="' + esc(t.dueTime || '') + '"></div>' +
      '</div>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap">' +
        [['今天', 0], ['明天', 1], ['后天', 2], ['下周', 7]].map(function (x) {
          return '<button class="btn sm" data-q="' + x[1] + '">' + x[0] + '</button>';
        }).join('') +
        '<button class="btn sm" data-clear="1">清除截止</button>' +
      '</div>',
    footer: '<button class="btn" data-no="1">取消</button><button class="btn pri" data-ok="1">保存</button>'
  });
  var di = wrap.querySelector('#d-date'), ti = wrap.querySelector('#d-time');
  wrap.querySelectorAll('[data-q]').forEach(function (b) {
    b.onclick = function () { di.value = dOff(parseInt(b.getAttribute('data-q'), 10)); };
  });
  wrap.querySelector('[data-clear]').onclick = function () { di.value = ''; ti.value = ''; };
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
  wrap.querySelector('[data-ok]').onclick = function () {
    t.dueDate = di.value; t.dueTime = ti.value; t.updatedAt = nowISO();
    commit(); closeModal(wrap); rerender();
    toast(t.dueDate ? '截止已改为 ' + fmtDue(t.dueDate, t.dueTime) : '已清除截止时间', 'ok');
  };
}
