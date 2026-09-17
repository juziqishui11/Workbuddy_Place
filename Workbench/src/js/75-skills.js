/* ============================================================
   75-skills.js —— 技能库
     子页：技能（已开发 / 已安装）· 连接器（已连接）
     数据来自 76-skills-data.js 的 SKILL_SEED / CONN_SEED，经 seedSkills() 幂等导入
   ============================================================ */
var SKILL_FILTER = { kind: 'skill', cat: 'all', q: '', dup: false, status: 'all' };
var SK_STATUS = {
  connected: { t: '已连接', c: 'ok' },
  installed: { t: '已安装', c: 'brand' },
  pending: { t: '待安装', c: 'warn' },
  off: { t: '未启用', c: '' }
};

/* 点击「＋任务」要唤起 WorkBuddy 新建任务时，默认绑定的工作区 */
var WB_WORKSPACE = 'D:\\workBuddy_place\\Skill_Create';

/* 构造 WorkBuddy 任务深链 —— 真实协议格式（从 WorkBuddy 主程序 parseDeeplink 确认）：
   workbuddy://task?action=start&prompt=...&cwd=...
   cwd 即工作区；prompt 上限 8000 字符；无 title 参数，标题拼进 prompt 首行。 */
function workbuddyTaskUrl(title, text) {
  var prompt = (title ? '【' + title + '】\n' : '') + (text || '');
  return 'workbuddy://task?action=start' +
    '&prompt=' + encodeURIComponent(prompt) +
    '&cwd=' + encodeURIComponent(WB_WORKSPACE);
}

/* 唤起自定义协议：用 <a> 点击（用户手势链路内），比 iframe 可靠、页面不会被导航 */
function invokeWorkbuddy(url) {
  try {
    var a = document.createElement('a');
    a.href = url;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 1500);
  } catch (e) { /* 协议未注册时静默失败，toast 已兜底 */ }
}

ROUTES['skills'] = {
  title: '技能库',
  desc: '已开发 / 已安装的技能与已连接的连接器，含基础用法与提示词例子',
  render: renderSkills
};

/* ---------------- 数据层 ---------------- */
/* 种子常量在 76-skills-data.js（文件名排在 75 之后），所以只在函数体内引用 */
function skillSeedVer() { return (typeof SKILL_SEED_VERSION === 'number') ? SKILL_SEED_VERSION : 1; }
function skillSeedRows() { return (typeof SKILL_SEED === 'undefined' ? [] : SKILL_SEED).concat(typeof CONN_SEED === 'undefined' ? [] : CONN_SEED); }

function skillsAll() { return S.skills || []; }
function skillsOfKind(kind) {
  return skillsAll().filter(function (s) { return (s.kind || s.type || 'skill') === kind; });
}
function skillCatDef(s) {
  if ((s.kind || s.type) === 'connector') {
    return CONN_CATS.filter(function (c) { return c.id === s.cat; })[0] || { id: s.cat || 'other', name: s.cat || '其他', tone: 'c-sys' };
  }
  return SKILL_CATS.filter(function (c) { return c.id === s.cat; })[0] || { id: s.cat || 'other', name: s.cat || '其他', tone: 'c-sys' };
}
function skillStatusOf(s) {
  if ((s.kind || s.type) === 'connector') return s.status === 'off' ? 'off' : 'connected';
  /* 三态：installed（快照背书）/ pending（待安装）/ off（未启用）；旧数据无 pending，非 off 一律按 installed 兜底 */
  if (s.status === 'pending' || s.status === 'off') return s.status;
  return 'installed';
}
function skillPrimaryStatus(s) { return (s.kind || s.type) === 'connector' ? 'connected' : 'installed'; }
function skillOriginLabel(s) {
  if ((s.kind || s.type) === 'connector') return 'WorkBuddy 连接器';
  if (s.origin === 'self') return '我开发的';
  if (s.origin === 'skillhub') return 'SkillHub 安装';
  if (s.origin === 'builtin') return '内置';
  return '自行登记';
}

/* 按 sid 幂等导入种子；剪枝只清掉示例数据，你新增 / 打标 / 编辑过的一律保留 */
function seedSkills(force) {
  S.meta = S.meta || {};
  var ver = skillSeedVer();
  if (!force && (S.meta.skillsSeed || 0) >= ver) return;
  var seed = skillSeedRows();
  var list = S.skills || [];
  var bySid = {};
  list.forEach(function (s) { if (s && s.sid) bySid[s.sid] = s; });

  var now = nowISO();
  var out = [];
  /* 1) 用户自己的条目：手动新增 / 打标 / 编辑过的，剪枝时豁免
        （旧版示例条目没有 kind、没有 usage，一次性清掉，由新目录接管） */
  list.forEach(function (s) {
    if (!s) return;
    if (!s.sid) {
      var legacy = !s.kind && (s.type === 'skill' || s.type === 'connector');
      if (!legacy) out.push(s);
      return;
    }
    if (s.star || s.userEdited) out.push(s);
  });
  /* 2) 种子按 sid upsert */
  seed.forEach(function (x) {
    var old = bySid[x.sid];
    if (old && (old.star || old.userEdited)) return;
    out.push({
      id: old ? old.id : uid(),
      sid: x.sid,
      kind: x.kind,
      name: x.name,
      label: x.label,
      cat: x.cat,
      origin: x.origin || '',
      status: (old && old.status) || x.status || 'installed',
      ver: x.ver || '',
      desc: x.desc || '',
      usage: (x.usage || []).slice(),
      prompts: (x.prompts || []).slice(),
      tags: (x.tags || []).slice(),
      dup: (x.dup || []).slice(),
      url: (old && old.url) || '',
      star: !!(old && old.star),
      createdAt: (old && old.createdAt) || now,
      updatedAt: now
    });
  });

  /* 3) 真实安装但库里缺录的技能 → ensureInstalledEntries() 每次启动补录（不受版本闸门限制） */

  S.skills = out;
  S.meta.skillsSeed = ver;
  S.meta.skillsAt = now;
  commit();
}

/* 用真实安装快照（78-installed-data.js，由 tools/skills-sync.mjs 生成）校准 hub-* 条目状态。
   每次启动都跑：装了 → 已安装+记录 installedAt；磁盘上没有 → 待安装。
   只动 status/installedAt/ver，不动你打标/编辑过的其他字段。 */
function calibrateSkillInstalls() {
  if (typeof INSTALLED_SKILLS === 'undefined' || !INSTALLED_SKILLS.skills) return;
  var lookup = installedLookup();   /* 多键索引：官方市场的中文 displayName 目录也能命中 */
  var changed = false;
  /* 先去重：同技能同时存在「hub-x」与目录种子「x」时，删 hub- 那条（star/编辑标记迁移过去） */
  var bySid = {};
  (S.skills || []).forEach(function (s) { if (s && s.sid) bySid[s.sid] = s; });
  var drop = {};
  (S.skills || []).forEach(function (s) {
    if (!s || !s.sid || s.sid.indexOf('hub-') !== 0) return;
    var seedEnt = bySid[s.sid.slice(4)];
    if (seedEnt && seedEnt !== s) {
      if (s.star) seedEnt.star = true;
      if (s.userEdited) seedEnt.userEdited = true;
      drop[s.id] = 1;
      changed = true;
    }
  });
  if (changed) S.skills = S.skills.filter(function (s) { return !drop[s.id]; });
  (S.skills || []).forEach(function (s) {
    if (!s || (s.kind || s.type || 'skill') !== 'skill') return;
    if (!s.sid || s.sid.indexOf('hub-') !== 0) return;
    var hit = lookup(s.sid.slice(4), s.name || s.label);
    if (hit) {
      if (s.status !== 'installed' || s.installedAt !== hit.installedAt || (hit.version && s.ver !== hit.version)) {
        s.status = 'installed';
        if (hit.installedAt) s.installedAt = hit.installedAt;
        if (hit.version) s.ver = hit.version;
        s.tags = (s.tags || []).filter(function (t) { return t !== '待安装' && t !== '想装'; });
        s.updatedAt = nowISO();
        changed = true;
      }
    } else if (s.status === 'installed') {
      s.status = 'pending';
      if ((s.tags || []).indexOf('待安装') < 0) s.tags = (s.tags || []).concat(['待安装']);
      s.updatedAt = nowISO();
      changed = true;
    }
  });
  if (changed) commit();
}

/* 真实安装但库里缺录的技能（换设备 / 删过记录），按快照自动补录为「已安装」。
   与 calibrateSkillInstalls 一样每次启动都跑，不受 seedSkills 版本闸门限制。 */
function ensureInstalledEntries() {
  if (typeof INSTALLED_SKILLS === 'undefined' || !INSTALLED_SKILLS.skills) return;
  S.skills = S.skills || [];
  var have = {};
  S.skills.forEach(function (s) {
    if (!s || !s.sid) return;
    have[s.sid] = 1;
    if (s.sid.indexOf('hub-') === 0) have[s.sid.slice(4)] = 1; /* hub-x 等价于裸 slug x */
    else have['hub-' + s.sid] = 1;                            /* 裸 slug x 等价于 hub-x */
  });
  var added = 0;
  Object.keys(INSTALLED_SKILLS.skills).forEach(function (slug) {
    var m = INSTALLED_SKILLS.skills[slug];
    if (!m || m.origin !== 'skillhub') return;
    var sid = 'hub-' + slug;
    if (have[sid]) return;
    S.skills.push({
      id: uid(), sid: sid, kind: 'skill', name: m.name || slug, label: m.name || slug,
      cat: 'eng', origin: 'skillhub', status: 'installed', ver: m.version || '',
      desc: '（自真实安装快照自动补录）', usage: [], prompts: [], tags: ['SkillHub'],
      url: 'https://skillhub.cn/skills/' + slug, star: false,
      installedAt: m.installedAt || '', createdAt: m.installedAt || nowISO(), updatedAt: nowISO()
    });
    added++;
  });
  if (added) commit();
}

/* ---------------- 技能启动器 / SkillHub 每日推荐 ---------------- */
var SK_CMD = { sel: null };

/* 把技能（或一条提示词）唤起 WorkBuddy 新建任务（绑定工作区 WB_WORKSPACE）
   返回 { title, url }；同步给出提示，复制任务内容到剪贴板作为兜底。 */
function skillLaunchTask(skill, prompt) {
  if (!skill && !prompt) return null;
  var title = (skill ? (skill.label || skill.name) : '技能任务');
  var text = (prompt || (skill && skill.desc) || title) + '';
  var spec = '【WorkBuddy 任务】\n标题：' + title + '\n工作区：' + WB_WORKSPACE + '\n\n' + text;
  toast('正在唤起 WorkBuddy 新建任务（工作区 ' + WB_WORKSPACE + '），任务内容已复制到剪贴板。未自动弹出请手动打开 WorkBuddy → 新建任务 → 选该工作区 → 粘贴。', 'ok', 5200);
  if (typeof copyText === 'function') { try { copyText(spec).catch(function () {}); } catch (e) {} }
  /* 唤起 workbuddy:// 协议：WorkBuddy 弹出而当前页面保留；协议未注册时浏览器自行提示，toast 已兜底 */
  invokeWorkbuddy(workbuddyTaskUrl(title, text));
  return { title: title, url: workbuddyTaskUrl(title, text) };
}

/* 命令框：选中技能后渲染其提示词 chips */
function skCmdRenderSubs() {
  var box = document.getElementById('sk-cmd-subs'); if (!box) return;
  var s = SK_CMD.sel ? (S.skills || []).filter(function (x) { return x.id === SK_CMD.sel; })[0] : null;
  if (!s || !(s.prompts || []).length) { box.innerHTML = '<div class="sk-cmd-hint">该技能暂无提示词，可在下方直接描述需求生成任务。</div>'; return; }
  box.innerHTML = '<div class="sk-cmd-subt">' + esc(s.label || s.name) + ' · 点「＋任务」唤起 WorkBuddy 新建任务，点「⧉」复制：</div>' +
    (s.prompts || []).map(function (p) {
      var ep = esc(p);
      return '<div class="sk-chip"><span class="sk-chip-t">' + ep + '</span>' +
        '<button class="btn xs pri" data-act="sk-task" data-id="' + s.id + '" data-p="' + ep + '">＋任务</button>' +
        '<button class="btn xs ghost" data-act="sk-copy" data-p="' + ep + '">⧉</button></div>';
    }).join('');
}

/* 命令框「描述需求生成任务」 */
function skCmdFreeGen() {
  var inp = document.getElementById('sk-cmd-free');
  var txt = inp ? inp.value.trim() : '';
  var s = SK_CMD.sel ? (S.skills || []).filter(function (x) { return x.id === SK_CMD.sel; })[0] : null;
  if (!txt && !s) { toast('写点需求或选个技能', 'warn'); return; }
  skillLaunchTask(s, txt || (s && ((s.prompts && s.prompts[0]) || s.desc)) || '');
  if (inp) inp.value = '';
}

/* 命令框 HTML */
function skCmdBoxHtml() {
  if (!SK_CMD.sel) { var fs = skillsOfKind('skill'); if (fs[0]) SK_CMD.sel = fs[0].id; }
  var opts = '<option value="">— 选技能 —</option>' + skillsOfKind('skill').map(function (s) {
    return '<option value="' + s.id + '"' + (s.id === SK_CMD.sel ? ' selected' : '') + '>' + esc(s.label || s.name) + '</option>';
  }).join('');
  return '<div class="card tight sk-cmd">' +
    '<div class="sk-cmd-hd">🚀 技能启动器 · 选技能看提示词一键唤起 WorkBuddy 新建任务（工作区 ' + esc(WB_WORKSPACE) + '），或描述需求直接建</div>' +
    '<div class="sk-cmd-row"><select id="sk-cmd-sel" class="sk-cmd-sel">' + opts + '</select></div>' +
    '<div id="sk-cmd-subs" class="sk-cmd-subs"></div>' +
    '<div class="sk-cmd-free">' +
      '<input id="sk-cmd-free" type="text" placeholder="描述你想做的事，例如：把本周周报排版成 markdown">' +
      '<button class="btn pri" data-act="sk-cmd-free">＋ 生成任务</button>' +
    '</div></div>';
}

/* SkillHub 分类 → 本站 9 分类映射 */
function mapHubCat(cat) {
  cat = (cat || '').toLowerCase();
  var rules = [
    [/writing|copy|content|article|文案|写作/, 'write'],
    [/image|img|design|visual|cover|illustr|图|视觉|封面/, 'visual'],
    [/video|audio|voice|音视频/, 'media'],
    [/data|excel|table|csv|db|sql|数据|表格/, 'data'],
    [/knowledge|note|obsidian|notion|wiki|学习|知识|笔记/, 'knowledge'],
    [/dev|code|frontend|deploy|script|browser|crawl|agent|工程|部署|前端|代码|智能体/, 'eng'],
    [/mail|meeting|notify|message|calendar|邮件|会议|通知/, 'collab'],
    [/search|news|rumor|info|资讯|搜索|辟谣/, 'info'],
    [/system|theme|skin|env|换肤|系统/, 'system']
  ];
  for (var i = 0; i < rules.length; i++) if (rules[i][0].test(cat)) return rules[i][1];
  return 'system';
}

/* 按 slug 去重（保序）：同名不同 slug 是上游真实存在的不同技能，必须都保留；
   只有同一个 slug 重复出现才算重复 —— 冲突时保留下载量最高的那条。
   注意：页面「每日推荐」渲染前会再跑一次，老数据也能自愈。 */
function hubDedupBySlug(list) {
  var seen = {}, out = [];
  (list || []).forEach(function (it) {
    if (!it) return;
    var k = String(it.slug || '').trim() || ('\u0000name:' + (it.name || ''));
    if (!Object.prototype.hasOwnProperty.call(seen, k)) { seen[k] = out.length; out.push(it); return; }
    /* 已存在同 slug：保留下载量更大的那条（位置不变） */
    var at = seen[k];
    if ((it.downloads || 0) > (out[at].downloads || 0)) out[at] = it;
  });
  return out;
}

/* 快照年龄（天）：用于提示数据新鲜度；无法解析返回 -1 */
function hubSnapshotAgeDays(iso) {
  if (!iso) return -1;
  var t = Date.parse(String(iso).slice(0, 10) + 'T00:00:00Z');
  if (isNaN(t)) return -1;
  return Math.floor((Date.now() - t) / 86400000);
}
/* 快照超过这个天数就在页面上提示过期 */
var HUB_STALE_DAYS = 14;

/* 每日推荐：刷新 —— 重载内置快照。
   为什么不实时拉取：api.skillhub.cn 响应头没有 Access-Control-Allow-Origin，
   浏览器（file:// 与云端部署）必然被 CORS 拦截，这是安全策略硬限制、无法绕过。
   要更新内容请双击 tools/sync-skills.cmd 重新抓取并重建页面。 */
function skHubRefresh() {
  if (typeof SKILLHUB_DAILY === 'undefined') { toast('未找到内置快照', 'warn'); return; }
  var n = hubDedupBySlug(SKILLHUB_DAILY.items || []).length;
  rerender();
  var at = SKILLHUB_DAILY.fetchedAt || '';
  var age = hubSnapshotAgeDays(at);
  if (age >= HUB_STALE_DAYS) {
    toast('已重载内置快照（' + n + ' 个，生成于 ' + at + '，已 ' + age + ' 天未更新）。要更新请双击 tools/sync-skills.cmd。', 'warn', 6000);
  } else {
    toast('已重载内置快照：' + n + ' 个技能（生成于 ' + at + '）', 'ok', 3600);
  }
}

/* 每日推荐：「＋想装」加入技能库（未启用） */
function skHubSave(slug) {
  if (typeof SKILLHUB_DAILY === 'undefined') return;
  var it = (SKILLHUB_DAILY.items || []).filter(function (x) { return x.slug === slug; })[0];
  if (!it) return;
  S.skills = S.skills || [];
  if (S.skills.some(function (s) { return s.sid === 'hub-' + slug; })) { toast('已在技能库', 'warn'); return; }
  S.skills.push({
    id: uid(), sid: 'hub-' + slug, kind: 'skill', name: it.name, label: it.name,
    cat: mapHubCat(it.cat), origin: 'skillhub', status: 'off', ver: it.version || '',
    desc: it.desc, usage: [], prompts: [], tags: ['SkillHub', '想装'], url: it.link,
    star: false, createdAt: nowISO(), updatedAt: nowISO()
  });
  commit(); toast('已加入技能库（未启用），去安装吧', 'ok');
}

/* 归一化匹配键（与 tools/skills-sync.mjs 的 normKey 一致）：小写、去分隔符/空格 */
function skNormKey(s) { return String(s || '').toLowerCase().replace(/[\s_\-–—·.]/g, ''); }

/* 在真实安装快照里按多键查找（slug / name / skillId / 目录名，忽略分隔符大小写）。
   返回快照行或 null —— 解决「ClawHub slug」与「官方市场中文 displayName」两套命名对不上的问题。
   第三层兜底：归一化后互相包含（如 腾讯会议MCP ↔ 腾讯会议），但要求短键长度 ≥3 避免误判。 */
function installedLookup() {
  var snap = (typeof INSTALLED_SKILLS === 'undefined') ? null : INSTALLED_SKILLS;
  if (!snap || !snap.skills) return function () { return null; };
  var idx = snap.index || {};
  var allKeys = null;   /* 懒建：index 键列表，用于包含式兜底 */
  return function (slug, name) {
    var keys = [slug, name];
    for (var i = 0; i < keys.length; i++) {
      var k = skNormKey(keys[i]);
      if (!k) continue;
      var hit = idx[k] || (snap.skills[keys[i]] ? keys[i] : null);
      if (hit && snap.skills[hit]) return snap.skills[hit];
    }
    /* 包含式兜底：推荐项「腾讯会议MCP」↔ 已装「腾讯会议」这类同义异名 */
    for (var j = 0; j < keys.length; j++) {
      var q = skNormKey(keys[j]);
      if (!q || q.length < 3) continue;
      if (!allKeys) allKeys = Object.keys(idx);
      for (var m = 0; m < allKeys.length; m++) {
        var kk = allKeys[m];
        if (kk.length < 3) continue;
        if (kk.indexOf(q) >= 0 || q.indexOf(kk) >= 0) {
          var h2 = idx[kk];
          if (h2 && snap.skills[h2]) return snap.skills[h2];
        }
      }
    }
    return null;
  };
}

/* 该推荐项是否已真实安装：① 快照多键命中（官方市场 / ClawHub 两套命名都能对）
   ② 库内同 sid 且 installed ③ 库内名称归一化后同名或互相包含（人工登记的条目） */
function hubInstalledOf(it) {
  var hit = installedLookup()(it.slug, it.name);
  if (hit) return { hit: hit, ent: null };
  var q = skNormKey(it.slug), qn = skNormKey(it.name);
  var ent = (S.skills || []).filter(function (s2) {
    if ((s2.kind || s2.type || 'skill') !== 'skill') return false;
    if (skillStatusOf(s2) !== 'installed') return false;
    if (s2.sid === 'hub-' + it.slug) return true;
    var k = skNormKey(s2.name || s2.label || '');
    if (!k) return false;
    if (k === q || k === qn) return true;
    if ((q.length >= 3 && k.indexOf(q) >= 0) || (qn.length >= 3 && k.indexOf(qn) >= 0)) return true;
    if ((k.length >= 3 && (q.indexOf(k) >= 0 || qn.indexOf(k) >= 0))) return true;
    return false;
  })[0];
  return ent ? { hit: null, ent: ent } : null;
}
/* 每日推荐安装：找推荐项 / 登记待安装 */
function skHubFindItem(slug) {
  var items = (S.skillhub && S.skillhub.items && S.skillhub.items.length) ? S.skillhub.items
    : (typeof SKILLHUB_DAILY !== 'undefined' ? SKILLHUB_DAILY.items : []);
  var src = null;
  for (var i = 0; i < (items || []).length; i++) { if (items[i].slug === slug) { src = items[i]; break; } }
  return src;
}
function skHubRegisterPending(src) {
  var slug = src.slug, now = nowISO();
  S.skills = S.skills || [];
  var ent = null;
  for (var j = 0; j < S.skills.length; j++) { if (S.skills[j].sid === 'hub-' + slug) { ent = S.skills[j]; break; } }
  if (!ent) {
    ent = { id: uid(), sid: 'hub-' + slug, kind: 'skill', name: src.name, label: src.name,
      cat: mapHubCat(src.cat), origin: 'skillhub', status: 'pending', ver: src.version || '',
      desc: src.desc, usage: [], prompts: [], tags: ['SkillHub', '待安装'], url: src.link,
      star: false, createdAt: now, updatedAt: now };
    S.skills.push(ent);
  } else {
    ent.status = 'pending';
    ent.tags = (ent.tags || []).filter(function (t) { return t !== '想装'; });
    if ((ent.tags || []).indexOf('待安装') < 0) ent.tags = (ent.tags || []).concat(['待安装']);
    ent.updatedAt = now;
  }
  ent.requestedAt = now;
  commit();
  return ent;
}

/* 每日推荐：「⚡ 安装」——以 WorkBuddy 官方技能市场为主（同一套源，装完可一键升级）
   ① 主路径：打开官方技能市场（workbuddy://skills，名称已复制，粘贴即搜即装）
   ② 备选：一键安装深链（部分客户端版本支持，直接弹安装确认）
   ③ 兜底：任务安装（AI 先搜官方市场，查不到再 ClawHub + 安全审计） */
function skHubInstall(slug) {
  var src = skHubFindItem(slug);
  if (!src) { toast('推荐数据里没找到 ' + slug, 'warn'); return; }
  skHubRegisterPending(src);
  var name = src.name || slug;
  var dl = skHubDownloadUrl(src);
  if (typeof copyText === 'function') { try { copyText(name).catch(function () {}); } catch (e) {} }
  var wrap = openModal({
    title: '安装：' + name,
    body: '<div class="sk-im">' +
      '<div class="sk-im-step"><div class="sk-im-t">① 官方技能市场（推荐 · 主路径）</div>' +
      '<div class="sk-im-d">打开客户端「专家·技能·连接器」，<b>技能名已复制（' + esc(name) + '）</b>，在搜索栏粘贴即可搜到并安装。<b>与本站同一套源</b>，装完可一键升级。</div>' +
      '<div class="sk-im-btns"><button class="btn pri" id="sk-im-market">打开技能市场</button>' +
      '<button class="btn" id="sk-im-copy">复制名称</button></div></div>' +
      '<div class="sk-im-step"><div class="sk-im-t">② 备用 · 一键安装（部分版本支持）</div>' +
      '<div class="sk-im-d">直接唤起 WorkBuddy 安装确认框，安装源：<code>' + esc(dl) + '</code></div>' +
      '<div class="sk-im-btns"><button class="btn" id="sk-im-one">⚡ 一键安装</button></div></div>' +
      '<div class="sk-im-step"><div class="sk-im-t">③ 兜底 · 任务安装（市场里没有的技能）</div>' +
      '<div class="sk-im-d">唤起 WorkBuddy 任务：AI 先调 <code>workbuddy_search_marketplace_skill</code> 搜官方市场，查不到再从 ClawHub 拉取（含安全审计）。</div>' +
      '<div class="sk-im-btns"><button class="btn" id="sk-im-task">⚡ 任务安装</button></div></div>' +
      '</div>',
    footer: '<button class="btn" data-mclose="1">关闭</button>'
  });
  wrap.querySelector('#sk-im-market').onclick = function () { invokeWorkbuddy('workbuddy://skills'); toast('已唤起技能市场，搜索栏粘贴「' + name + '」即可安装', 'ok', 4200); };
  wrap.querySelector('#sk-im-copy').onclick = function () { if (typeof copyText === 'function') { try { copyText(name).catch(function () {}); } catch (e) {} } toast('已复制：' + name, 'ok'); };
  wrap.querySelector('#sk-im-one').onclick = function () {
    invokeWorkbuddy(workbuddySkillInstallUrl(name, dl, 'skillhub'));
    toast('已唤起 WorkBuddy 安装确认；安装完成后回这里点「✓ 刷新状态」', 'ok', 4600);
  };
  wrap.querySelector('#sk-im-task').onclick = function () { closeModal(wrap); skHubTaskInstall(slug); };
}

/* 重查某推荐项的安装状态：按内置安装快照重新判定，命中则校准库内条目并刷新视图。
   注意：这是「按快照判定」，不是「实时读本机磁盘」（浏览器做不到）。 */
function skHubRecheck(slug) {
  var src = skHubFindItem(slug);
  calibrateSkillInstalls();
  ensureInstalledEntries();
  rerender();
  var ins = src ? hubInstalledOf(src) : null;
  var snapAt = (typeof INSTALLED_SKILLS !== 'undefined' && INSTALLED_SKILLS.generatedAt)
    ? String(INSTALLED_SKILLS.generatedAt).slice(0, 10) : '';
  if (ins) {
    toast('已确认安装：' + ((src && src.name) || slug) + (ins.hit && ins.hit.version ? '（' + ins.hit.version + '）' : '') +
      (snapAt ? '｜依据安装快照 ' + snapAt : ''), 'ok', 4000);
  } else {
    toast('安装快照里没有它。若刚在客户端装好，请双击 tools/sync-skills.cmd 更新快照后再刷新页面。', 'warn', 5600);
  }
}

/* 推荐项的安装源：优先 ClawHub 直链（客户端 skill/install 深链可直接下载安装） */
function skHubDownloadUrl(src) {
  var slug = src.slug, owner = src.owner || '';
  if (src.source === 'clawhub' || (!owner && /clawhub/i.test(src.source || ''))) {
    return 'https://clawhub.ai/api/v1/download?slug=' + slug + (owner ? '&owner=' + owner : '');
  }
  if (owner) return 'https://clawhub.ai/api/v1/download?slug=' + slug + '&owner=' + owner;
  return 'https://clawhub.ai/api/v1/download?slug=' + slug;
}

/* WorkBuddy 技能安装深链（从客户端 tryHandleSkillInstallDeepLink 确认）：
   workbuddy://codebuddy-ide/skill/install?skillname=<名>&downloadurl=<下载地址>&channelType=<渠道> */
function workbuddySkillInstallUrl(name, downloadUrl, channel) {
  return 'workbuddy://codebuddy-ide/skill/install'
    + '?skillname=' + encodeURIComponent(name || '')
    + '&downloadurl=' + encodeURIComponent(downloadUrl || '')
    + '&channelType=' + encodeURIComponent(channel || 'skillhub');
}

/* 任务安装：AI 先搜官方市场（workbuddy_search_marketplace_skill），查不到再从 ClawHub 拉 */
function skHubTaskInstall(slug) {
  var src = skHubFindItem(slug);
  if (!src) { toast('推荐数据里没找到 ' + slug, 'warn'); return; }
  var name = src.name || slug;
  var cmd = '安装技能「' + name + '」（slug: ' + slug + '，版本 v' + (src.version || 'latest') + '）\n'
    + '按以下顺序执行：\n'
    + '1. 优先调内置工具 workbuddy_search_marketplace_skill（keyword="' + name + '"）搜官方技能市场；\n'
    + '2. 搜到 → 用市场安装工具按 skillId 安装（官方渠道，自动写 _skillhub_meta.json，source=marketplace），装完即成功；\n'
    + '3. 市场确实没有 → ClawHub 兜底：GET https://clawhub.ai/api/v1/skills/' + slug + ' 看 matches 拿 owner，再 curl "https://clawhub.ai/api/v1/download?slug=' + slug + '&owner=<owner>" 解压到 ~/.workbuddy/skills/' + slug + '__skillhub/；解包前先做安全审计（skills-security-check），P0/P1 风险先向我确认；写 _skillhub_meta.json（source=skillhub）；\n'
    + '4. 装完回报结果，并提醒我运行 node tools/skills-sync.mjs + node build.mjs 校准技能库页面状态。';
  var ent = skHubRegisterPending(src);
  ent.requestedAt = nowISO(); commit();
  toast('已登记「待安装」，正在唤起 WorkBuddy 任务安装（指令已复制兜底）…', 'ok', 4200);
  if (typeof copyText === 'function') { try { copyText(cmd).catch(function () {}); } catch (e) {} }
  invokeWorkbuddy(workbuddyTaskUrl('任务安装技能：' + name, cmd));
  rerender();
}

/* 三个 Tab（技能 / 连接器 / 每日推荐） */
function skTabsHtml(kind) {
  var nSkill = skillsOfKind('skill').length, nConn = skillsOfKind('connector').length;
  return '<div class="sk-tabs">' +
    '<button class="sk-tab' + (kind === 'skill' ? ' on' : '') + '" data-act="sk-kind" data-v="skill">技能<span class="n">' + nSkill + '</span></button>' +
    '<button class="sk-tab' + (kind === 'connector' ? ' on' : '') + '" data-act="sk-kind" data-v="connector">连接器<span class="n">' + nConn + '</span></button>' +
    '<button class="sk-tab' + (kind === 'hub' ? ' on' : '') + '" data-act="sk-kind" data-v="hub">每日推荐</button>' +
    '<div class="sk-tab-sp"></div>' +
    (kind !== 'hub' ? '<button class="btn sm" data-act="sk-rescan" title="按 76-skills-data.js 重新导入（保留你新增/编辑/打标的条目）">↻ 重新导入</button>' +
      '<button class="btn sm pri" data-act="skill-new">＋ 新增</button>' : '') +
    '</div>';
}

/* 每日推荐渲染 */
function renderHub(el) {
  /* 事实源 = 构建期烘焙的内置快照（浏览器读不到磁盘、也跨不了域，
     所以 S.skillhub 实时缓存不参与取数；migrate() 每次也会把它重置为空）。
     渲染前统一按 slug 去重，历史脏数据也能自愈。 */
  var snap = (typeof SKILLHUB_DAILY !== 'undefined') ? SKILLHUB_DAILY : { items: [], fetchedAt: '', note: '' };
  var items = hubDedupBySlug(snap.items || []);
  var at = snap.fetchedAt || '';
  var note = snap.note || '';
  var age = hubSnapshotAgeDays(at);
  var stale = (age >= HUB_STALE_DAYS);

  var html = '';
  html += '<div class="page-note' + (stale ? ' warn' : '') + '">SkillHub 推荐快照' +
    (at ? ' · 生成于 ' + esc(at) : '') +
    ' · 共 ' + items.length + ' 个技能' +
    (stale ? ' · ⚠ 已 ' + age + ' 天未更新，双击 tools/sync-skills.cmd 可刷新' : '') +
    '</div>';
  html += '<div class="card tight" style="margin-bottom:14px">' + skTabsHtml('hub') +
    '<div class="sk-hub-bar">' +
      '<div class="sk-hub-note">' + esc(note || '') + '</div>' +
      '<button class="btn sm pri" data-act="sk-hub-refresh" title="重新载入内置快照。浏览器无法直连 SkillHub（跨域限制），要更新内容请双击 tools/sync-skills.cmd">↻ 重载快照</button>' +
    '</div>' +
    '</div>';

  if (items && items.length) {
    html += '<div class="sk-hub-grid">' + items.map(function (it) {
      var subs = (it.subs || []).map(function (x) { return '<span class="sk-hub-sub">' + esc(x) + '</span>'; }).join('');
      var ins = hubInstalledOf(it);
      var foot = '<div class="sk-hub-foot">' +
        '<button class="btn sm" data-act="open-url" data-url="' + esc(it.link) + '">打开</button>' +
        (ins
          ? '<button class="btn sm ok" data-act="sk-hub-recheck" data-slug="' + esc(it.slug) + '" title="已安装' + (ins.hit && ins.hit.version ? '（' + esc(ins.hit.version) + '）' : '') + (ins.hit ? '，来源 ' + esc(ins.hit.source || '') : '') + '，点击按内置快照重新判定">✓ 已装</button>'
          : '<button class="btn sm pri" data-act="sk-hub-install" data-slug="' + esc(it.slug) + '" title="打开官方技能市场安装（推荐）">⚡ 安装</button>' +
            '<button class="btn sm" data-act="sk-hub-save" data-slug="' + esc(it.slug) + '">＋想装</button>') +
        '</div>';
      return '<div class="sk-hub-card">' +
        '<div class="sk-hub-top">' +
          (it.icon ? '<img class="sk-hub-ic" src="' + esc(it.icon) + '" alt="" onerror="this.style.display=\'none\'">' : '<div class="sk-hub-ic sk-hub-icx">★</div>') +
          '<div class="sk-hub-name">' + esc(it.name) + (it.verified ? ' <span class="sk-hub-v" title="官方认证">✓</span>' : '') + '</div>' +
          (it.version ? '<span class="sk-hub-ver">v' + esc(it.version) + '</span>' : '') +
        '</div>' +
        '<div class="sk-hub-meta">' + esc(it.cat || '') + ' · ★' + (it.stars || 0).toLocaleString() + ' · ↓' + (it.downloads || 0).toLocaleString() + '</div>' +
        '<div class="sk-hub-desc">' + esc(it.desc || '') + '</div>' +
        (subs ? '<div class="sk-hub-subs">' + subs + '</div>' : '') +
        foot +
        '</div>';
    }).join('') + '</div>';
  } else {
    html += '<div class="card">' + emptyBox('⬡', '暂时没有推荐数据', '双击 tools/sync-skills.cmd 重新抓取快照后刷新页面') + '</div>';
  }
  el.innerHTML = html;
}

/* ---------------- 渲染 ---------------- */
function renderSkills(el) {
  if (SKILL_FILTER.kind === 'hub') { renderHub(el); return; }
  var all = skillsAll();
  var nSkill = skillsOfKind('skill').length;
  var nConn = skillsOfKind('connector').length;
  var nSelf = skillsOfKind('skill').filter(function (s) { return s.origin === 'self'; }).length;

  var kind = SKILL_FILTER.kind === 'connector' ? 'connector' : 'skill';
  var catList = kind === 'connector' ? CONN_CATS : SKILL_CATS;
  var pool = skillsOfKind(kind);

  var catCount = {};
  pool.forEach(function (s) { catCount[s.cat] = (catCount[s.cat] || 0) + 1; });
  var nDup = pool.filter(function (s) { return (s.dup || []).length; }).length;
  var nOn = pool.filter(function (s) { return skillStatusOf(s) === 'installed' || skillStatusOf(s) === 'connected'; }).length;
  var nPending = pool.filter(function (s) { return skillStatusOf(s) === 'pending'; }).length;
  var nOff = pool.filter(function (s) { return skillStatusOf(s) === 'off'; }).length;

  var q = (SKILL_FILTER.q || '').trim().toLowerCase();
  var list = pool.filter(function (s) {
    if (SKILL_FILTER.cat !== 'all' && s.cat !== SKILL_FILTER.cat) return false;
    if (SKILL_FILTER.dup && !(s.dup && s.dup.length)) return false;
    if (SKILL_FILTER.status && SKILL_FILTER.status !== 'all' && skillStatusOf(s) !== SKILL_FILTER.status) return false;
    if (!q) return true;
    var hay = [s.name, s.label, s.desc, s.origin, s.ver, (s.usage || []).join(' '), (s.prompts || []).join(' '), (s.tags || []).join(' ')].join(' ').toLowerCase();
    return hay.indexOf(q) >= 0;
  });

  /* 默认排序：未启用沉底 → 其余按安装时间倒序（installedAt ← requestedAt ← createdAt）→ 同时间按中文名 */
  function skTimeOf(s) { return s.installedAt || s.requestedAt || s.createdAt || ''; }
  list = list.slice().sort(function (a, b) {
    var sa = skillStatusOf(a) === 'off' ? 1 : 0, sb = skillStatusOf(b) === 'off' ? 1 : 0;
    if (sa !== sb) return sa - sb;
    var ta = skTimeOf(a), tb = skTimeOf(b);
    if (ta !== tb) return ta > tb ? -1 : 1;
    return String(a.label || a.name).localeCompare(String(b.label || b.name), 'zh');
  });

  var html = '';
  html += '<div class="page-note">技能 ' + nSkill + ' 个（我开发的 ' + nSelf + ' 个）· 已连接连接器 ' + nConn +
    ' 个 · 目录版本 v' + skillSeedVer() + (S.meta && S.meta.skillsAt ? ' · 导入于 ' + esc(String(S.meta.skillsAt).slice(0, 10)) : '') + '</div>';

  html += '<div class="stat-row s3">' +
    '<div class="stat s-brand"><div class="n">' + nSkill + '</div><div class="l">技能</div></div>' +
    '<div class="stat s-ok"><div class="n">' + nSelf + '</div><div class="l">我开发的</div></div>' +
    '<div class="stat ' + (nConn ? 's-ok' : 's-warn') + '"><div class="n">' + nConn + '</div><div class="l">已连接连接器</div></div>' +
    '</div>';

  /* 类型切换 + 搜索 + 新增 */
  html += '<div class="card tight" style="margin-bottom:14px">' +
    skTabsHtml(kind) +
    '<div class="sk-search"><input type="text" id="sk-q" placeholder="搜索名称 / 用途 / 用法 / 提示词 / 标签" value="' + esc(SKILL_FILTER.q) + '"></div>' +
    /* 两组筛选彼此独立（分类单选 + 状态单选），分行放置避免被误认为一组多选 */
    '<div class="sk-frow">' +
      '<span class="chip-lbl">分类</span>' +
      '<div class="chips">' +
        '<button class="chip ' + (SKILL_FILTER.cat === 'all' ? 'on' : '') + '" data-act="sk-cat" data-v="all">全部<span class="n">' + pool.length + '</span></button>' +
        catList.map(function (c) {
          var n = catCount[c.id] || 0;
          return '<button class="chip ' + (SKILL_FILTER.cat === c.id ? 'on' : '') + (n ? '' : ' dim') + '" data-act="sk-cat" data-v="' + c.id + '">' +
            c.name + '<span class="n">' + n + '</span></button>';
        }).join('') +
        (nDup ? '<button class="chip ' + (SKILL_FILTER.dup ? 'on' : '') + '" data-act="sk-dup" data-v="on">⚠ 疑似重复<span class="n">' + nDup + '</span></button>' : '') +
      '</div>' +
    '</div>' +
    '<div class="sk-frow">' +
      '<span class="chip-lbl">状态</span>' +
      '<div class="chips">' +
        '<button class="chip ' + (SKILL_FILTER.status === 'all' ? 'on' : '') + '" data-act="sk-st" data-v="all">全部<span class="n">' + pool.length + '</span></button>' +
        '<button class="chip ' + (SKILL_FILTER.status === 'installed' ? 'on' : '') + '" data-act="sk-st" data-v="installed">已安装<span class="n">' + nOn + '</span></button>' +
        (kind === 'skill' ? '<button class="chip ' + (SKILL_FILTER.status === 'pending' ? 'on' : '') + (nPending ? '' : ' dim') + '" data-act="sk-st" data-v="pending">待安装<span class="n">' + nPending + '</span></button>' : '') +
        '<button class="chip ' + (SKILL_FILTER.status === 'off' ? 'on' : '') + '" data-act="sk-st" data-v="off">未启用<span class="n">' + nOff + '</span></button>' +
      '</div>' +
    '</div>' +
    (kind === 'skill' ? '<div class="sk-catnote">' + catList.filter(function (c) { return catCount[c.id]; }).map(function (c) {
      return '<span><b>' + esc(c.name) + '</b>' + esc(c.note || '') + '</span>';
    }).join('') + '</div>' : '') +
    '</div>' +
    (kind === 'skill' ? skCmdBoxHtml() : '');

  if (list.length) {
    html += '<div class="sk-grid">' + list.map(skillCard).join('') + '</div>';
  } else {
    html += '<div class="card">' + emptyBox('⬡', '没有匹配的条目', '换个分类或清空搜索试试；也可以点「＋ 新增」自己登记') + '</div>';
  }

  html += '<div class="card tight" style="margin-top:16px"><div class="card-hd" style="margin-bottom:8px"><h3 style="font-size:14px">使用说明</h3></div>' +
    '<div class="sk-help">' +
      '<div>· <b>技能</b>：用户级技能放在 <code>C:\\Users\\EDY\\.workbuddy\\skills\\</code>，项目级放在 <code>{项目}\\.workbuddy\\skills\\</code>。新装了技能后，点上面的「↻ 重新导入」前需先把目录补进 <code>src/js/76-skills-data.js</code> 再重新构建。</div>' +
      '<div>· <b>连接器</b>：在 WorkBuddy 里完成授权后可用，重启后可能需要重新授权。状态取自 <code>connectors/*/connector-states.json</code> 的 bound / enabled。</div>' +
      '<div>· <b>提示词例子</b>：点「⧉」复制提示词，点「＋任务」唤起 WorkBuddy 新建任务（工作区已设为 ' + esc(WB_WORKSPACE) + '），任务内容会同步复制到剪贴板兜底；「☆ 打标」的条目在重新导入时不会被清理。</div>' +
      '<div>· <b>技能启动器</b>：顶部选技能即可看提示词一键唤起 WorkBuddy 新建任务，或在框里描述需求直接建。任务内容同步复制，唤起失败也能手动粘贴。</div>' +
      '<div>· <b>疑似重复</b>：功能重叠的技能已打「⚠ 疑似重复」标记并给出优化建议（可删 / 二选一 / 可合并 / 可保留）；顶部「仅看重复」可一键筛出待优化项，帮你精简技能库。</div>' +
      '<div>· <b>真实安装（市场优先）</b>：「每日推荐」点「⚡ 安装」→ 弹窗主路径是①「打开技能市场」直达客户端「专家·技能·连接器」搜索安装（官方渠道，技能名已自动复制）；② 备用的「一键安装」深链；③ 兜底「任务安装」——AI 先调 <code>workbuddy_search_marketplace_skill</code> 搜官方市场，查不到才从 ClawHub 拉取（含安全检查）。装完后<b>双击 <code>tools/sync-skills.cmd</code></b>（自动重抓快照 + 扫本机安装 + 重建页面），状态即与本机真实安装对齐。页面读不到磁盘，「已安装」永远以构建期烘焙的安装快照为准。</div>' +
      '<div>· <b>每日推荐</b>：SkillHub 热门技能快照（按 slug 去重，卡片显示下载量/收藏数）；「＋想装」收藏、「⚡ 安装」真装，已真实安装的显示「✓ 已装」。刷新按钮是「↻ 重载快照」——浏览器无法直连 SkillHub（跨域限制），要更新内容请双击 <code>tools/sync-skills.cmd</code> 重新抓取并重建页面。</div>' +
      '<div>· 这里只记录名称与用途，<b>不要填写任何密钥或 token</b>，凭据一律放在车厘子记事本。</div>' +
    '</div></div>';

  el.innerHTML = html;

  var qi = el.querySelector('#sk-q');
  if (qi) {
    qi.addEventListener('keydown', function (e) { if (e.key === 'Enter') { SKILL_FILTER.q = qi.value; rerender(); } });
    qi.addEventListener('blur', function () { if (qi.value !== SKILL_FILTER.q) { SKILL_FILTER.q = qi.value; rerender(); } });
  }

  if (kind === 'skill') {
    var ss = el.querySelector('#sk-cmd-sel');
    if (ss) ss.addEventListener('change', function () { SK_CMD.sel = ss.value; skCmdRenderSubs(); });
    var fr = el.querySelector('[data-act="sk-cmd-free"]');
    if (fr) fr.addEventListener('click', skCmdFreeGen);
    skCmdRenderSubs();
  }
}

/* ---------------- 重复 / 重叠 辅助 ---------------- */
function dupTargetLabel(sid) {
  var all = SKILL_SEED.concat(CONN_SEED);
  for (var i = 0; i < all.length; i++) { if (all[i].sid === sid) return all[i].label || all[i].name; }
  var cur = (S.skills || []).filter(function (x) { return x.sid === sid; })[0];
  return cur ? (cur.label || cur.name) : sid;
}
function dupSugClass(sug) { return (DUP_SUG_CLASS && DUP_SUG_CLASS[sug]) || 'k'; }

/* ---------------- 卡片 ---------------- */
function skillCard(s) {
  var kind = s.kind || s.type || 'skill';
  var isConn = kind === 'connector';
  var cat = skillCatDef(s);
  var st = skillStatusOf(s);
  var meta = SK_STATUS[st] || SK_STATUS.off;
  var h = '<div class="sk-card ' + esc(cat.tone || 'c-sys') + (st === 'off' ? ' dim' : '') + '">';

  /* 顶部：分类标签（凸显） + 来源 + 状态 */
  h += '<div class="sk-head">' +
    '<span class="sk-badge">' + esc(cat.name) + '</span>' +
    '<span class="sk-or">' + esc(skillOriginLabel(s)) + '</span>' +
    (s.ver ? '<span class="sk-ver">v' + esc(s.ver) + '</span>' : '') +
    '<span class="tag ' + meta.c + '" style="margin-left:auto">' + meta.t + '</span>' +
    '</div>';

  h += '<div class="sk-title">' + esc(s.label || s.name) + '</div>';
  if (s.label && s.name && s.label !== s.name) h += '<div class="sk-id">' + esc(s.name) + '</div>';
  h += '<div class="sk-desc">' + esc(s.desc || '') + '</div>';

  if ((s.dup || []).length) {
    h += '<div class="sk-dup">' +
      (s.dup || []).map(function (d) {
        return '<div class="sk-dup-row"><span class="sk-dup-badge">⚠ 疑似重复</span>与 <b>' + esc(dupTargetLabel(d.with)) + '</b> 重叠：' + esc(d.note) +
          ' <span class="sk-dup-sug ' + dupSugClass(d.suggest) + '">' + esc(d.suggest) + '</span></div>';
      }).join('') +
      '</div>';
  }

  if ((s.usage || []).length) {
    h += '<div class="sk-block"><div class="sk-bt">基础用法</div><ol class="sk-steps">' +
      s.usage.map(function (u) { return '<li>' + esc(u) + '</li>'; }).join('') +
      '</ol></div>';
  }

  if ((s.prompts || []).length) {
    h += '<div class="sk-block"><div class="sk-bt">提示词例子<span class="sk-bt-tip">⧉ 复制 · ＋任务 唤起 WorkBuddy</span></div><div class="sk-prompts">' +
      s.prompts.map(function (p) {
        var ep = esc(p);
        return '<div class="sk-prow"><button class="sk-p" data-act="sk-copy" data-p="' + ep + '"><span class="sk-pi">⧉</span><span class="sk-pt">' + ep + '</span></button>' +
          '<button class="btn xs sk-gen" data-act="sk-task" data-id="' + s.id + '" data-p="' + ep + '">＋任务</button></div>';
      }).join('') +
      '</div></div>';
  }

  h += '<div class="sk-foot">' +
    (s.tags || []).map(function (t) { return '<span class="sk-tag' + (t === '疑似重复' ? ' dup' : '') + '">#' + esc(t) + '</span>'; }).join('') +
    '<span class="sk-fsp"></span>' +
    (s.url ? '<button class="btn sm" data-act="open-url" data-url="' + esc(s.url) + '">打开</button>' : '') +
    '<button class="btn sm' + (s.star ? ' on-star' : '') + '" data-act="sk-star" data-id="' + s.id + '">' + (s.star ? '★ 已打标' : '☆ 打标') + '</button>' +
    '<button class="btn sm" data-act="sk-toggle" data-id="' + s.id + '">' + (st === 'off' ? '启用' : '停用') + '</button>' +
    '<button class="btn sm" data-act="skill-edit" data-id="' + s.id + '">编辑</button>' +
    '<button class="btn sm ghost" data-act="skill-del" data-id="' + s.id + '">移除</button>' +
    '</div>';

  h += '</div>';
  return h;
}

/* ---------------- 表单 ---------------- */
function skillForm(s) {
  var isNew = !s;
  var o = s || {
    kind: SKILL_FILTER.kind || 'skill', name: '', label: '', cat: '', origin: '',
    status: 'installed', desc: '', url: '', tags: [], usage: [], prompts: []
  };
  var kind = o.kind || o.type || 'skill';
  var catOpts = (kind === 'connector' ? CONN_CATS : SKILL_CATS).map(function (c) {
    return '<option value="' + c.id + '"' + (o.cat === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>';
  }).join('');
  var body =
    '<div class="f-row"><div class="field"><label>类型</label><select id="sk-ty">' +
      [['skill', '技能'], ['connector', '连接器']].map(function (x) {
        return '<option value="' + x[0] + '"' + (kind === x[0] ? ' selected' : '') + '>' + x[1] + '</option>';
      }).join('') + '</select></div>' +
      '<div class="field"><label>状态</label><select id="sk-st">' +
      [['installed', '已安装'], ['pending', '待安装'], ['connected', '已连接'], ['off', '未启用']].map(function (x) {
        return '<option value="' + x[0] + '"' + (o.status === x[0] ? ' selected' : '') + '>' + x[1] + '</option>';
      }).join('') + '</select></div></div>' +
    '<div class="f-row"><div class="field"><label>中文名<span class="req">*</span></label><input type="text" id="sk-n" value="' + esc(o.label || '') + '" placeholder="例如：公众号爆款写作"></div>' +
      '<div class="field"><label>技能标识</label><input type="text" id="sk-id" value="' + esc(o.name || '') + '" placeholder="例如：gzh-copywriter"></div></div>' +
    '<div class="f-row"><div class="field"><label>分类</label><select id="sk-c">' + catOpts + '</select></div>' +
      '<div class="field"><label>来源</label><select id="sk-o">' +
      [['', '自行登记'], ['self', '我开发的'], ['skillhub', 'SkillHub 安装'], ['builtin', '内置']].map(function (x) {
        return '<option value="' + x[0] + '"' + ((o.origin || '') === x[0] ? ' selected' : '') + '>' + x[1] + '</option>';
      }).join('') + '</select></div></div>' +
    '<div class="f-row"><div class="field"><label>版本（可空）</label><input type="text" id="sk-v" value="' + esc(o.ver || '') + '" placeholder="例如：2.1.0"></div>' +
      '<div class="field"><label>标签（逗号分隔）</label><input type="text" id="sk-tg" value="' + esc((o.tags || []).join(',')) + '"></div></div>' +
    '<div class="field"><label>用途说明</label><textarea id="sk-d" style="min-height:70px">' + esc(o.desc || '') + '</textarea></div>' +
    '<div class="field"><label>基础用法（每行一条）</label><textarea id="sk-u2" style="min-height:70px" placeholder="给一个选题方向或关键词">' + esc((o.usage || []).join('\n')) + '</textarea></div>' +
    '<div class="field"><label>提示词例子（每行一条）</label><textarea id="sk-p2" style="min-height:70px" placeholder="用公众号文案，写一篇关于…">' + esc((o.prompts || []).join('\n')) + '</textarea></div>' +
    '<div class="field"><label>链接（可空）</label><input type="url" id="sk-u" value="' + esc(o.url || '') + '" placeholder="https://..."></div>';

  var wrap = openModal({
    title: isNew ? '新增技能 / 连接器' : '编辑：' + esc(o.label || o.name),
    body: body,
    footer: (isNew ? '' : '<button class="btn danger" data-del="1">移除</button>') +
      '<button class="btn" data-no="1">取消</button><button class="btn pri" data-ok="1">保存</button>'
  });
  function lines(sel) {
    return wrap.querySelector(sel).value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
  }
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
  if (!isNew) wrap.querySelector('[data-del]').onclick = function () {
    closeModal(wrap);
    S.skills = (S.skills || []).filter(function (x) { return x.id !== o.id; });
    commit(); rerender(); toast('已移除');
  };
  wrap.querySelector('[data-ok]').onclick = function () {
    var lbl = wrap.querySelector('#sk-n').value.trim();
    var idt = wrap.querySelector('#sk-id').value.trim();
    if (!lbl && !idt) { toast('中文名与技能标识至少填一个', 'warn'); return; }
    var obj = {
      kind: wrap.querySelector('#sk-ty').value,
      status: wrap.querySelector('#sk-st').value,
      cat: wrap.querySelector('#sk-c').value,
      origin: wrap.querySelector('#sk-o').value,
      label: lbl || idt,
      name: idt || lbl,
      ver: wrap.querySelector('#sk-v').value.trim(),
      tags: wrap.querySelector('#sk-tg').value.split(/[,，]/).map(function (x) { return x.trim(); }).filter(Boolean),
      desc: wrap.querySelector('#sk-d').value.trim(),
      usage: lines('#sk-u2'),
      prompts: lines('#sk-p2'),
      url: wrap.querySelector('#sk-u').value.trim()
    };
    if (isNew) {
      obj.id = uid(); obj.sid = ''; obj.star = false;
      obj.createdAt = nowISO(); obj.updatedAt = nowISO();
      S.skills.push(obj);
      if (commit()) toast('已新增', 'ok');
    } else {
      Object.keys(obj).forEach(function (k) { o[k] = obj[k]; });
      o.userEdited = true;
      o.updatedAt = nowISO();
      if (commit()) toast('已保存（该条目不会再被重新导入覆盖）', 'ok');
    }
    closeModal(wrap); rerender();
  };
}

function toggleSkill(id) {
  var s = (S.skills || []).filter(function (x) { return x.id === id; })[0];
  if (!s) return;
  var st = skillStatusOf(s);
  if (st === 'off') {
    /* 启用：hub 条目没有真实安装背书（installedAt）时回到「待安装」，避免假「已安装」 */
    s.status = (s.sid && s.sid.indexOf('hub-') === 0 && !s.installedAt) ? 'pending' : skillPrimaryStatus(s);
  } else {
    s.statusPrev = st;
    s.status = 'off';
  }
  s.updatedAt = nowISO();
  commit(); rerender();
  toast((s.label || s.name) + '：' + (SK_STATUS[skillStatusOf(s)] || {}).t, 'ok');
}

function starSkill(id) {
  var s = (S.skills || []).filter(function (x) { return x.id === id; })[0];
  if (!s) return;
  s.star = !s.star;
  s.updatedAt = nowISO();
  commit(); rerender();
  toast(s.star ? '已打标，重新导入时不会被清理' : '已取消打标', 'ok');
}
