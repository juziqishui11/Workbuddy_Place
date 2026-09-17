/* ============================================================
   25-domain.js —— 业务计算：任务/项目/风险/周统计/周报
   ============================================================ */
var PRIO = { high: { t: '高', c: 'p-high', w: 3 }, mid: { t: '中', c: 'p-mid', w: 2 }, low: { t: '低', c: 'p-low', w: 1 } };
var STATUS = {
  todo: { t: '待处理', c: 's-todo' },
  doing: { t: '进行中', c: 's-doing' },
  waiting: { t: '等待别人', c: 's-waiting' },
  done: { t: '已完成', c: 's-done' }
};
var PROJ_STATUS = {
  normal: { t: '正常', c: 'ok' },
  due_soon: { t: '临期', c: 'warn' },
  blocked: { t: '阻塞', c: 'danger' },
  done: { t: '已完成', c: 'ok' }
};

/* ---------------- 任务 ---------------- */
function taskDueTs(t) {
  if (!t || !t.dueDate) return null;
  var d = parseLocal(t.dueDate, t.dueTime || '23:59');
  return d ? d.getTime() : null;
}
function isOverdueTask(t) {
  if (!t || t.status === 'done') return false;
  var ts = taskDueTs(t);
  return ts !== null && ts < Date.now();
}
function isDueToday(t) {
  return !!(t && t.status !== 'done' && t.dueDate && dayDiff(t.dueDate) === 0);
}
function dueSoon24h(t) {
  if (!t || t.status === 'done') return false;
  var ts = taskDueTs(t);
  if (ts === null || ts < Date.now()) return false;
  return (ts - Date.now()) <= 24 * 3600 * 1000;
}
function projectOf(id) {
  if (!id) return null;
  return (S.projects || []).filter(function (p) { return p.id === id; })[0] || null;
}
/** 按名称取项目；不存在则创建一个（用于「新增任务」的自定义项目菜单）。 */
function findOrCreateProject(name) {
  name = (name || '').trim();
  if (!name) return null;
  var p = (S.projects || []).filter(function (x) { return x.name === name; })[0];
  if (p) return p.id;
  var now = nowISO();
  p = {
    id: uid(), name: name, status: 'normal', progress: 0, priority: 'mid',
    owner: '', nextAction: '', note: '', startDate: '', dueDate: '',
    onsId: '', source: 'local', createdAt: now, updatedAt: now, completedAt: ''
  };
  S.projects.push(p);
  return p.id;
}
function openTasksOf(pid) {
  return (S.tasks || []).filter(function (t) { return t.projectId === pid && t.status !== 'done'; });
}

/** 重要度打分（越大越靠前） */
function taskScore(t) {
  if (t.status === 'done') return -1;
  var high = t.priority === 'high';
  if (isOverdueTask(t)) return high ? 100 : 92;
  if (isDueToday(t)) return high ? 90 : 80;
  if (t.focus) return 70;
  var ts = taskDueTs(t);
  if (ts === null) return 40;
  var days = (ts - Date.now()) / 86400000;
  return 40 + Math.max(0, 20 - days) + (high ? 3 : 0);
}
function sortTasks(a, b) {
  var sa = taskScore(a), sb = taskScore(b);
  if (sb !== sa) return sb - sa;
  var ta = taskDueTs(a), tb2 = taskDueTs(b);
  if (ta === null && tb2 === null) return (PRIO[b.priority] ? PRIO[b.priority].w : 0) - (PRIO[a.priority] ? PRIO[a.priority].w : 0);
  if (ta === null) return 1;
  if (tb2 === null) return -1;
  if (ta !== tb2) return ta - tb2;
  return (PRIO[b.priority] ? PRIO[b.priority].w : 0) - (PRIO[a.priority] ? PRIO[a.priority].w : 0);
}
/** 今日最重要的 3 件事 */
function top3Tasks() {
  return (S.tasks || []).filter(function (t) { return t.status !== 'done'; })
    .sort(sortTasks).slice(0, 3);
}
function todayStats() {
  var t = S.tasks || [];
  var open = t.filter(function (x) { return x.status !== 'done'; });
  return {
    todayTodo: open.filter(function (x) { return x.dueDate && dayDiff(x.dueDate) === 0; }).length,
    todayDone: t.filter(function (x) {
      return x.status === 'done' && x.completedAt && ymd(new Date(x.completedAt)) === ymd(new Date());
    }).length,
    overdue: t.filter(isOverdueTask).length,
    openProjects: (S.projects || []).filter(function (p) { return p.status !== 'done'; }).length,
    waiting: open.filter(function (x) { return x.status === 'waiting'; }).length,
    openTotal: open.length
  };
}

/* ---------------- 项目 ---------------- */
function projectRisk(p) {
  if (!p) return { key: 'normal', label: '正常', cls: 'ok', sev: 0 };
  if (p.status === 'done') return { key: 'done', label: '已完成', cls: 'ok', sev: 0 };
  if (p.status === 'blocked') return { key: 'blocked', label: '阻塞', cls: 'danger', sev: 100 };
  var n = p.dueDate ? dayDiff(p.dueDate) : null;
  if (n !== null && n < 0) return { key: 'overdue', label: '延期', cls: 'danger', sev: 95 };
  if (n !== null && n <= 3) return { key: 'due_soon', label: '临期', cls: 'warn', sev: 70 };
  return { key: 'normal', label: '正常', cls: 'ok', sev: 0 };
}
function projectRemainDays(p) {
  if (!p || !p.dueDate) return null;
  return dayDiff(p.dueDate);
}

/* ---------------- 风险雷达 ---------------- */
function riskItems() {
  var out = [];
  (S.tasks || []).forEach(function (t) {
    if (t.status === 'done') return;
    if (isOverdueTask(t)) {
      var d = Math.abs(dayDiff(t.dueDate) || 0);
      out.push({
        id: t.id, kind: 'task', sev: 100 + Math.min(d, 30),
        title: t.title,
        desc: '任务已逾期 ' + d + ' 天（截止 ' + fmtDue(t.dueDate, t.dueTime) + '）' + (t.projectId ? ' · ' + ((projectOf(t.projectId) || {}).name || '') : ''),
        tag: '逾期', cls: 'danger'
      });
    } else if (dueSoon24h(t)) {
      out.push({
        id: t.id, kind: 'task', sev: 80,
        title: t.title,
        desc: '24 小时内截止 · ' + fmtDue(t.dueDate, t.dueTime) + (t.projectId ? ' · ' + ((projectOf(t.projectId) || {}).name || '') : ''),
        tag: '即将截止', cls: 'warn'
      });
    }
    if (t.status === 'waiting') {
      var w = daysSince(t.statusChangedAt);
      if (w !== null && w > 3) {
        out.push({
          id: t.id, kind: 'task', sev: 60 + Math.min(w, 30),
          title: t.title,
          desc: '等待别人已 ' + w + ' 天未推进，建议主动催办或改为自己处理',
          tag: '等待超时', cls: 'warn'
        });
      }
    }
  });
  (S.projects || []).forEach(function (p) {
    var r = projectRisk(p);
    if (r.key === 'blocked') {
      out.push({
        id: p.id, kind: 'project', sev: 105,
        title: p.name,
        desc: '项目被手动标记为阻塞 · 下一步：' + (p.nextAction || '待补充'),
        tag: '阻塞', cls: 'danger'
      });
    } else if (r.key === 'overdue') {
      out.push({
        id: p.id, kind: 'project', sev: 98,
        title: p.name,
        desc: '项目已超过截止日期 ' + Math.abs(projectRemainDays(p)) + ' 天且未完成 · 进度 ' + (p.progress || 0) + '%',
        tag: '项目延期', cls: 'danger'
      });
    } else if (r.key === 'due_soon') {
      out.push({
        id: p.id, kind: 'project', sev: 70,
        title: p.name,
        desc: '距截止还有 ' + projectRemainDays(p) + ' 天 · 进度 ' + (p.progress || 0) + '% · 下一步：' + (p.nextAction || '待补充'),
        tag: '项目临期', cls: 'warn'
      });
    }
  });
  out.sort(function (a, b) { return b.sev - a.sev; });
  return out;
}
function sevLevel(sev) { return sev >= 90 ? 'red' : (sev >= 60 ? 'amber' : 'green'); }
function sevIcon(sev) { return sev >= 90 ? '!' : (sev >= 60 ? '·' : '✓'); }

/* ---------------- 本周统计（周一为起点） ---------------- */
function weekStats() {
  var t = S.tasks || [];
  var added = t.filter(function (x) { return inThisWeek(x.createdAt); });
  var done = t.filter(function (x) { return x.status === 'done' && inThisWeek(x.completedAt); });
  var open = t.filter(function (x) { return x.status !== 'done'; });
  var rate = (done.length + open.length) ? Math.round(done.length / (done.length + open.length) * 100) : 0;
  var important = done.filter(function (x) { return x.priority === 'high'; });
  var overdue = t.filter(isOverdueTask);
  var nextHigh = open.filter(function (x) {
    if (x.priority !== 'high') return false;
    if (isOverdueTask(x)) return true;
    var n = x.dueDate ? dayDiff(x.dueDate) : null;
    return n !== null && n <= 7;
  }).sort(sortTasks);
  return {
    added: added.length, done: done.length, open: open.length,
    rate: rate, important: important, overdue: overdue, nextHigh: nextHigh,
    weekStart: startOfWeek(new Date())
  };
}

/* ---------------- 月度统计（自然月） ---------------- */
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function inThisMonth(iso) {
  if (!iso) return false;
  var d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  var s = startOfMonth(new Date());
  var e = new Date(s.getFullYear(), s.getMonth() + 1, 1);
  return d >= s && d < e;
}
/** 近 n 天每天完成任务数（用于柱状图） */
function doneByDay(n) {
  var out = [];
  var set = {};
  (S.tasks || []).forEach(function (t) {
    if (t.status !== 'done' || !t.completedAt) return;
    var k = ymd(new Date(t.completedAt));
    if (!set[k]) set[k] = 0;
    set[k]++;
  });
  for (var i = n - 1; i >= 0; i--) {
    var ds = dOff(-i);
    out.push({ date: ds, n: set[ds] || 0 });
  }
  return out;
}
/** 近 n 周每周完成任务数 */
function doneByWeek(n) {
  var out = [];
  var s = startOfWeek(new Date());
  for (var i = n - 1; i >= 0; i--) {
    var ws = new Date(s); ws.setDate(ws.getDate() - 7 * i);
    var we = new Date(ws); we.setDate(we.getDate() + 7);
    var c = (S.tasks || []).filter(function (t) {
      if (t.status !== 'done' || !t.completedAt) return false;
      var d = new Date(t.completedAt);
      return d >= ws && d < we;
    }).length;
    out.push({ label: (ws.getMonth() + 1) + '/' + ws.getDate(), n: c, start: ymd(ws) });
  }
  return out;
}
function monthStats() {
  var t = S.tasks || [];
  var added = t.filter(function (x) { return inThisMonth(x.createdAt); });
  var done = t.filter(function (x) { return x.status === 'done' && inThisMonth(x.completedAt); });
  var open = t.filter(function (x) { return x.status !== 'done'; });
  var rate = (done.length + open.length) ? Math.round(done.length / (done.length + open.length) * 100) : 0;
  var byProj = (S.projects || []).map(function (p) {
    var all = (S.tasks || []).filter(function (x) { return x.projectId === p.id; });
    return {
      project: p,
      total: all.length,
      done: all.filter(function (x) { return x.status === 'done'; }).length,
      open: all.filter(function (x) { return x.status !== 'done'; }).length
    };
  });
  var noProj = (S.tasks || []).filter(function (x) { return !x.projectId; });
  if (noProj.length) {
    byProj.push({
      project: { id: '', name: '临时事项（无项目）' },
      total: noProj.length,
      done: noProj.filter(function (x) { return x.status === 'done'; }).length,
      open: noProj.filter(function (x) { return x.status !== 'done'; }).length
    });
  }
  return {
    added: added.length, done: done.length, open: open.length, rate: rate,
    byProj: byProj, monthStart: startOfMonth(new Date()),
    label: (new Date().getFullYear()) + '-' + p2(new Date().getMonth() + 1)
  };
}

/* ---------------- 各模块计数（首页宫格用） ---------------- */
function moduleCounts() {
  var st = todayStats();
  var w = weekStats();
  var learnPct = fdePct();
  return {
    overview: st.todayTodo + st.overdue,
    work: st.openTotal,
    share: (S.articles || []).length,
    learning: learnPct,
    skills: (S.skills || []).length,
    docs: (S.docs || []).length,
    toolbox: (S.tools || []).length + (S.works || []).length,
    stats: w.rate,
    roadmap: (S.roadmap || []).filter(function (r) { return r.status !== '已完成'; }).length,
    _todayTodo: st.todayTodo, _overdue: st.overdue, _open: st.openTotal,
    _done: w.done, _learnPct: learnPct
  };
}

/* ---------------- 周报 ---------------- */
function generateReport() {
  var w = weekStats();
  var L = [];
  var d = new Date();
  var ws = ymd(w.weekStart), we = dOff(0);
  L.push('工作周报（' + ws + ' — ' + we + '）');
  L.push('');
  L.push('一、本周完成');
  if (w.done === 0) {
    L.push('· 本周暂无已完成任务记录。');
  } else {
    w.done && (S.tasks || []).filter(function (x) { return x.status === 'done' && inThisWeek(x.completedAt); })
      .sort(function (a, b) { return (PRIO[b.priority] ? PRIO[b.priority].w : 0) - (PRIO[a.priority] ? PRIO[a.priority].w : 0); })
      .forEach(function (x) {
        var pj = projectOf(x.projectId);
        L.push('· ' + x.title + (pj ? '（' + pj.name + '）' : '') + '　[' + (PRIO[x.priority] ? PRIO[x.priority].t : '中') + '优先级]' + (x.completedAt ? '　完成于 ' + ymd(new Date(x.completedAt)) : ''));
      });
    L.push('· 本周共完成 ' + w.done + ' 项，完成率 ' + w.rate + '%。' + (w.important.length ? '其中高优先级任务 ' + w.important.length + ' 项。' : ''));
  }
  L.push('');
  L.push('二、项目进展');
  var ps = (S.projects || []);
  if (!ps.length) {
    L.push('· 暂无项目记录。');
  } else {
    ps.forEach(function (p) {
      var r = projectRisk(p);
      var remain = projectRemainDays(p);
      var op = openTasksOf(p.id).length;
      L.push('· ' + p.name + '：进度 ' + (p.progress || 0) + '%，状态「' + r.label + '」' +
        (remain === null ? '' : (remain < 0 ? '（已超期 ' + (-remain) + ' 天）' : '（剩余 ' + remain + ' 天）')) +
        '，未完成任务 ' + op + ' 项。');
      if (p.nextAction) L.push('  下一步：' + p.nextAction);
    });
  }
  L.push('');
  L.push('三、问题与风险');
  var risks = riskItems();
  if (!risks.length) {
    L.push('· 当前无逾期任务、无临期项目、无长期等待事项。');
  } else {
    risks.slice(0, 12).forEach(function (r) {
      L.push('· [' + r.tag + '] ' + r.title + '：' + r.desc);
    });
    if (risks.length > 12) L.push('· 其余 ' + (risks.length - 12) + ' 条风险见「风险雷达」。');
  }
  L.push('');
  L.push('四、下周重点');
  if (!w.nextHigh.length) {
    L.push('· 暂无高优先级待办，建议从风险雷达中挑选 1–2 项清理。');
  } else {
    w.nextHigh.slice(0, 8).forEach(function (x) {
      var pj = projectOf(x.projectId);
      L.push('· ' + x.title + (pj ? '（' + pj.name + '）' : '') + '　截止：' + fmtDue(x.dueDate, x.dueTime) + (isOverdueTask(x) ? '（已逾期，需优先清理）' : ''));
    });
  }
  return L.join('\n');
}
