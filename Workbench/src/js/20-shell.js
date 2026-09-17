/* ============================================================
   20-shell.js —— 路由 / 导航 / 渲染调度
   ============================================================ */
var NAV = [
  { id: 'overview', label: '首页概览', icon: '◎', tone: 't1' },
  {
    id: 'work', label: '工作任务', icon: '▤', tone: 't2', subs: [
      { id: 'today', label: '今日工作台' },
      { id: 'tasks', label: '任务台账' },
      { id: 'projects', label: '项目中心' },
      { id: 'radar', label: '风险雷达' }
    ]
  },
  {
    id: 'share', label: 'AI资讯', icon: '✦', tone: 't3', subs: [
      { id: 'news', label: '每日 AI 资讯' },
      { id: 'articles', label: 'WB案例资讯' }
    ]
  },
  {
    id: 'learning', label: 'FDE学习', icon: '◈', tone: 't4', subs: [
      { id: '90day', label: 'FDE-90天学习' },
      { id: 'quiz', label: 'AI知识练习' }
    ]
  },
  { id: 'skills', label: '技能库', icon: '⬡', tone: 't5' },
  { id: 'docs', label: '文档库', icon: '❏', tone: 't6' },
  { id: 'toolbox', label: '工具与案例', icon: '⚙', tone: 't7' },
  {
    id: 'stats', label: '复盘统计', icon: '◱', tone: 't8', subs: [
      { id: 'week', label: '周复盘' },
      { id: 'month', label: '月复盘' }
    ]
  },
  { id: 'roadmap', label: '工作台方向', icon: '➤', tone: 't9' }
];

var ROUTES = {};

function navItem(id) { return NAV.filter(function (n) { return n.id === id; })[0] || null; }

function currentRoute() {
  var h = (location.hash || '').replace(/^#\/?/, '');
  var parts = h.split('/').filter(Boolean);
  if (!parts.length) return 'overview';
  var top = parts[0];
  var found = navItem(top);
  if (!found) return 'overview';
  if (found.subs) {
    var sub = parts[1];
    var ok = found.subs.filter(function (s) { return s.id === sub; })[0];
    return top + '/' + ((ok && sub) || found.subs[0].id);
  }
  return top;
}
function go(path) {
  if (FOCUS_MODE && path !== 'work/today') exitFocus();
  if (currentRoute() === path) renderView();
  else location.hash = '#/' + path;
}
function routeTop() { return currentRoute().split('/')[0]; }

/* ---------------- 导航渲染 ---------------- */
function renderNav() {
  var cur = currentRoute();
  var top = routeTop();
  var badge = workBadge();

  var sb = document.getElementById('sidebar');
  sb.innerHTML =
    '<div class="brand"><div class="logo">任</div>' +
      '<div><div class="t">个人工作任务台</div><div class="s">Workbench</div></div></div>' +
    '<div class="nav">' + NAV.map(function (n) {
      var on = n.id === top;
      var b = (n.id === 'work' && badge.n) ? '<span class="bdg' + (badge.danger ? '' : ' mute') + '">' + badge.n + '</span>' : '';
      return '<button class="nav-item' + (on ? ' on' : '') + '" data-nav="' + n.id + '">' +
        '<span class="ic ' + (n.tone || '') + '">' + n.icon + '</span><span>' + n.label + '</span>' + b + '</button>' +
        (on && n.subs ? '<div class="nav-sub">' + n.subs.map(function (s) {
          var subOn = cur === n.id + '/' + s.id;
          return '<button data-nav="' + n.id + '/' + s.id + '" class="' + (subOn ? 'on' : '') + '">' + s.label + '</button>';
        }).join('') + '</div>' : '');
    }).join('') + '</div>' +
    '<div class="nav-label">快捷</div>' +
    '<div class="nav">' +
      (top === 'work' ? '<button class="nav-item" data-act="quick-add-task"><span class="ic">＋</span><span>快速新增任务</span></button>' : '') +
      '<button class="nav-item" data-act="export-json"><span class="ic">⭳</span><span>导出 JSON 备份</span></button>' +
    '</div>';

  var tb = document.getElementById('tabbar');
  tb.innerHTML = '<div class="tb-in">' + NAV.map(function (n) {
    var on = n.id === top;
    return '<button class="' + (on ? 'on' : '') + '" data-nav="' + n.id + '">' +
      '<span class="ic ' + (n.tone || '') + '">' + n.icon + '</span><span>' + shortLabel(n.label) + '</span></button>';
  }).join('') + '</div>';
}

function shortLabel(s) {
  return s.replace('首页概览', '概览').replace('工作台方向', '方向').replace('工具与案例', '工具')
    .replace('复盘统计', '复盘').replace('AI资讯', '资讯').replace('FDE学习', 'FDE').slice(0, 4);
}

function workBadge() {
  var t = (S.tasks || []);
  var overdue = t.filter(isOverdueTask).length;
  if (overdue > 0) return { n: overdue, danger: true };
  var today = t.filter(function (x) { return x.status !== 'done' && x.dueDate && dayDiff(x.dueDate) === 0; }).length;
  return { n: today, danger: false };
}

/* ---------------- 顶栏 ---------------- */
/* 顶栏：只放当前模块的「标题 + 描述」。首页（noHead）整条隐藏，由桌宠问候充当顶部。 */
function renderTopbar() {
  var r = ROUTES[currentRoute()] || ROUTES['overview'];
  var el = document.getElementById('topbar');
  if (r.noHead) { el.innerHTML = ''; el.style.display = 'none'; return; }
  el.style.display = '';
  el.innerHTML = '<div class="ttl">' + esc(r.title || '') +
    (r.desc ? '<span class="sub">' + esc(r.desc) + '</span>' : '') + '</div>';
}

/* ---------------- 渲染 ---------------- */
var LAST_VIEW_ROUTE = '';
function renderView() {
  var route = currentRoute();
  var page = ROUTES[route] || ROUTES['overview'];
  var view = document.getElementById('view');
  view.innerHTML = '';
  try {
    page.render(view);
  } catch (e) {
    view.innerHTML = '<div class="card"><h3>页面渲染出错</h3><p style="color:var(--ink-2);font-size:13.5px">' +
      esc(e && e.message ? e.message : String(e)) + '</p></div>';
    if (window.console) console.error(e);
  }
  renderNav();
  renderTopbar();
  /* 仅路由真正切换时滚到顶；同路由重渲染（展开目录 / 切筛选 / 搜索）保留滚动位置，避免长页被弹回头部 */
  if (route !== LAST_VIEW_ROUTE) {
    window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
    LAST_VIEW_ROUTE = route;
  }
}
function renderAll() { renderNav(); renderTopbar(); renderView(); }
function rerender() { renderView(); }

window.addEventListener('hashchange', function () { renderAll(); });
