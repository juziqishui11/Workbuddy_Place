/* ============================================================
   99-boot.js —— 全局事件委托 + 启动
   ============================================================ */
function handleOpenUrl(u) {
  u = (u || '').trim();
  if (!u) { toast('该条目没有填写链接', 'warn'); return; }
  if (/^https?:\/\//i.test(u) || /^mailto:/i.test(u)) {
    window.open(u, '_blank', 'noopener');
    return;
  }
  /* 自定义协议：imacopilot:// 唤起 IMA 客户端（注意协议名是 imacopilot，不是 ima —— ima:// 未注册，Windows 会弹「需要使用新应用以打开此 ima 链接」）、obsidian:// 打开 Obsidian —— 用 invokeWorkbuddy 以 <a>.click() 手势链路唤起本地客户端（比隐藏 iframe 可靠，Chrome/Edge 不再静默拦截） */
  if (/^(?:ima|imacopilot):\/\//i.test(u) || /^obsidian:\/\//i.test(u)) {
    invokeWorkbuddy(u);
    return;
  }
  copyText(u).then(function (ok) {
    toast(ok ? '已复制路径到剪贴板：' + u : '复制失败，请手动复制', ok ? 'ok' : 'error', 4000);
  });
}

document.addEventListener('click', function (e) {
  var navEl = e.target.closest ? e.target.closest('[data-nav]') : null;
  if (navEl) {
    e.preventDefault();
    go(navEl.getAttribute('data-nav'));
    return;
  }
  var el = e.target.closest ? e.target.closest('[data-act]') : null;
  if (!el) return;
  var act = el.getAttribute('data-act');
  var id = el.getAttribute('data-id');
  var v = el.getAttribute('data-v');
  e.preventDefault();

  switch (act) {
    /* ---- 任务 ---- */
    case 'quick-add-task': taskForm(null); break;
    case 'task-new': taskForm(null); break;
    case 'task-edit': taskForm(getTask(id)); break;
    case 'task-done': toggleTaskDone(id); break;
    case 'task-del': deleteTask(id); break;
    case 'task-due': changeDueDialog(id); break;
    case 'task-status': changeStatusDialog(id); break;

    /* ---- 任务台账筛选 ---- */
    case 'lg-src': LEDGER_FILTER.src = v; rerender(); break;
    case 'lg-reset':
      LEDGER_FILTER = { q: '', owner: 'all', status: 'all', project: 'all', month: 'all', src: 'all' };
      rerender(); break;

    /* ---- 专注 / 番茄钟 ---- */
    case 'focus-mode':
      if (FOCUS_MODE) exitFocus();
      else { FOCUS_MODE = true; rerender(); }
      break;
    case 'pomo-start': startPomo(id); break;
    case 'pomo-pause': pausePomo(); break;
    case 'pomo-stop': stopPomo(); break;
    case 'pomo-done': donePomo(); break;

    /* ---- 小型月历 ---- */
    case 'calendar-prev': CAL_MONTH_OFFSET--; rerender(); break;
    case 'calendar-next': CAL_MONTH_OFFSET++; rerender(); break;
    case 'calendar-select': WORK_DATE = v; CAL_MONTH_OFFSET = 0; rerender(); break;
    case 'calendar-clear': WORK_DATE = ''; CAL_MONTH_OFFSET = 0; rerender(); break;

    /* ---- 项目 ---- */
    case 'proj-new': projectForm(null); break;
    case 'proj-edit': projectForm(getProject(id)); break;
    case 'proj-del': deleteProject(id); break;
    case 'proj-done':
    case 'proj-reopen': toggleProjectDone(id); break;
    case 'proj-tasks': projectTasksDialog(id); break;
    case 'proj-expand': PROJ_EXPAND[v] = !PROJ_EXPAND[v]; rerender(); break;
    case 'proj-collapse-all': PROJ_EXPAND = {}; rerender(); break;
    case 'proj-ensure': {
      var peName = v;
      var peid = findOrCreateProject(peName);
      if (peid && commit()) { PROJ_EXPAND[peName] = true; rerender(); toast('已创建项目：' + peName, 'ok'); }
      break;
    }

    /* ---- 复盘统计 ---- */
    case 'gen-report': generateReportDialog(); break;
    case 'gen-month-report': generateMonthReportDialog(); break;

    /* ---- FDE 学习：90 天 ---- */
    case 'fde-tab': FDE_TAB = v; rerender(); break;
    case 'fde-week': FDE_OPEN_WEEK = (FDE_OPEN_WEEK === parseInt(v, 10)) ? 0 : parseInt(v, 10); rerender(); break;
    case 'fde-day': fdeToggleDay(parseInt(v, 10)); break;
    case 'fde-day-open': {
      var dn = parseInt(v, 10);
      FDE_OPEN_DAY = (FDE_OPEN_DAY === dn) ? 0 : dn;
      var wk = fdeAllDays().filter(function (x) { return x.d === dn; })[0];
      if (wk && FDE_OPEN_DAY) FDE_OPEN_WEEK = wk.week;
      rerender();
      break;
    }
    case 'fde-week-done': {
      var fw = FDE_DATA.weeks.filter(function (x) { return x.w === parseInt(v, 10); })[0];
      if (fw) fdeToggleWeek(fw);
      break;
    }
    case 'fde-pick-week': {
      var cd = fdeCurrentDay();
      var curWk = FDE_DATA.weeks.filter(function (x) { return cd >= (x.days[0] || {}).d && cd <= (x.days[x.days.length - 1] || {}).d; })[0];
      FDE_OPEN_WEEK = FDE_OPEN_WEEK ? 0 : (curWk ? curWk.w : 1);
      FDE_OPEN_DAY = 0;
      rerender();
      break;
    }
    case 'fde-collapse': FDE_OPEN_WEEK = 0; FDE_OPEN_DAY = 0; rerender(); break;
    case 'fde-gcat': FDE_G_CAT = v; rerender(); break;
    case 'fde-exlvl': FDE_EX_LVL = v; rerender(); break;
    case 'fde-exw': FDE_EX_W = v; rerender(); break;
    case 'fde-fold': {
      var fold = el.closest ? el.closest('.fe-fold') : null;
      if (fold) fold.classList.toggle('on');
      break;
    }
    case 'fde-chk': {
      var cv = el.getAttribute('data-v') || '';
      S.fdeChecks = S.fdeChecks || {};
      if (S.fdeChecks[cv]) delete S.fdeChecks[cv];
      else S.fdeChecks[cv] = nowISO();
      commit(); rerender();
      break;
    }
    case 'fde-open-src': openUrl((FDE_SRC && FDE_SRC.path) ? FDE_SRC.path : ''); break;
    case 'fde-export-md': fdeExportMd(); break;
    case 'fde-sync-local': fdePickFile(); break;
    case 'fde-sync-reset': fdeResetToBuiltin(); break;

    /* ---- FDE 学习：AI 知识练习 ---- */
    case 'quiz-mod': {
      var qi = QUIZ_PICK.indexOf(v);
      if (qi >= 0) QUIZ_PICK.splice(qi, 1); else QUIZ_PICK.push(v);
      if (!QUIZ_PICK.length) QUIZ_PICK = [v];
      rerender();
      break;
    }
    case 'quiz-mod-quick': QUIZ_PICK = [v]; QUIZ_WRONG_ONLY = false; rerender(); break;
    case 'quiz-allmod': QUIZ_PICK = QUIZ_MODS.map(function (m) { return m.id; }); rerender(); break;
    case 'quiz-nomod': QUIZ_PICK = []; rerender(); break;
    case 'quiz-size': QUIZ_SIZE = parseInt(v, 10) || 0; rerender(); break;
    case 'quiz-start': quizStart(); break;
    case 'quiz-start-wrong': quizStartFromWrong(); break;
    case 'quiz-wrong-open': QUIZ_WRONG_ONLY = true; QUIZ_RESULT = null; rerender(); break;
    case 'quiz-back': QUIZ_WRONG_ONLY = false; QUIZ_RESULT = null; QUIZ_SESSION = null; rerender(); break;
    case 'quiz-ans': quizAnswer(id, parseInt(v, 10)); break;
    case 'quiz-ans-t': quizAnswer(id, v === '1'); break;
    case 'quiz-prev': quizTo((QUIZ_SESSION ? QUIZ_SESSION.i : 0) - 1); break;
    case 'quiz-next': quizTo((QUIZ_SESSION ? QUIZ_SESSION.i : 0) + 1); break;
    case 'quiz-jump': quizTo(parseInt(v, 10)); break;
    case 'quiz-submit': quizSubmit(); break;
    case 'quiz-quit': quizQuit(); break;
    case 'quiz-again': QUIZ_RESULT = null; QUIZ_WRONG_ONLY = false; quizStart(); break;
    case 'quiz-clear-rec':
      confirmDialog({ title: '清空练习记录', message: '将删除全部得分记录（错题本不受影响），确定吗？', danger: true, confirmText: '清空' }).then(function (ok) {
        if (!ok) return;
        S.quizRecords = [];
        commit(); rerender(); toast('已清空练习记录');
      });
      break;
    case 'quiz-clear-wrong':
      confirmDialog({ title: '清空错题本', message: '将移除全部错题，确定吗？', danger: true, confirmText: '清空' }).then(function (ok) {
        if (!ok) return;
        S.quizWrong = {};
        commit(); rerender(); toast('已清空错题本');
      });
      break;

    /* ---- AI 资讯：每日 AI 资讯 ---- */
    case 'news-refresh': refreshNews(); break;

    /* ---- AI 资讯：WB案例资讯 ---- */
    case 'art-new': articleForm(null); break;
    case 'art-src': ART_FILTER.src = v; rerender(); break;
    case 'art-refresh': artRefresh(); break;
    case 'art-fork': {
      var forkArt = (S.articles || []).filter(function (x) { return x.id === id; })[0];
      if (forkArt) articleForm(null, forkArt);
      break;
    }
    case 'art-star': {
      var starArt = (S.articles || []).filter(function (x) { return x.id === id; })[0];
      if (starArt) {
        starArt.starred = !starArt.starred; starArt.updatedAt = nowISO();
        if (commit()) toast(starArt.starred ? '已打标，重导入时会保留' : '已取消打标', 'ok');
        rerender();
      }
      break;
    }
    case 'art-edit': articleForm((S.articles || []).filter(function (x) { return x.id === id; })[0]); break;
    case 'art-del':
      confirmDialog({ title: '删除文章', message: '确定从精选里删除这篇吗？', danger: true, confirmText: '删除' }).then(function (ok) {
        if (!ok) return;
        S.articles = (S.articles || []).filter(function (x) { return x.id !== id; });
        commit(); rerender(); toast('已删除文章');
      });
      break;

    /* ---- 技能库 ---- */
    case 'sk-kind': SKILL_FILTER.kind = (v === 'connector' || v === 'hub') ? v : 'skill'; SKILL_FILTER.cat = 'all'; rerender(); break;
    case 'sk-cat': SKILL_FILTER.cat = v; rerender(); break;
    case 'sk-dup': SKILL_FILTER.dup = !SKILL_FILTER.dup; rerender(); break;
    case 'sk-st': SKILL_FILTER.status = ['installed', 'pending', 'off'].indexOf(v) >= 0 ? v : 'all'; rerender(); break;
    case 'sk-copy': {
      var txt = el.getAttribute('data-p') || '';
      copyText(txt).then(function (ok) { toast(ok ? '提示词已复制，粘到对话框即可用' : '复制失败，请手动选中复制', ok ? 'ok' : 'error'); });
      break;
    }
    case 'sk-star': starSkill(id); break;
    case 'sk-toggle': toggleSkill(id); break;
    case 'sk-task': {
      var ts = (S.skills || []).filter(function (x) { return x.id === id; })[0];
      skillLaunchTask(ts, el.getAttribute('data-p') || '');
      break;
    }
    case 'sk-hub-refresh': skHubRefresh(); break;
    case 'sk-hub-save': skHubSave(el.getAttribute('data-slug')); break;
    case 'sk-hub-install': skHubInstall(el.getAttribute('data-slug')); break;
    case 'sk-hub-recheck': skHubRecheck(el.getAttribute('data-slug')); break;
    case 'sk-rescan':
      seedSkills(true); rerender();
      toast('已按目录重新导入（你新增 / 编辑 / 打标的条目已保留）', 'ok', 4000); break;
    case 'skill-new': skillForm(null); break;
    case 'skill-edit': skillForm((S.skills || []).filter(function (x) { return x.id === id; })[0]); break;
    case 'skill-toggle': toggleSkill(id); break;
    case 'skill-del':
      confirmDialog({ title: '移除条目', message: '确定从技能库里移除这条吗？<br>（不影响本机已安装的技能/连接器，只是从这份清单里去掉）', danger: true, confirmText: '移除' }).then(function (ok) {
        if (!ok) return;
        S.skills = (S.skills || []).filter(function (x) { return x.id !== id; });
        commit(); rerender(); toast('已移除');
      });
      break;

    /* ---- 文档库 · 块 A：IMA 知识库（展示 + 在 IMA 打开） ---- */
    case 'dx-ima-kb': DX_UI.imaKb = v; rerender(); break;
    case 'dx-ima-folder': DX_UI.imaOpen[id] = !DX_UI.imaOpen[id]; rerender(); break;
    case 'dx-ima-file': { var dxh = dxImaFind(id); if (dxh) dxImaOpen(dxh); break; }
    case 'dx-ima-view': dxImaFileDialog(id); break;
    case 'dx-ima-open-kb': dxImaOpenKb(); break;
    case 'dx-ima-clr': DX_UI.imaQ = ''; rerender(); break;

    /* ---- 文档库 · 块 B：Obsidian 仓库 ---- */
    case 'dx-obs-dir': DX_UI.obsOpen[v] = !DX_UI.obsOpen[v]; rerender(); break;
    case 'dx-obs-file': obsLaunch(obsOpenUrl(String(v || '')), '已用 Obsidian 打开：' + v); break;
    case 'dx-obs-ai': dxObsAiDialog(v); break;
    case 'dx-obs-copy': {
      var full = String(obsVaultPath() || '').replace(/[\\/]+$/, '') + '\\' + String(v || '').replace(/\//g, '\\');
      copyText(full).then(function (ok) { toast(ok ? '已复制完整路径：' + full : '复制失败', ok ? 'ok' : 'warn', 4000); });
      break;
    }
    case 'dx-obs-clr': DX_UI.obsQ = ''; rerender(); break;
    case 'dx-obs-view': DX_UI.obsView = v || 'tree'; rerender(); break;

    /* ---- 文档库 · 知识图谱筛选 ---- */
    case 'dx-graph-cat':
      if (v === '__all') { DX_UI.gfHide = {}; }
      else {
        DX_UI.gfHide = DX_UI.gfHide || {};
        if (DX_UI.gfHide[v]) delete DX_UI.gfHide[v]; else DX_UI.gfHide[v] = true;
      }
      rerender(); break;
    case 'dx-graph-only': DX_UI.gfOnly = !DX_UI.gfOnly; rerender(); break;
    case 'dx-graph-notes': DX_UI.gfNotes = !DX_UI.gfNotes; rerender(); break;

    /* ---- 文档库 · 同步（仅 Obsidian 侧） ---- */
    case 'dx-sync': dxSyncDialog(v); break;

    /* ---- 文档库 · 知识库 / 仓库设置 ---- */
    case 'kb-open': kbOpen(kbById(id)); break;
    case 'kb-manage': kbManageDialog(); break;
    case 'obs-open': obsLaunch(obsOpenUrl(v), '已唤起 Obsidian' + (v ? '：' + v : '')); break;
    case 'obs-manual': obsLaunch(obsOpenUrl('首页'), '已在 Obsidian 里打开仓库首页'); break;
    case 'obs-new': obsLaunch(obsNewUrl('', ''), '已在 Obsidian 新建笔记'); break;
    case 'obs-copy': copyText(obsVaultPath() || '').then(function (ok) {
        toast(ok ? '已复制仓库路径：' + obsVaultPath() : '复制失败，请手动复制', ok ? 'ok' : 'error', 4000);
      }); break;
    case 'set-obsidian': setObsidianPathDialog(); break;

    /* ---- 工具 / 作品 ---- */
    case 'tool-new': toolForm(null); break;
    case 'tool-edit': toolForm((S.tools || []).filter(function (x) { return x.id === id; })[0]); break;
    case 'tool-prompt': {
      var tsrc = el.getAttribute('data-src');
      var tp = null;
      if (tsrc === 'works') tp = (S.works || []).filter(function (x) { return x.id === id; })[0];
      else tp = (S.tools || []).filter(function (x) { return x.id === id; })[0];
      if (tp) toolPromptDialog(tp, tsrc);
      break;
    }
    case 'tool-cat': TOOL_FILTER.cat = v; rerender(); break;
    case 'wk-type': WORK_FILTER.type = v; rerender(); break;
    case 'work-new': workForm(null); break;
    case 'work-edit': workForm((S.works || []).filter(function (x) { return x.id === id; })[0]); break;
    case 'work-status': workStatusDialog(id); break;
    case 'work-del':
      confirmDialog({ title: '删除作品/案例', message: '确定删除这条吗？', danger: true, confirmText: '删除' }).then(function (ok) {
        if (!ok) return;
        S.works = (S.works || []).filter(function (x) { return x.id !== id; });
        commit(); rerender(); toast('已删除');
      });
      break;

    /* ---- 工作台方向 ---- */
    case 'rm-type': RM_FILTER.type = v; rerender(); break;
    case 'rm-new': roadmapForm(null); break;
    case 'rm-edit': roadmapForm((S.roadmap || []).filter(function (x) { return x.id === id; })[0]); break;
    case 'rm-status': roadmapStatusDialog(id); break;
    case 'rm-done': toggleRoadmapDone(id); break;
    case 'rm-del':
      confirmDialog({ title: '删除条目', message: '确定删除这条方向条目吗？', danger: true, confirmText: '删除' }).then(function (ok) {
        if (!ok) return;
        S.roadmap = (S.roadmap || []).filter(function (x) { return x.id !== id; });
        commit(); rerender(); toast('已删除条目');
      });
      break;

    /* ---- 工具 / 数据 ---- */
    case 'open-url': handleOpenUrl(el.getAttribute('data-url')); break;
    case 'export-json': exportJSON(); break;
    case 'import-json': importJSON(); break;
    case 'clear-demo': clearDemoData(); break;
    case 'reimport-ones': {
      var ost = seedOnes(true);
      if (ost) {
        toast('ONES 数据已更新：需求 +' + ost.projects + ' / 更新 ' + ost.updP + '，任务 +' + ost.tasks + ' / 更新 ' + ost.updT, 'ok', 5000);
        rerender();
      } else {
        toast('未找到 ONES 数据文件', 'warn');
      }
      break;
    }
    case 'clear-all': clearAllData(); break;
    case 'reseed-demo':
      confirmDialog({ title: '重新载入示例数据', message: '会在现有数据之外追加一份示例数据，确定吗？', confirmText: '载入' }).then(function (ok) {
        if (!ok) return;
        seedDemo(); rerender(); toast('已载入示例数据', 'ok');
      });
      break;
    case 'change-city': changeCityDialog(); break;
    case 'set-zodiac': setZodiacDialog(); break;
    case 'reroll-fortune':
      S.settings.fortuneSeed = (S.settings.fortuneSeed || 0) + 1;
      commit(); rerender(); toast('已换一条运势');
      break;

    /* ---- 首页桌宠 ---- */
    case 'pet-greet':
      var bubble = document.querySelector('.pet-bubble');
      if (bubble) {
        bubble.textContent = petGreeting(new Date());
        bubble.classList.remove('hidden');
        clearTimeout(window.__petTimer);
        window.__petTimer = setTimeout(function () { bubble.classList.add('hidden'); }, 3000);
      }
      break;

    /* ---- 自动化任务 ---- */
    case 'auto-toggle':
      var auto = (S.automations || []).filter(function (x) { return x.id === id; })[0];
      if (auto) {
        auto.status = auto.status === 'running' ? 'paused' : 'running';
        auto.updatedAt = nowISO();
        commit(); rerender();
        toast(auto.status === 'running' ? '已启用：' + auto.name : '已暂停：' + auto.name);
      }
      break;
    case 'auto-run':
      var a2 = (S.automations || []).filter(function (x) { return x.id === id; })[0];
      if (a2) {
        a2.lastRun = nowISO();
        var d = new Date(); d.setHours(d.getHours() + 1);
        a2.nextRun = d.toISOString();
        a2.updatedAt = nowISO();
        commit(); rerender();
        toast('已触发：' + a2.name, 'ok');
      }
      break;

    default: break;
  }
});

/* ---------------- 数据损坏处理 ---------------- */
function handleBrokenData(msg) {
  var wrap = openModal({
    title: '本地数据读取失败',
    body: '<div style="font-size:14px;color:var(--ink-2);line-height:1.75">' +
      esc(msg) + '<br><br>为避免覆盖，工作台暂未写入任何内容。你可以先下载损坏的原始数据备份，再选择重置。</div>',
    footer: '<button class="btn" data-dl="1">下载损坏数据</button><button class="btn danger" data-reset="1">重置并重新开始</button>'
  });
  wrap.querySelector('[data-dl]').onclick = function () {
    try {
      var blob = new Blob([S.__brokenRaw || ''], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'workbench-broken-' + ymd(new Date()) + '.txt';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    } catch (e) { toast('下载失败', 'error'); }
  };
  wrap.querySelector('[data-reset]').onclick = function () {
    S = defaultState(); S.meta.seeded = true;
    commit(); closeModal(wrap); rerender();
    toast('已重置，可以重新开始', 'ok');
  };
}

/* ---------------- 启动 ---------------- */
function boot() {
  var r = loadState();
  if (r.broken) {
    renderNav(); renderTopbar();
    document.getElementById('view').innerHTML = '<div class="card">' +
      '<h3>本地数据读取失败</h3><p style="color:var(--ink-2);font-size:14px">' + esc(r.error) + '</p></div>';
    handleBrokenData(r.error);
    return;
  }
  if (!r.ok) toast(r.error, 'error', 8000);
  /* FDE 90 天：留一份内置数据副本，并尝试载入浏览器里保存的本地同步快照 */
  window.FDE_DATA_BUILTIN = FDE_DATA;
  window.FDE_SRC_BUILTIN = FDE_SRC;
  fdeSnapLoad();
  if (!r.fresh && S.meta && S.meta.fdeSyncedAt) {
    /* 有同步记录却读不到快照（被清理/换浏览器），提示一次 */
    if (!FDE_SRC || !FDE_SRC.localFp) {
      setTimeout(function () { toast('本地同步快照已失效，当前显示内置版本，可重新「从本地文件同步」', 'warn', 5000); }, 1200);
    }
  }
  if (r.fresh && !S.meta.seeded) seedDemo();
  seedOnes();
  seedArticles();
  seedSkills();
  calibrateSkillInstalls();
  ensureInstalledEntries();
  if (!location.hash) location.hash = '#/overview';
  renderAll();
}
boot();
