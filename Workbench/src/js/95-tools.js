/* ============================================================
   95-tools.js —— 工具与案例：工具入口 + 我的作品案例 + 数据管理
   ============================================================ */
var WORK_FILTER = { type: 'all' };
var TOOL_FILTER = { cat: 'all' };
var WORK_TYPES = ['公众号', '表情包', 'WB案例'];
var WORK_STATUS = {
  规划中: { t: '规划中', c: '' },
  进行中: { t: '进行中', c: 'warn' },
  已上线: { t: '已上线', c: 'ok' },
  暂停: { t: '暂停', c: 'danger' },
  运营中: { t: '运营中', c: 'ok' },
  待构建: { t: '待构建', c: 'warn' },
  待验证: { t: '待验证', c: 'warn' }
};

ROUTES['toolbox'] = { title: '工具与案例', desc: '已开发工具 · 作品案例 · 数据备份恢复', render: renderToolbox };

function renderToolbox(el) {
  var tools = S.tools || [];
  var counts = [
    ['项目', (S.projects || []).length], ['任务', (S.tasks || []).length],
    ['WB案例', (S.articles || []).length], ['资讯缓存', newsItems().length],
    ['FDE 完成天数', fdeDoneCount() + '/' + fdeTotalDays()], ['AI 练习记录', (S.quizRecords || []).length],
    ['技能', (S.skills || []).length], ['文档', (S.docs || []).length]
  ];

  var html = '';
  html += '<div class="page-note">常用工具入口 + 自己做过的东西 + 数据备份恢复</div>';

  /* 我的工具 = S.tools（手动快捷入口）+ 自研功能性工具（works.cat==='工具'），按分类聚合、点开给提示词 */
  var workTools = (S.works || []).filter(function (w) { return w.cat === '工具'; });
  var allTools = [];
  tools.forEach(function (t) {
    allTools.push({ src: 'tools', id: t.id, name: t.name, icon: t.icon || '🔗', url: t.url || '', catLabel: t.category || '未分类', prompt: t.prompt || '', desc: '' });
  });
  workTools.forEach(function (w) {
    allTools.push({ src: 'works', id: w.id, name: w.name, icon: '🔧', url: w.url || '', catLabel: w.group || '其他', prompt: w.prompt || '', desc: w.desc || '' });
  });

  /* 分类 + 计数（仅显示去重后的分类，避免「仓库 / 代码」这类同义重复） */
  var cats = [];
  allTools.forEach(function (t) { if (cats.indexOf(t.catLabel) < 0) cats.push(t.catLabel); });
  var catCount = {};
  allTools.forEach(function (t) { catCount[t.catLabel] = (catCount[t.catLabel] || 0) + 1; });
  var toolList = (TOOL_FILTER.cat === 'all') ? allTools : allTools.filter(function (t) { return t.catLabel === TOOL_FILTER.cat; });

  html += '<div class="card"><div class="card-hd"><div class="ico">⚙</div><h3>我的工具</h3>' +
    '<span class="hint">' + allTools.length + ' 个工具 · 点开查看使用提示词</span>' +
    '<button class="btn sm" data-act="tool-new">＋ 新增</button></div>';
  if (cats.length) {
    html += '<div class="chips" style="margin-bottom:14px">' +
      '<button class="chip ' + (TOOL_FILTER.cat === 'all' ? 'on' : '') + '" data-act="tool-cat" data-v="all">全部<span class="n">' + allTools.length + '</span></button>' +
      cats.map(function (c) {
        return '<button class="chip ' + (TOOL_FILTER.cat === c ? 'on' : '') + '" data-act="tool-cat" data-v="' + esc(c) + '">' + esc(c) + '<span class="n">' + (catCount[c] || 0) + '</span></button>';
      }).join('') +
    '</div>';
  }
  html += toolList.length ? '<div class="tools">' + toolList.map(function (t) {
    var editAct = (t.src === 'works') ? 'work-edit' : 'tool-edit';
    return '<div class="tool" data-act="tool-prompt" data-id="' + t.id + '" data-src="' + t.src + '" title="点击查看使用提示词">' +
      '<button class="icon-btn" data-act="' + editAct + '" data-id="' + t.id + '" title="编辑" style="position:absolute;top:6px;right:6px;width:26px;height:26px;min-width:26px;font-size:11px;z-index:2">✎</button>' +
      '<div class="ti">' + esc(t.icon || '🔗') + '</div>' +
      '<div class="tn">' + esc(t.name) + '</div>' +
      '<div class="tc">' + esc(t.catLabel || '未分类') + '</div>' +
    '</div>';
  }).join('') + '</div>' : emptyBox('⚙', '还没有工具入口', '点「＋ 新增」添加常用的网站或命令');
  html += '</div>';

  /* 作品 / 案例（works.cat==='案例'，偏落地的场景） */
  var caseWorks = (S.works || []).filter(function (w) { return w.cat === '案例'; });
  var wlist = caseWorks.filter(function (w) { return WORK_FILTER.type === 'all' || w.type === WORK_FILTER.type; });
  html += '<div class="card"><div class="card-hd"><div class="ico warn">✦</div><h3>我的作品与案例</h3>' +
    '<span class="hint">公众号 / 表情包 / WB 案例（自研工具已并入「我的工具」）</span>' +
    '<button class="btn sm" data-act="work-new">＋ 新增</button></div>' +
    '<div class="chips" style="margin-bottom:14px">' +
      '<button class="chip ' + (WORK_FILTER.type === 'all' ? 'on' : '') + '" data-act="wk-type" data-v="all">全部<span class="n">' + caseWorks.length + '</span></button>' +
      WORK_TYPES.map(function (t) {
        var n = caseWorks.filter(function (w) { return w.type === t; }).length;
        return '<button class="chip ' + (WORK_FILTER.type === t ? 'on' : '') + '" data-act="wk-type" data-v="' + esc(t) + '">' + esc(t) + '<span class="n">' + n + '</span></button>';
      }).join('') +
    '</div>';
  html += wlist.length ? '<div class="grid-2">' + wlist.map(function (w, i) { return workCard(w, i + 1); }).join('') + '</div>'
    : '<div>' + emptyBox('✦', '该分类下还没有条目', '点「＋ 新增」记录你做过的东西') + '</div>';
  html += '</div>';

  /* 数据概况 */
  html += '<div class="card"><div class="card-hd"><div class="ico ok">⛁</div><h3>数据概况</h3>' +
    '<span class="hint">' + (LAST_SAVE_OK ? '本地存储正常' : '上次保存失败') + '</span></div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap">' + counts.map(function (c) {
      return '<span class="tag" style="font-size:13px;padding:5px 11px">' + esc(c[0]) + ' <b style="color:var(--brand)">' + c[1] + '</b></span>';
    }).join('') + '</div>' +
    '<div style="margin-top:12px;font-size:12.5px;color:var(--ink-3)">数据保存在本浏览器的 localStorage（键名 <code>' + STORE_KEY + '</code>）。换浏览器或清理缓存前请先导出备份。</div>' +
  '</div>';

  /* 数据管理 */
  html += '<div class="card"><div class="card-hd"><div class="ico">⭳</div><h3>数据管理</h3></div>' +
    '<div style="display:flex;gap:9px;flex-wrap:wrap">' +
      '<button class="btn pri" data-act="export-json">⭳ 导出 JSON 备份</button>' +
      '<button class="btn" data-act="import-json">⭱ 从 JSON 恢复</button>' +
      '<button class="btn" data-act="reimport-ones">↻ 重新导入 ONES 任务</button>' +
      '<button class="btn" data-act="clear-demo">清空示例数据</button>' +
      '<button class="btn" data-act="reseed-demo">重新载入示例数据</button>' +
    '</div>' +
    '<div class="tip" style="margin-top:8px;font-size:12px;color:var(--ink-3)">' +
      '「重新导入 ONES 任务」按 ONS-ID 幂等合并（已有的更新、缺失的新增），不会重复；ONES 任务不带示例标记，' +
      '因此「清空示例数据」不会删掉你的真实任务。恢复 JSON 前会先校验格式并提示是否覆盖。</div>' +
  '</div>';

  /* 设置 */
  var zod = getZodiac(S.settings.zodiacSign || 'libra');
  html += '<div class="card"><div class="card-hd"><div class="ico">☯</div><h3>设置</h3></div>' +
    '<div style="display:flex;gap:9px;flex-wrap:wrap;align-items:center">' +
      '<span style="font-size:13.5px;color:var(--ink-2)">个人资料：</span>' +
      '<span class="tag brand">' + esc(S.settings.userName || '枫城') + '</span>' +
      '<span class="tag">' + esc(zod.name) + ' · ' + esc(zod.elementName) + '</span>' +
      '<button class="btn sm" data-act="set-zodiac">设置资料</button>' +
    '</div>' +
    '<div style="display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin-top:10px">' +
      '<span style="font-size:13.5px;color:var(--ink-2)">概览页天气城市：</span>' +
      '<span class="tag brand">' + esc(S.settings.city || '未设置') + '</span>' +
      '<button class="btn sm" data-act="change-city">切换城市</button>' +
    '</div>' +
    '<div style="display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin-top:10px">' +
      '<span style="font-size:13.5px;color:var(--ink-2)">Obsidian 库路径：</span>' +
      '<span class="tag">' + esc(S.settings.obsidianPath || '未设置') + '</span>' +
      '<button class="btn sm" data-act="set-obsidian">设置</button>' +
    '</div></div>';

  /* 危险区 */
  html += '<div class="danger-zone"><div class="card-hd"><div class="ico danger">⚠</div><h3>危险操作</h3></div>' +
    '<div style="font-size:13.5px;color:var(--ink-2);margin-bottom:12px">清空后所有项目、任务、日报、案例、学习计划、技能、文档、工具与作品数据都会被删除，且无法撤销。建议先导出备份。</div>' +
    '<button class="btn danger" data-act="clear-all">清空全部数据</button></div>';

  el.innerHTML = html;
}

function workCard(w, idx) {
  var st = WORK_STATUS[w.status] || WORK_STATUS['规划中'];
  var num = idx ? ('<span class="wn">' + idx + '</span>') : '';
  var link = w.url
    ? '<button class="btn sm pri" data-act="open-url" data-url="' + esc(w.url) + '">🔗 浏览</button>'
    : '<span class="tag" style="opacity:.55">暂无链接</span>';
  return '<div class="proj">' +
    '<div class="ph">' + num + '<div class="pn">' + esc(w.name) + '</div>' +
      '<span class="tag brand">' + esc(w.type || '其他') + '</span>' +
      '<span class="tag ' + st.c + '">' + st.t + '</span></div>' +
    (w.desc ? '<div class="pd">' + esc(w.desc) + '</div>' : '') +
    ((w.tags && w.tags.length) ? '<div style="display:flex;gap:5px;flex-wrap:wrap">' + w.tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>' : '') +
    '<div class="pf">' + link +
      '<button class="btn sm" data-act="work-status" data-id="' + w.id + '">改状态</button>' +
      '<button class="btn sm" data-act="work-edit" data-id="' + w.id + '">编辑</button>' +
      '<button class="btn sm ghost" data-act="work-del" data-id="' + w.id + '">删除</button>' +
    '</div></div>';
}

/* 点击工具 → 弹出使用提示词（可直接复制发给 AI 助手调用） */
function toolPromptDialog(tool, src) {
  var prompt = tool.prompt || '（该工具暂未配置提示词）';
  var url = tool.url || '';
  var body =
    (tool.desc ? '<div style="margin-bottom:10px;font-size:13px;color:var(--ink-2);line-height:1.6">' + esc(tool.desc) + '</div>' : '') +
    '<div class="tip" style="font-size:12.5px;color:var(--ink-3);margin-bottom:8px">点击复制下面的提示词，直接发给 AI 助手即可调用这个工具：</div>' +
    '<div style="background:var(--bg-soft);border:1px solid var(--line);border-radius:10px;padding:12px 14px;font-size:13.5px;line-height:1.7;color:var(--ink);white-space:pre-wrap;word-break:break-word">' + esc(prompt) + '</div>' +
    (url ? '<div style="margin-top:10px;font-size:12.5px;color:var(--ink-3)">链接：<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(url) + '</a></div>' : '');
  var footer = '<button class="btn" data-copy="1">📋 复制提示词</button>' +
    (url ? '<button class="btn pri" data-open="1">🔗 打开链接</button>' : '') +
    '<button class="btn" data-no="1">关闭</button>';
  var wrap = openModal({ title: '使用提示词 · ' + tool.name, body: body, footer: footer });
  wrap.querySelector('[data-copy]').onclick = function () {
    copyText(prompt).then(function (ok) { toast(ok ? '提示词已复制，粘到对话框即可用' : '复制失败，请手动选中复制', ok ? 'ok' : 'error'); });
  };
  if (url) wrap.querySelector('[data-open]').onclick = function () { closeModal(wrap); handleOpenUrl(url); };
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
}

function workForm(w) {
  var isNew = !w;
  var types = (w && w.type && WORK_TYPES.indexOf(w.type) < 0) ? WORK_TYPES.concat([w.type]) : WORK_TYPES;
  var o = w || { name: '', type: 'WB案例', status: '进行中', url: '', desc: '', tags: [] };
  var body =
    '<div class="field"><label>名称<span class="req">*</span></label><input type="text" id="w-n" value="' + esc(o.name) + '"></div>' +
    '<div class="f-row"><div class="field"><label>类型</label><select id="w-ty">' +
      types.map(function (t) { return '<option value="' + t + '"' + (o.type === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="field"><label>状态</label><select id="w-st">' +
      Object.keys(WORK_STATUS).map(function (k) { return '<option value="' + k + '"' + (o.status === k ? ' selected' : '') + '>' + k + '</option>'; }).join('') +
      '</select></div></div>' +
    '<div class="field"><label>链接（可空）</label><input type="url" id="w-u" value="' + esc(o.url || '') + '" placeholder="https://..."></div>' +
    '<div class="field"><label>一句话介绍</label><textarea id="w-d" style="min-height:70px">' + esc(o.desc || '') + '</textarea></div>' +
    '<div class="field"><label>标签（逗号分隔）</label><input type="text" id="w-tg" value="' + esc((o.tags || []).join(',')) + '"></div>';
  var wrap = openModal({
    title: isNew ? '新增作品 / 案例' : '编辑：' + o.name,
    body: body,
    footer: (isNew ? '' : '<button class="btn danger" data-del="1">删除</button>') +
      '<button class="btn" data-no="1">取消</button><button class="btn pri" data-ok="1">保存</button>'
  });
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
  if (!isNew) wrap.querySelector('[data-del]').onclick = function () {
    closeModal(wrap);
    S.works = (S.works || []).filter(function (x) { return x.id !== o.id; });
    commit(); rerender(); toast('已删除');
  };
  wrap.querySelector('[data-ok]').onclick = function () {
    var n = wrap.querySelector('#w-n').value.trim();
    if (!n) { toast('名称必填', 'warn'); return; }
    var obj = {
      name: n, type: wrap.querySelector('#w-ty').value, status: wrap.querySelector('#w-st').value,
      url: wrap.querySelector('#w-u').value.trim(), desc: wrap.querySelector('#w-d').value.trim(),
      tags: wrap.querySelector('#w-tg').value.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean)
    };
    obj.cat = isNew ? '案例' : (o.cat || '案例');
    if (isNew) {
      obj.id = uid(); obj.createdAt = nowISO(); obj.updatedAt = nowISO();
      S.works.push(obj);
      if (commit()) toast('已新增', 'ok');
    } else {
      Object.keys(obj).forEach(function (k) { o[k] = obj[k]; });
      o.updatedAt = nowISO();
      if (commit()) toast('已保存', 'ok');
    }
    closeModal(wrap); rerender();
  };
}

function workStatusDialog(id) {
  var w = (S.works || []).filter(function (x) { return x.id === id; })[0];
  if (!w) return;
  var wrap = openModal({
    title: '修改状态：' + w.name,
    body: '<div style="display:flex;flex-direction:column;gap:8px">' +
      Object.keys(WORK_STATUS).map(function (k) {
        return '<button class="btn lg ' + (w.status === k ? 'pri' : '') + '" data-ws="' + k + '" style="justify-content:flex-start">' + k + (w.status === k ? '（当前）' : '') + '</button>';
      }).join('') + '</div>',
    footer: '<button class="btn" data-no="1">关闭</button>'
  });
  wrap.querySelectorAll('[data-ws]').forEach(function (b) {
    b.onclick = function () {
      w.status = b.getAttribute('data-ws');
      w.updatedAt = nowISO();
      commit(); closeModal(wrap); rerender();
      toast('状态已改为「' + w.status + '」', 'ok');
    };
  });
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
}

function toolForm(t) {
  var isNew = !t;
  var o = t || { name: '', url: '', icon: '🔗', category: '常用' };
  var emojis = ['🔗', '🚀', '🎨', '🗄️', '🐙', '📚', '🌤️', '✦', '⚙', '📝', '🧠', '💡'];
  var body =
    '<div class="field"><label>名称<span class="req">*</span></label><input type="text" id="t-n" value="' + esc(o.name) + '"></div>' +
    '<div class="field"><label>链接</label><input type="text" id="t-u" value="' + esc(o.url || '') + '" placeholder="https://..."></div>' +
    '<div class="f-row"><div class="field"><label>图标</label><select id="t-i">' +
      emojis.map(function (e) { return '<option value="' + e + '"' + (o.icon === e ? ' selected' : '') + '>' + e + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="field"><label>分类</label><input type="text" id="t-c" value="' + esc(o.category || '') + '"></div></div>' +
    '<div class="field"><label>使用提示词（点开工具时展示，可直接复制发给 AI）</label><textarea id="t-p" style="min-height:64px">' + esc(o.prompt || '') + '</textarea></div>';
  var wrap = openModal({
    title: isNew ? '新增工具' : '编辑工具',
    body: body,
    footer: (isNew ? '' : '<button class="btn danger" data-del="1">删除</button>') +
      '<button class="btn" data-no="1">取消</button><button class="btn pri" data-ok="1">保存</button>'
  });
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
  if (!isNew) wrap.querySelector('[data-del]').onclick = function () {
    closeModal(wrap);
    S.tools = S.tools.filter(function (x) { return x.id !== o.id; });
    commit(); rerender(); toast('已删除工具');
  };
  wrap.querySelector('[data-ok]').onclick = function () {
    var n = wrap.querySelector('#t-n').value.trim();
    if (!n) { toast('名称必填', 'warn'); return; }
    var obj = {
      name: n, url: wrap.querySelector('#t-u').value.trim(),
      icon: wrap.querySelector('#t-i').value, category: wrap.querySelector('#t-c').value.trim() || '常用',
      prompt: wrap.querySelector('#t-p').value.trim()
    };
    if (isNew) {
      obj.id = uid(); obj.createdAt = nowISO();
      S.tools.push(obj);
      if (commit()) toast('已新增工具', 'ok');
    } else {
      Object.keys(obj).forEach(function (k) { o[k] = obj[k]; });
      if (commit()) toast('已保存', 'ok');
    }
    closeModal(wrap); rerender();
  };
}

/* ---------------- 导入 / 清空 ---------------- */
function importJSON() {
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json,application/json,text/plain';
  inp.onchange = function () {
    var f = inp.files && inp.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      var obj;
      try { obj = JSON.parse(String(r.result)); }
      catch (e) {
        openModal({
          title: '导入失败',
          body: '<div style="font-size:14px;color:var(--ink-2);line-height:1.7">文件不是合法的 JSON：<br><code style="color:var(--danger)">' +
            esc(e && e.message ? e.message : String(e)) + '</code><br><br>请选择本工作台导出的备份文件。</div>',
          footer: '<button class="btn pri" data-no="1">知道了</button>'
        }).querySelector('[data-no]').onclick = function () { closeModal(); };
        return;
      }
      var errs = validateImport(obj);
      if (errs.length) {
        openModal({
          title: '数据格式校验未通过',
          body: '<div style="font-size:14px;color:var(--ink-2);margin-bottom:8px">发现 ' + errs.length + ' 个问题（最多显示 10 条），已取消导入，现有数据未被修改：</div>' +
            '<div style="font-size:12.5px;color:var(--danger);line-height:1.8">' + errs.slice(0, 10).map(function (x) { return '· ' + esc(x); }).join('<br>') + '</div>',
          footer: '<button class="btn pri" data-no="1">知道了</button>'
        }).querySelector('[data-no]').onclick = function () { closeModal(); };
        return;
      }
      var n = ARR_FIELDS.reduce(function (a, k) { return a + (Array.isArray(obj[k]) ? obj[k].length : 0); }, 0);
      confirmDialog({
        title: '恢复备份',
        message: '备份文件包含 <b>' + n + '</b> 条记录。<br>恢复后<b>将覆盖当前全部数据</b>（当前共 ' +
          ARR_FIELDS.reduce(function (a, k) { return a + (S[k] || []).length; }, 0) + ' 条），且无法撤销。<br><br>确定要覆盖吗？',
        danger: true, confirmText: '覆盖恢复'
      }).then(function (ok) {
        if (!ok) { toast('已取消恢复'); return; }
        if (applyImport(obj)) { toast('已恢复备份数据', 'ok'); }
        rerender();
      });
    };
    r.onerror = function () { toast('文件读取失败', 'error'); };
    r.readAsText(f, 'utf-8');
  };
  inp.click();
}

function clearDemoData() {
  var n = 0;
  ARR_FIELDS.forEach(function (k) { n += (S[k] || []).filter(function (x) { return x.demo; }).length; });
  if (!n) { toast('没有找到示例数据（可能已被清理或经过编辑）', 'warn'); return; }
  confirmDialog({
    title: '清空示例数据',
    message: '将删除 <b>' + n + '</b> 条预置的示例数据（项目 / 任务 / 案例 / 技能 / 文档 / 工具 / 作品）。<br>你自己创建的内容、FDE 学习打勾进度与练习成绩都不受影响。',
    danger: true, confirmText: '清空示例'
  }).then(function (ok) {
    if (!ok) return;
    ARR_FIELDS.forEach(function (k) {
      S[k] = (S[k] || []).filter(function (x) { return !x.demo; });
    });
    S.meta.seeded = true;
    commit(); rerender(); toast('已清空示例数据', 'ok');
  });
}
function setZodiacDialog() {
  var zod = getZodiac(S.settings.zodiacSign || 'libra');
  var body =
    '<div class="field"><label>称呼</label>' +
    '<input type="text" id="sz-name" value="' + esc(S.settings.userName || '枫城') + '" placeholder="例如：枫城"></div>' +
    '<div class="field"><label>我的星座</label><select id="sz-sign">' +
    zodiacList().map(function (z) {
      return '<option value="' + z.key + '"' + ((S.settings.zodiacSign || 'libra') === z.key ? ' selected' : '') + '>' + z.icon + ' ' + esc(z.name) + '</option>';
    }).join('') +
    '</select></div>' +
    '<div class="tip" style="font-size:12px;color:var(--ink-3)">设置后首页会显示对应星座的今日运势、元素属性与星级评分。</div>';
  var wrap = openModal({
    title: '设置个人资料',
    body: body,
    footer: '<button class="btn" data-no="1">取消</button><button class="btn pri" data-ok="1">保存</button>'
  });
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
  wrap.querySelector('[data-ok]').onclick = function () {
    var name = wrap.querySelector('#sz-name').value.trim();
    var sign = wrap.querySelector('#sz-sign').value;
    if (name) S.settings.userName = name;
    if (sign && ZODIAC[sign]) S.settings.zodiacSign = sign;
    commit(); closeModal(wrap); rerender();
    toast('个人资料已更新', 'ok');
  };
}

function clearAllData() {
  confirmDialog({
    title: '清空全部数据',
    message: '<b style="color:var(--danger)">此操作不可撤销。</b><br>将删除全部项目、任务、案例、技能、文档、工具与作品数据，以及 FDE 学习打勾进度与练习成绩。<br><br>建议先点「导出 JSON 备份」。',
    danger: true, confirmText: '我确认清空', requireText: '清空'
  }).then(function (ok) {
    if (!ok) return;
    clearAll();
    seedOnes(); /* 清空后自动把 ONES 真实数据重新导入 */
    rerender();
    toast('已清空全部数据（ONES 任务已重新导入）', 'ok');
  });
}
