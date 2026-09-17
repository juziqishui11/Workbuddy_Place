/* ============================================================
   97-roadmap.js —— 工作台方向：优化建议 + 近一个月改善方向
   ============================================================ */
var RM_FILTER = { type: 'all' };
var RM_TYPES = ['优化建议', '改善方向'];
var RM_STATUS = {
  待办: { t: '待办', c: '' },
  进行中: { t: '进行中', c: 'warn' },
  已完成: { t: '已完成', c: 'ok' }
};
var ROAD_PRIOS = { high: '高', mid: '中', low: '低' };

ROUTES['roadmap'] = { title: '工作台方向', desc: '工作台自身的优化建议与近一个月的改善方向', render: renderRoadmap };

function renderRoadmap(el) {
  var all = S.roadmap || [];
  var curMonth = monthTag(0);
  var list = all.filter(function (r) { return RM_FILTER.type === 'all' || r.type === RM_FILTER.type; })
    .sort(function (a, b) {
      var sa = a.status === '已完成' ? 1 : (a.status === '进行中' ? 0 : -1);
      var sb = b.status === '已完成' ? 1 : (b.status === '进行中' ? 0 : -1);
      if (sa !== sb) return sa - sb;
      var pa = { high: 0, mid: 1, low: 2 }[a.priority] === undefined ? 1 : { high: 0, mid: 1, low: 2 }[a.priority];
      var pb = { high: 0, mid: 1, low: 2 }[b.priority] === undefined ? 1 : { high: 0, mid: 1, low: 2 }[b.priority];
      if (pa !== pb) return pa - pb;
      return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    });

  var nTodo = all.filter(function (r) { return r.status === '待办'; }).length;
  var nDoing = all.filter(function (r) { return r.status === '进行中'; }).length;
  var nDone = all.filter(function (r) { return r.status === '已完成'; }).length;
  var thisMonth = all.filter(function (r) { return r.month === curMonth; });
  var doneRate = all.length ? Math.round(nDone / all.length * 100) : 0;

  var html = '';
  html += '<div class="page-note">' + curMonth + ' 聚焦 ' + thisMonth.length + ' 项 · 累计 ' + all.length + ' 条想法与计划</div>';

  html += '<div class="stat-row">' +
    '<div class="stat s-warn"><div class="n">' + nDoing + '</div><div class="l">进行中</div></div>' +
    '<div class="stat s-brand"><div class="n">' + nTodo + '</div><div class="l">待办</div></div>' +
    '<div class="stat s-ok"><div class="n">' + nDone + '</div><div class="l">已完成</div></div>' +
    '<div class="stat"><div class="n">' + doneRate + '<small style="font-size:15px">%</small></div><div class="l">完成占比</div></div>' +
  '</div>';

  /* 本月聚焦 */
  html += '<div class="card"><div class="card-hd"><div class="ico">➤</div><h3>' + curMonth + ' 改善方向</h3>' +
    '<span class="hint">近一个月要推进的事</span>' +
    '<button class="btn sm" data-act="rm-new">＋ 新增</button></div>' +
    (thisMonth.length ? '<div class="list">' + thisMonth.map(rmRow).join('') + '</div>'
      : emptyBox('➤', '本月还没有设定改善方向', '点「＋ 新增」写下第一件想改进的事')) +
    '</div>';

  html += '<div class="chips">' +
    '<button class="chip ' + (RM_FILTER.type === 'all' ? 'on' : '') + '" data-act="rm-type" data-v="all">全部<span class="n">' + all.length + '</span></button>' +
    RM_TYPES.map(function (t) {
      var n = all.filter(function (r) { return r.type === t; }).length;
      return '<button class="chip ' + (RM_FILTER.type === t ? 'on' : '') + '" data-act="rm-type" data-v="' + esc(t) + '">' + esc(t) + '<span class="n">' + n + '</span></button>';
    }).join('') + '</div>';

  html += '<div class="card"><div class="card-hd"><div class="ico">◈</div><h3>全部条目</h3>' +
    '<span class="hint">按「进行中 → 待办 → 已完成」排序，同级按优先级</span></div>' +
    (list.length ? '<div class="list">' + list.map(rmRow).join('') + '</div>'
      : emptyBox('◈', '还没有条目', '记录下你对这个工作台的想法')) + '</div>';

  html += '<div class="card tight"><div class="card-hd" style="margin-bottom:6px"><h3 style="font-size:14px">怎么用这一页</h3></div>' +
    '<div style="font-size:13px;color:var(--ink-2);line-height:1.9">' +
      '· <b>优化建议</b>：工作台本身想改的地方（交互、字段、自动化）。做完一条勾一条。<br>' +
      '· <b>改善方向</b>：近一个月自己要改的习惯或要推进的主线，别超过 3 条，多了做不完。<br>' +
      '· 每月初把上月的「已完成」归档，重新挑 3 条进本月聚焦。' +
    '</div></div>';

  el.innerHTML = html;
}

function rmRow(r) {
  var st = RM_STATUS[r.status] || RM_STATUS['待办'];
  var pr = ROAD_PRIOS[r.priority] || '中';
  var prCls = r.priority === 'high' ? 'p-high' : (r.priority === 'low' ? 'p-low' : 'p-mid');
  return '<div class="row' + (r.status === '已完成' ? ' done' : '') + '">' +
    '<div class="cb" data-act="rm-done" data-id="' + r.id + '" role="button" aria-label="标记完成">✓</div>' +
    '<div class="body">' +
      '<div class="t1">' + esc(r.title) + '</div>' +
      '<div class="meta">' +
        '<span class="tag brand">' + esc(r.type || '优化建议') + '</span>' +
        '<span class="tag ' + st.c + '">' + st.t + '</span>' +
        '<span class="tag ' + prCls + '">' + pr + '优先</span>' +
        (r.month ? '<span class="due">' + esc(r.month) + '</span>' : '') +
      '</div>' +
      (r.detail ? '<div class="note">' + esc(r.detail) + '</div>' : '') +
    '</div>' +
    '<div class="acts">' +
      '<button class="icon-btn" data-act="rm-status" data-id="' + r.id + '" title="改状态" aria-label="改状态">⇄</button>' +
      '<button class="icon-btn" data-act="rm-edit" data-id="' + r.id + '" title="编辑" aria-label="编辑">✎</button>' +
      '<button class="icon-btn danger" data-act="rm-del" data-id="' + r.id + '" title="删除" aria-label="删除">✕</button>' +
    '</div></div>';
}

function roadmapForm(r) {
  var isNew = !r;
  var o = r || { title: '', type: '优化建议', status: '待办', priority: 'mid', month: monthTag(0), detail: '' };
  var body =
    '<div class="field"><label>标题<span class="req">*</span></label><input type="text" id="rm-t" value="' + esc(o.title) + '" placeholder="例如：任务支持批量改期"></div>' +
    '<div class="f-row"><div class="field"><label>类型</label><select id="rm-ty">' +
      RM_TYPES.map(function (t) { return '<option value="' + t + '"' + (o.type === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="field"><label>状态</label><select id="rm-st">' +
      Object.keys(RM_STATUS).map(function (k) { return '<option value="' + k + '"' + (o.status === k ? ' selected' : '') + '>' + k + '</option>'; }).join('') +
      '</select></div></div>' +
    '<div class="f-row"><div class="field"><label>优先级</label><select id="rm-pr">' +
      [['high', '高'], ['mid', '中'], ['low', '低']].map(function (x) {
        return '<option value="' + x[0] + '"' + (o.priority === x[0] ? ' selected' : '') + '>' + x[1] + '</option>';
      }).join('') + '</select></div>' +
      '<div class="field"><label>所属月份</label><input type="text" id="rm-m" value="' + esc(o.month || '') + '" placeholder="' + monthTag(0) + '"></div></div>' +
    '<div class="field"><label>说明</label><textarea id="rm-d" style="min-height:70px" placeholder="为什么要做？做完的判定标准是什么？">' + esc(o.detail || '') + '</textarea></div>';
  var wrap = openModal({
    title: isNew ? '新增方向条目' : '编辑方向条目',
    body: body,
    footer: (isNew ? '' : '<button class="btn danger" data-del="1">删除</button>') +
      '<button class="btn" data-no="1">取消</button><button class="btn pri" data-ok="1">保存</button>'
  });
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
  if (!isNew) wrap.querySelector('[data-del]').onclick = function () {
    closeModal(wrap);
    S.roadmap = (S.roadmap || []).filter(function (x) { return x.id !== o.id; });
    commit(); rerender(); toast('已删除条目');
  };
  wrap.querySelector('[data-ok]').onclick = function () {
    var t = wrap.querySelector('#rm-t').value.trim();
    if (!t) { toast('标题必填', 'warn'); return; }
    var obj = {
      title: t, type: wrap.querySelector('#rm-ty').value, status: wrap.querySelector('#rm-st').value,
      priority: wrap.querySelector('#rm-pr').value,
      month: wrap.querySelector('#rm-m').value.trim() || monthTag(0),
      detail: wrap.querySelector('#rm-d').value.trim()
    };
    if (isNew) {
      obj.id = uid(); obj.createdAt = nowISO(); obj.updatedAt = nowISO();
      S.roadmap.push(obj);
      if (commit()) toast('已新增', 'ok');
    } else {
      Object.keys(obj).forEach(function (k) { o[k] = obj[k]; });
      o.updatedAt = nowISO();
      if (commit()) toast('已保存', 'ok');
    }
    closeModal(wrap); rerender();
  };
}

function roadmapStatusDialog(id) {
  var r = (S.roadmap || []).filter(function (x) { return x.id === id; })[0];
  if (!r) return;
  var wrap = openModal({
    title: '修改状态：' + r.title,
    body: '<div style="display:flex;flex-direction:column;gap:8px">' +
      Object.keys(RM_STATUS).map(function (k) {
        return '<button class="btn lg ' + (r.status === k ? 'pri' : '') + '" data-rs="' + k + '" style="justify-content:flex-start">' + k + (r.status === k ? '（当前）' : '') + '</button>';
      }).join('') + '</div>',
    footer: '<button class="btn" data-no="1">关闭</button>'
  });
  wrap.querySelectorAll('[data-rs]').forEach(function (b) {
    b.onclick = function () {
      r.status = b.getAttribute('data-rs');
      r.updatedAt = nowISO();
      commit(); closeModal(wrap); rerender();
      toast('状态已改为「' + r.status + '」', 'ok');
    };
  });
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
}

function toggleRoadmapDone(id) {
  var r = (S.roadmap || []).filter(function (x) { return x.id === id; })[0];
  if (!r) return;
  r.status = (r.status === '已完成') ? '待办' : '已完成';
  r.updatedAt = nowISO();
  commit(); rerender();
  toast(r.status === '已完成' ? '已完成：' + r.title : '已恢复为待办', r.status === '已完成' ? 'ok' : '');
}
