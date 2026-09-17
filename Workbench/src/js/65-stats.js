/* ============================================================
   65-stats.js —— 复盘统计：周复盘 / 月复盘 + 图表
   ============================================================ */
ROUTES['stats/week'] = { title: '周复盘', desc: '按自然周统计，自动产出周报草稿', render: renderWeekReview };
ROUTES['stats/month'] = { title: '月复盘', desc: '按自然月统计，看清一整月的节奏', render: renderMonthReview };

/* ---------------- 通用图表（纯 CSS 柱状图） ---------------- */
function barChart(data, opt) {
  opt = opt || {};
  if (!data.length) return emptyBox('◱', '暂无数据', '完成任务后这里会出现柱状图');
  var max = Math.max.apply(null, data.map(function (d) { return d.n; }));
  if (max <= 0) max = 1;
  return '<div class="bars">' + data.map(function (d) {
    var h = Math.round(d.n / max * 100);
    var cls = d.n === 0 ? 'zero' : (opt.danger ? 'danger' : '');
    return '<div class="bar-col' + (d.hot ? ' hot' : '') + '">' +
      '<div class="bar-wrap"><i class="' + cls + '" style="height:' + (d.n ? Math.max(h, 6) : 2) + '%"></i></div>' +
      '<b>' + d.n + '</b>' +
      '<span>' + esc(d.label) + '</span>' +
      '</div>';
  }).join('') + '</div>';
}
function miniBars(list) {
  /* list: [{name, done, open}] 横向堆叠条 */
  if (!list.length) return emptyBox('◱', '暂无数据');
  var max = Math.max.apply(null, list.map(function (x) { return x.total || (x.done + x.open); }));
  if (max <= 0) max = 1;
  return '<div class="hbars">' + list.map(function (x) {
    var total = x.total || (x.done + x.open);
    var dp = Math.round(x.done / max * 100);
    var op = Math.round(x.open / max * 100);
    return '<div class="hb">' +
      '<div class="hb-t"><span>' + esc(x.name) + '</span><b>' + x.done + '/' + total + '</b></div>' +
      '<div class="hb-b"><i class="d" style="width:' + dp + '%"></i><i class="o" style="width:' + op + '%"></i></div>' +
      '</div>';
  }).join('') + '</div>';
}

/* ============================================================
   周复盘
   ============================================================ */
function renderWeekReview(el) {
  var w = weekStats();
  var we = new Date(w.weekStart); we.setDate(we.getDate() + 6);

  var html = '';
  html += '<div class="chips">' +
    '<button class="chip on" data-nav="stats/week">周复盘</button>' +
    '<button class="chip" data-nav="stats/month">月复盘</button>' +
    '<button class="chip" data-act="gen-report">整理本周周报</button></div>';

  html += '<div class="page-note">统计区间：' + ymd(w.weekStart) + '（周一）— ' + ymd(we) + '（周日）</div>';

  html += '<div class="stat-row">' +
    '<div class="stat s-brand"><div class="n">' + w.added + '</div><div class="l">本周新增任务</div></div>' +
    '<div class="stat s-ok"><div class="n">' + w.done + '</div><div class="l">本周完成任务</div></div>' +
    '<div class="stat s-warn"><div class="n">' + w.open + '</div><div class="l">当前未完成</div></div>' +
    '<div class="stat ' + (w.rate >= 60 ? 's-ok' : (w.rate >= 30 ? 's-warn' : 's-danger')) + '"><div class="n">' + w.rate + '<small style="font-size:15px">%</small></div><div class="l">本周完成率</div></div>' +
  '</div>';

  /* 本周每日完成趋势 */
  var days = [];
  for (var i = 6; i >= 0; i--) {
    var ds = dOff(-i);
    var n = (S.tasks || []).filter(function (t) {
      return t.status === 'done' && t.completedAt && ymd(new Date(t.completedAt)) === ds;
    }).length;
    days.push({ label: ds.slice(5).replace('-', '/'), n: n, hot: i === 0 });
  }
  html += '<div class="card"><div class="card-hd"><div class="ico">◱</div><h3>本周每日完成量</h3>' +
    '<span class="hint">最近 7 天</span></div>' + barChart(days) + '</div>';

  /* 本周完成的重要任务 */
  html += '<div class="card"><div class="card-hd"><div class="ico ok">★</div><h3>本周完成的重要任务</h3>' +
    '<span class="hint">高优先级且本周完成</span></div>' +
    (w.important.length ? '<div class="list">' + w.important.map(taskRow).join('') + '</div>'
      : emptyBox('★', '本周还没有完成高优先级任务', '完成一件重要的事，比完成十件琐事更有价值')) +
    '</div>';

  html += '<div class="grid-2" style="align-items:start">';

  /* 各项目状态 */
  html += '<div class="card" style="margin-bottom:0"><div class="card-hd"><div class="ico">◫</div><h3>当前各项目状态</h3></div>';
  var ps = S.projects || [];
  html += ps.length ? '<table class="tbl"><thead><tr><th>项目</th><th>进度</th><th>状态</th><th>未完成</th></tr></thead><tbody>' +
    ps.map(function (p) {
      var r = projectRisk(p);
      var remain = projectRemainDays(p);
      return '<tr><td><b>' + esc(p.name) + '</b>' +
        (remain === null ? '' : '<div style="font-size:12px;color:var(--ink-3)">' + (remain < 0 ? '超期 ' + (-remain) + ' 天' : '剩余 ' + remain + ' 天') + '</div>') +
        '</td><td>' + (p.progress || 0) + '%</td><td><span class="tag ' + r.cls + '">' + r.label + '</span></td>' +
        '<td>' + openTasksOf(p.id).length + '</td></tr>';
    }).join('') + '</tbody></table>' : emptyBox('◫', '还没有项目');
  html += '</div>';

  /* 当前延期任务 */
  html += '<div class="card" style="margin-bottom:0"><div class="card-hd"><div class="ico danger">⚠</div><h3>当前延期任务</h3>' +
    '<span class="hint">' + w.overdue.length + ' 项</span></div>' +
    taskListHTML(w.overdue, '✓', '没有延期任务', '节奏保持得不错') + '</div>';

  html += '</div>';

  /* 下周仍需处理的高优先级任务 */
  html += '<div class="card"><div class="card-hd"><div class="ico warn">➤</div><h3>下周仍需继续处理</h3>' +
    '<span class="hint">高优先级且未完成（含逾期 / 7 天内截止）</span></div>' +
    taskListHTML(w.nextHigh, '➤', '没有高优先级遗留任务', '下周可以安排新的重点') + '</div>';

  /* 周报 */
  html += '<div class="card"><div class="card-hd"><div class="ico">📝</div><h3>本周周报</h3>' +
    '<button class="btn pri" data-act="gen-report">整理本周周报</button></div>' +
    '<div id="report-box">' + emptyBox('📝', '点击「整理本周周报」', '会根据工作台里的真实数据生成四段式草稿') + '</div></div>';

  el.innerHTML = html;
}

function generateReportDialog() {
  var text = generateReport();
  var wrap = openModal({
    title: '本周周报草稿',
    size: 'wide',
    body: '<div class="report" id="rp-text">' + esc(text) + '</div>' +
      '<div class="tip" style="margin-top:10px;font-size:12px;color:var(--ink-3)">内容全部来自工作台中的真实记录，可直接复制后微调。</div>',
    footer: '<button class="btn" data-no="1">关闭</button>' +
      '<button class="btn" data-dl="1">下载 .txt</button>' +
      '<button class="btn pri" data-copy="1">一键复制</button>'
  });
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
  wrap.querySelector('[data-copy]').onclick = function () {
    copyText(text).then(function (ok) { toast(ok ? '周报已复制到剪贴板' : '复制失败，请手动选中复制', ok ? 'ok' : 'error'); });
  };
  wrap.querySelector('[data-dl]').onclick = function () {
    try {
      var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = '周报-' + ymd(new Date()) + '.txt';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      toast('已下载周报', 'ok');
    } catch (e) { toast('下载失败', 'error'); }
  };
}

/* ============================================================
   月复盘
   ============================================================ */
function renderMonthReview(el) {
  var m = monthStats();
  var mb = monthStats();
  var weeks = doneByWeek(4);
  var days30 = doneByDay(30).map(function (d, i) {
    return { label: (i % 5 === 0) ? d.date.slice(5).replace('-', '/') : '', n: d.n };
  });
  var learnPct = fdePct();
  var learnDone = fdeDoneCount(), learnTotal = fdeTotalDays();
  var qrs = S.quizRecords || [];
  var quizCnt = qrs.length;
  var quizAvgV = quizAvg();
  var quizBestV = quizBest();
  var learnHours = Math.round(fdeDoneMinutes() / 60 * 10) / 10;

  var html = '';
  html += '<div class="chips">' +
    '<button class="chip" data-nav="stats/week">周复盘</button>' +
    '<button class="chip on" data-nav="stats/month">月复盘</button>' +
    '<button class="chip" data-act="gen-month-report">整理本月月报</button></div>';

  html += '<div class="page-note">统计区间：' + m.label + '-01 — 今天（自然月）</div>';

  html += '<div class="stat-row">' +
    '<div class="stat s-brand"><div class="n">' + m.added + '</div><div class="l">本月新增任务</div></div>' +
    '<div class="stat s-ok"><div class="n">' + m.done + '</div><div class="l">本月完成任务</div></div>' +
    '<div class="stat s-warn"><div class="n">' + m.open + '</div><div class="l">当前未完成</div></div>' +
    '<div class="stat ' + (m.rate >= 60 ? 's-ok' : (m.rate >= 30 ? 's-warn' : 's-danger')) + '"><div class="n">' + m.rate + '<small style="font-size:15px">%</small></div><div class="l">本月完成率</div></div>' +
  '</div>';

  html += '<div class="card"><div class="card-hd"><div class="ico">◱</div><h3>近 4 周完成量</h3>' +
    '<span class="hint">按自然周（周一为起点）</span></div>' + barChart(weeks.map(function (w) {
      return { label: w.label, n: w.n, hot: w.start === ymd(startOfWeek(new Date())) };
    })) + '</div>';

  html += '<div class="card"><div class="card-hd"><div class="ico ok">✓</div><h3>近 30 天完成热力</h3>' +
    '<span class="hint">每根柱子 = 一天</span></div>' + barChart(days30) + '</div>';

  html += '<div class="grid-2" style="align-items:start">';
  html += '<div class="card" style="margin-bottom:0"><div class="card-hd"><div class="ico">◫</div><h3>项目任务分布</h3>' +
    '<span class="hint">已完成 / 总数</span></div>' +
    miniBars(m.byProj.map(function (x) {
      return { name: x.project.name, done: x.done, open: x.open, total: x.total };
    })) + '</div>';

  html += '<div class="card" style="margin-bottom:0"><div class="card-hd"><div class="ico">✦</div><h3>本月其他投入</h3></div>' +
    '<div class="kv">' +
      '<div class="kv-r"><span>AI 资讯</span><b>' + newsItems().length + ' 条</b></div>' +
      '<div class="kv-r"><span>WB案例</span><b>' + (S.articles || []).length + ' 篇</b></div>' +
      '<div class="kv-r"><span>FDE 学习进度</span><b>' + learnDone + ' / ' + learnTotal + ' 天（' + learnPct + '%）</b></div>' +
      '<div class="kv-r"><span>累计学习时长</span><b>' + learnHours + ' 小时</b></div>' +
      '<div class="kv-r"><span>连续学习</span><b>' + fdeStreak() + ' 天</b></div>' +
      '<div class="kv-r"><span>AI 知识练习</span><b>' + quizCnt + ' 次 · 平均 ' + quizAvgV + ' 分</b></div>' +
      '<div class="kv-r"><span>练习最高分 / 错题</span><b>' + quizBestV + ' 分 / ' + quizWrongIds().length + ' 题</b></div>' +
      '<div class="kv-r"><span>文档库条目</span><b>' + (S.docs || []).length + ' 条</b></div>' +
    '</div>' +
    '<div style="margin-top:12px">' + progressBar(learnPct) + '</div>' +
    '</div>';
  html += '</div>';
  el.innerHTML = html;
}

/* ---------------- 月报 ---------------- */
function generateMonthReport() {
  var m = monthStats();
  var L = [];
  L.push('工作月报（' + m.label + '）');
  L.push('');
  L.push('一、本月完成');
  var doneList = (S.tasks || []).filter(function (x) { return x.status === 'done' && inThisMonth(x.completedAt); })
    .sort(function (a, b) { return (PRIO[b.priority] ? PRIO[b.priority].w : 0) - (PRIO[a.priority] ? PRIO[a.priority].w : 0); });
  if (!doneList.length) L.push('· 本月暂无已完成任务记录。');
  else doneList.forEach(function (x) {
    var pj = projectOf(x.projectId);
    L.push('· ' + x.title + (pj ? '（' + pj.name + '）' : '') + '　[' + (PRIO[x.priority] ? PRIO[x.priority].t : '中') + '优先级]　完成于 ' + ymd(new Date(x.completedAt)));
  });
  L.push('· 本月共完成 ' + m.done + ' 项，当前未完成 ' + m.open + ' 项，完成率 ' + m.rate + '%。');
  L.push('');
  L.push('二、项目进展');
  if (!m.byProj.length) L.push('· 暂无项目与任务记录。');
  else m.byProj.forEach(function (x) {
    var p = x.project;
    var prog = p.progress !== undefined ? '，进度 ' + p.progress + '%' : '';
    L.push('· ' + x.project.name + prog + '　已完成 ' + x.done + ' / ' + x.total + ' 项任务，未完成 ' + x.open + ' 项。');
    if (p.nextAction) L.push('  下一步：' + p.nextAction);
  });
  L.push('');
  L.push('三、问题与风险');
  var risks = riskItems();
  if (!risks.length) L.push('· 当前无逾期任务、无临期项目、无长期等待事项。');
  else risks.slice(0, 10).forEach(function (r) { L.push('· [' + r.tag + '] ' + r.title + '：' + r.desc); });
  L.push('');
  L.push('四、下月重点');
  var next = (S.tasks || []).filter(function (x) {
    return x.status !== 'done' && x.priority === 'high';
  }).sort(sortTasks).slice(0, 8);
  if (!next.length) L.push('· 暂无高优先级待办，建议从风险雷达中挑选 1–2 项清理。');
  else next.forEach(function (x) {
    var pj = projectOf(x.projectId);
    L.push('· ' + x.title + (pj ? '（' + pj.name + '）' : '') + '　截止：' + fmtDue(x.dueDate, x.dueTime) + (isOverdueTask(x) ? '（已逾期，需优先清理）' : ''));
  });
  var rm = (S.roadmap || []).filter(function (r) { return r.status !== '已完成'; }).slice(0, 5);
  if (rm.length) {
    L.push('');
    L.push('五、工作台改善方向');
    rm.forEach(function (r) { L.push('· [' + r.type + '] ' + r.title + (r.detail ? '：' + r.detail : '')); });
  }
  return L.join('\n');
}

function generateMonthReportDialog() {
  var text = generateMonthReport();
  var wrap = openModal({
    title: '本月月报草稿',
    size: 'wide',
    body: '<div class="report" id="mp-text">' + esc(text) + '</div>',
    footer: '<button class="btn" data-no="1">关闭</button>' +
      '<button class="btn" data-dl="1">下载 .txt</button>' +
      '<button class="btn pri" data-copy="1">一键复制</button>'
  });
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
  wrap.querySelector('[data-copy]').onclick = function () {
    copyText(text).then(function (ok) { toast(ok ? '月报已复制到剪贴板' : '复制失败，请手动选中复制', ok ? 'ok' : 'error'); });
  };
  wrap.querySelector('[data-dl]').onclick = function () {
    try {
      var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = '月报-' + monthTag(0) + '.txt';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      toast('已下载月报', 'ok');
    } catch (e) { toast('下载失败', 'error'); }
  };
}
