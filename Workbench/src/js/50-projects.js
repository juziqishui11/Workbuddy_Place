/* ============================================================
   50-projects.js —— 项目中心
   - 固定展示 4 个主线项目（资管数据中台 / 资管数据门户自主开发项目 /
     资管综合信息服务系统自主开发项目 / 个人日常）；其余项目（ONES 需求等）
     收进「其他项目」合并项，暂不单独平铺
   - 卡片默认收起，点「展开任务」查看归属任务与完成情况
   ============================================================ */
var PROJ_EXPAND = {}; /* { 条目key: true } 展开态 */
ROUTES['work/projects'] = { title: '项目中心', desc: '4 个主线项目 + 其他项目，展开看归属任务与完成情况', render: renderProjects };

function isPresetName(n) { return PROJECT_PRESETS.indexOf(n) >= 0; }
function presetProject(name) {
  return (S.projects || []).filter(function (p) { return p.name === name; })[0] || null;
}
function tasksOfProject(pid) {
  return (S.tasks || []).filter(function (t) { return t.projectId === pid; }).sort(sortTasks);
}
function projDoneN(list) { return list.filter(function (t) { return t.status === 'done'; }).length; }
function projPct(list) { return list.length ? Math.round(projDoneN(list) / list.length * 100) : 0; }

/** 项目中心要展示的条目：4 个主线项目 + 其他项目合并项 */
function projectEntries() {
  var es = PROJECT_PRESETS.map(function (name) {
    return { key: name, kind: 'preset', name: name, project: presetProject(name) };
  });
  var others = (S.projects || []).filter(function (p) { return !isPresetName(p.name); });
  if (others.length) es.push({ key: '__other__', kind: 'group', name: '其他项目', projects: others });
  return es;
}
/** 某个条目的全部归属任务 */
function projEntryTasks(e) {
  if (e.kind === 'preset') return e.project ? tasksOfProject(e.project.id) : [];
  var ids = {};
  e.projects.forEach(function (p) { ids[p.id] = 1; });
  return (S.tasks || []).filter(function (t) { return t.projectId && ids[t.projectId]; }).sort(sortTasks);
}
function projRemainTag(p) {
  if (!p || !p.dueDate) return '';
  var remain = projectRemainDays(p);
  if (remain === null) return '';
  var cls = remain < 0 ? 'danger' : (remain <= 3 ? 'warn' : '');
  var txt = remain < 0 ? '超期 ' + (-remain) + ' 天' : (remain === 0 ? '今天截止' : '剩余 ' + remain + ' 天');
  return '<span class="tag ' + cls + '">' + txt + '</span>';
}

function projEntryCard(e) {
  var tasks = projEntryTasks(e);
  var done = projDoneN(tasks);
  var total = tasks.length;
  var open = !!PROJ_EXPAND[e.key];
  var p = e.kind === 'preset' ? e.project : null;
  var r = p ? projectRisk(p) : null;

  var html = '<div class="proj-entry' + (open ? ' open' : '') + '">';
  html += '<div class="pe-hd">' +
    '<div class="pe-ic' + (e.kind === 'group' ? ' grp' : '') + '">' + (e.kind === 'group' ? '🗂' : '📁') + '</div>' +
    '<div class="pe-t"><h3>' + esc(e.name) + '</h3>' +
      '<div class="pe-meta">' +
        (e.kind === 'group' ? '<span class="tag">' + e.projects.length + ' 个项目</span>' : '') +
        (r ? '<span class="tag ' + r.cls + '">' + r.label + '</span>' : '') +
        (p && p.dueDate ? '<span class="tag">截止 ' + esc(p.dueDate) + '</span>' : '') +
        projRemainTag(p) +
      '</div>' +
    '</div>' +
    '<div class="pe-sum"><b>' + done + '</b> / ' + total + ' 项已完成</div>' +
    '<button class="btn sm" data-act="proj-expand" data-v="' + esc(e.key) + '">' + (open ? '收起 ▴' : '展开任务 ▾') + '</button>' +
  '</div>';
  html += '<div class="pe-bar">' + progressBar(projPct(tasks)) + '</div>';

  if (!open) return html + '</div>';

  html += '<div class="pe-body">';
  if (e.kind === 'preset') {
    if (!p) {
      html += '<div class="pe-empty">这条主线项目还没创建，创建后即可把任务归到它下面。</div>' +
        '<div class="pe-acts"><button class="btn sm pri" data-act="proj-ensure" data-v="' + esc(e.name) + '">＋ 创建项目</button></div>';
    } else {
      html += (tasks.length ? '<div class="list">' + tasks.map(function (t) { return taskRow(t); }).join('') + '</div>'
        : emptyBox('◔', '还没有归属任务', '点「＋ 新增任务」，或编辑任务时选择本项目'));
      html += '<div class="pe-acts">' +
        '<button class="btn sm pri" data-act="task-new">＋ 新增任务</button>' +
        '<button class="btn sm" data-act="proj-edit" data-id="' + p.id + '">编辑项目</button>' +
        (p.status === 'done'
          ? '<button class="btn sm" data-act="proj-reopen" data-id="' + p.id + '">重新开启</button>'
          : '<button class="btn sm ok" data-act="proj-done" data-id="' + p.id + '">标记完成</button>') +
        '<button class="btn sm ghost" data-act="proj-del" data-id="' + p.id + '">删除项目</button>' +
      '</div>';
    }
  } else {
    e.projects.slice().sort(function (a, b) {
      var ra = projectRisk(a), rb = projectRisk(b);
      if (rb.sev !== ra.sev) return rb.sev - ra.sev;
      return String(a.name).localeCompare(String(b.name));
    }).forEach(function (pp) {
      var pts = tasksOfProject(pp.id);
      var pjRisk = projectRisk(pp);
      html += '<div class="pe-group">' +
        '<div class="pe-group-hd">' +
          '<div class="pg-name">' + esc(pp.name) + (pp.onsId ? ' ' + onsBadge(pp.onsId) : '') + '</div>' +
          '<span class="tag ' + pjRisk.cls + '">' + pjRisk.label + '</span>' +
          '<span class="pe-group-n">已完成 ' + projDoneN(pts) + ' / ' + pts.length + '</span>' +
          '<button class="btn sm ghost" data-act="proj-edit" data-id="' + pp.id + '">编辑</button>' +
        '</div>' +
        (pts.length ? '<div class="list">' + pts.map(function (t) { return taskRow(t); }).join('') + '</div>'
          : '<div class="pe-empty">暂无任务</div>') +
      '</div>';
    });
    html += '<div class="pe-acts"><button class="btn sm pri" data-act="task-new">＋ 新增任务</button>' +
      '<button class="btn sm" data-act="proj-new">＋ 新建项目</button></div>';
  }
  return html + '</div></div>';
}

function renderProjects(el) {
  var entries = projectEntries();
  var group = entries.filter(function (e) { return e.kind === 'group'; })[0];
  var otherN = group ? group.projects.length : 0;
  var anyOpen = entries.some(function (e) { return PROJ_EXPAND[e.key]; });

  var html = '';
  html += '<div class="page-note">共 ' + PROJECT_PRESETS.length + ' 个主线项目' +
    (otherN ? ' · 其他项目 ' + otherN + ' 个' : '') +
    ' · 点「展开任务」查看归属任务与完成情况</div>';

  html += '<div class="chips">' +
    '<button class="chip" data-act="proj-new" style="background:var(--brand);color:#fff;border-color:var(--brand);font-weight:600">＋ 新建项目</button>' +
    (anyOpen ? '<button class="chip" data-act="proj-collapse-all">↺ 全部收起</button>' : '') +
  '</div>';

  html += '<div class="proj-list">' + entries.map(projEntryCard).join('') + '</div>';
  el.innerHTML = html;
}

function projectForm(proj) {
  var isNew = !proj;
  var p = proj || { name: '', desc: '', startDate: '', dueDate: '', priority: 'mid', progress: 0, nextAction: '', status: 'normal', note: '' };
  var body =
    '<div class="field"><label>项目名称<span class="req">*</span></label><input type="text" id="p-name" value="' + esc(p.name) + '" autocomplete="off"></div>' +
    '<div class="field"><label>项目描述</label><textarea id="p-desc" style="min-height:64px">' + esc(p.desc || '') + '</textarea></div>' +
    '<div class="f-row">' +
      '<div class="field"><label>开始日期</label><input type="date" id="p-start" value="' + esc(p.startDate || '') + '"></div>' +
      '<div class="field"><label>截止日期</label><input type="date" id="p-due" value="' + esc(p.dueDate || '') + '"></div>' +
    '</div>' +
    '<div class="f-row">' +
      '<div class="field"><label>优先级</label><select id="p-prio">' +
        ['high', 'mid', 'low'].map(function (k) { return '<option value="' + k + '"' + (p.priority === k ? ' selected' : '') + '>' + PRIO[k].t + '</option>'; }).join('') +
        '</select></div>' +
      '<div class="field"><label>当前进度（%）</label><input type="number" id="p-prog" min="0" max="100" step="5" value="' + (p.progress || 0) + '"></div>' +
    '</div>' +
    '<div class="field"><label>下一步动作</label><input type="text" id="p-next" value="' + esc(p.nextAction || '') + '" placeholder="下一步具体要做什么"></div>' +
    '<div class="field"><label>项目状态</label><select id="p-status">' +
      [['normal', '正常'], ['due_soon', '临期'], ['blocked', '阻塞'], ['done', '已完成']].map(function (x) {
        return '<option value="' + x[0] + '"' + (p.status === x[0] ? ' selected' : '') + '>' + x[1] + '</option>';
      }).join('') + '</select>' +
      '<div class="tip">「延期 / 临期」会按截止日期自动计算并显示，手动选「阻塞」优先级最高；标记「已完成」后不再提醒。</div></div>' +
    '<div class="field"><label>备注</label><textarea id="p-note" style="min-height:60px">' + esc(p.note || '') + '</textarea></div>';

  var wrap = openModal({
    title: isNew ? '新建项目' : '编辑项目',
    size: 'wide',
    body: body,
    footer: (isNew ? '' : '<button class="btn danger" data-del="1">删除</button>') +
      '<button class="btn" data-no="1">取消</button><button class="btn pri" data-ok="1">保存</button>'
  });
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
  if (!isNew) wrap.querySelector('[data-del]').onclick = function () { closeModal(wrap); deleteProject(p.id); };
  wrap.querySelector('[data-ok]').onclick = function () {
    var name = wrap.querySelector('#p-name').value.trim();
    if (!name) { toast('项目名称必填', 'warn'); wrap.querySelector('#p-name').focus(); return; }
    var prog = parseInt(wrap.querySelector('#p-prog').value, 10);
    if (isNaN(prog)) prog = 0;
    prog = Math.max(0, Math.min(100, prog));
    var obj = {
      name: name,
      desc: wrap.querySelector('#p-desc').value.trim(),
      startDate: wrap.querySelector('#p-start').value,
      dueDate: wrap.querySelector('#p-due').value,
      priority: wrap.querySelector('#p-prio').value,
      progress: prog,
      nextAction: wrap.querySelector('#p-next').value.trim(),
      status: wrap.querySelector('#p-status').value,
      note: wrap.querySelector('#p-note').value.trim()
    };
    if (isNew) {
      obj.id = uid(); obj.createdAt = nowISO(); obj.updatedAt = nowISO(); obj.completedAt = obj.status === 'done' ? nowISO() : '';
      S.projects.push(obj);
      if (commit()) toast('已创建项目：' + name, 'ok');
    } else {
      if (obj.status === 'done' && !p.completedAt) p.completedAt = nowISO();
      if (obj.status !== 'done') p.completedAt = '';
      Object.keys(obj).forEach(function (k) { p[k] = obj[k]; });
      p.updatedAt = nowISO();
      if (commit()) toast('已保存项目', 'ok');
    }
    closeModal(wrap); rerender();
  };
}
function getProject(id) { return (S.projects || []).filter(function (p) { return p.id === id; })[0] || null; }
function deleteProject(id) {
  var p = getProject(id); if (!p) return;
  var n = openTasksOf(id).length;
  confirmDialog({
    title: '删除项目',
    message: '<b>' + esc(p.name) + '</b><br>该项目下还有 ' + n + ' 条未完成任务，删除项目后这些任务会变成「临时事项」（不会被删除）。确定删除项目吗？',
    danger: true, confirmText: '删除项目'
  }).then(function (ok) {
    if (!ok) return;
    (S.tasks || []).forEach(function (t) { if (t.projectId === id) { t.projectId = null; t.updatedAt = nowISO(); } });
    S.projects = S.projects.filter(function (x) { return x.id !== id; });
    commit(); rerender(); toast('已删除项目');
  });
}
function toggleProjectDone(id) {
  var p = getProject(id); if (!p) return;
  if (p.status === 'done') { p.status = 'normal'; p.completedAt = ''; }
  else { p.status = 'done'; p.progress = 100; p.completedAt = nowISO(); }
  p.updatedAt = nowISO();
  commit(); rerender();
  toast(p.status === 'done' ? '项目已标记完成' : '项目已重新开启', 'ok');
}
function projectTasksDialog(id) {
  var p = getProject(id); if (!p) return;
  var ts = (S.tasks || []).filter(function (t) { return t.projectId === id; }).sort(sortTasks);
  openModal({
    title: '项目任务 · ' + p.name,
    size: 'wide',
    body: ts.length ? '<div class="list">' + ts.map(function (t) { return taskRow(t); }).join('') + '</div>'
      : emptyBox('◔', '该项目还没有任务', '点「＋ 新增任务」时选择此项目'),
    footer: '<button class="btn" data-no="1">关闭</button><button class="btn pri" data-ok="1">＋ 新建任务</button>'
  });
}
