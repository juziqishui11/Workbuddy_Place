/* ============================================================
   55-radar.js —— 风险雷达
   ============================================================ */
ROUTES['work/radar'] = { title: '风险雷达', desc: '自动汇总所有需要立刻处理的事', render: renderRadar };

function renderRadar(el) {
  var risks = riskItems();
  var red = risks.filter(function (r) { return sevLevel(r.sev) === 'red'; });
  var amber = risks.filter(function (r) { return sevLevel(r.sev) === 'amber'; });

  var html = '';
  html += '<div class="page-note">自动筛出：逾期任务 · 24 小时内截止 · 项目临期/延期/阻塞 · 等待超过 3 天</div>';

  html += '<div class="stat-row">' +
    '<div class="stat ' + (red.length ? 's-danger' : 's-ok') + '"><div class="n">' + red.length + '</div><div class="l">严重风险（红）</div></div>' +
    '<div class="stat ' + (amber.length ? 's-warn' : 's-ok') + '"><div class="n">' + amber.length + '</div><div class="l">需要关注（琥珀）</div></div>' +
    '<div class="stat s-brand"><div class="n">' + risks.length + '</div><div class="l">风险项合计</div></div>' +
    '<div class="stat s-ok"><div class="n">' + ((S.projects || []).filter(function (p) { return projectRisk(p).key === 'normal'; }).length) + '</div><div class="l">状态正常项目</div></div>' +
  '</div>';

  html += '<div class="card">' +
    '<div class="card-hd"><div class="ico danger">⚠</div><h3>风险清单</h3><span class="hint">按严重程度从高到低排序</span></div>';
  if (!risks.length) {
    html += emptyBox('✓', '当前没有任何风险项', '逾期、临期、等待超时、项目阻塞都会自动出现在这里');
  } else {
    html += risks.map(function (r) {
      var lv = sevLevel(r.sev);
      var jump = r.kind === 'project' ? 'work/projects' : 'work/tasks';
      return '<div class="risk sev-' + lv + '">' +
        '<div class="ri">' + sevIcon(r.sev) + '</div>' +
        '<div class="rb"><div class="rt">' + esc(r.title) + '</div>' +
        '<div class="rm"><span class="tag ' + r.cls + '">' + esc(r.tag) + '</span> ' + esc(r.desc) + '</div>' +
        '<div style="margin-top:7px;display:flex;gap:6px;flex-wrap:wrap">' +
          (r.kind === 'task' ? '<button class="btn sm" data-act="task-edit" data-id="' + r.id + '">处理 / 编辑</button>' +
            '<button class="btn sm ok" data-act="task-done" data-id="' + r.id + '">标记完成</button>' +
            '<button class="btn sm" data-act="task-due" data-id="' + r.id + '">改期</button>'
            : '<button class="btn sm" data-act="proj-edit" data-id="' + r.id + '">编辑项目</button>') +
          '<button class="btn sm ghost" data-nav="' + jump + '">跳转</button>' +
        '</div></div></div>';
    }).join('');
  }
  html += '</div>';

  html += '<div class="card tight">' +
    '<div class="card-hd" style="margin-bottom:6px"><h3 style="font-size:14px">判定规则</h3></div>' +
    '<div style="font-size:13px;color:var(--ink-2);line-height:1.9">' +
      '1. 已超过截止日期但未完成的任务 → <span class="tag danger">严重</span><br>' +
      '2. 未来 24 小时内即将截止的任务 → <span class="tag warn">需关注</span><br>' +
      '3. 距截止日期 3 天以内且未完成的项目 → <span class="tag warn">需关注</span><br>' +
      '4. 被标记为「阻塞」或已超期未完成的项目 → <span class="tag danger">严重</span><br>' +
      '5. 状态为「等待别人」且持续超过 3 天的任务 → <span class="tag warn">需关注</span>' +
    '</div></div>';

  el.innerHTML = html;
}
