/* ============================================================
   85-docs.js —— 文档库：两块结构
   ------------------------------------------------------------
   块 A · IMA 知识库   展示 IMA 的库 / 文件夹 / 文件树，可看、可搜，
                       点文件名即用 imacopilot:// 唤起客户端并定位到该文件
   块 B · Obsidian 仓库 展示仓库目录树 + 知识图谱，两大主目录
                       （IMA知识库 / Obsidian知识库）默认展开并标「主」；
                       树形点文件即用 Obsidian 打开，图谱节点也可点开，
                       图谱节点/边全部来自本地扫描（笔记 [[双链]]）

   数据来源（都是构建期烘焙的快照）：
     src/js/83-ima-data.js ← tools/ima-snapshot.mjs ← tools/ima-raw.json（AI 采集）
     src/js/84-obs-data.js ← tools/obsidian-scan.mjs（本地扫描，全自动）

   硬约束：静态单文件站读不到磁盘、调不了 MCP。
     · 看：读快照（够用）
     · 搜：在快照里过滤
     · 同步：IMA 只能由 AI 采集；Obsidian 靠本地脚本扫描
     页面只做「展示 + 打开 + 组装指令」，真正干活的是 AI 助手。
   ============================================================ */

var DOC_CWD = 'D:\\workBuddy_place';

/* ---------------- 快照数据（缺失时给空壳，保证页面不崩） ---------------- */
var DX_IMA = (typeof IMA_SNAPSHOT !== 'undefined' && IMA_SNAPSHOT) ? IMA_SNAPSHOT : { fetchedAt: '', kbs: [] };
var DX_OBS = (typeof OBS_SNAPSHOT !== 'undefined' && OBS_SNAPSHOT) ? OBS_SNAPSHOT : { scannedAt: '', vault: '', vaultName: '', total: 0, tree: [] };

/* ---------------- 页面状态 ---------------- */
var DX_UI = {
  imaKb: '',          /* 当前查看的 IMA 库 id；'' = 文件最多的那个库 */
  imaQ: '',           /* 块 A 搜索词 */
  imaOpen: {},        /* 块 A 展开的文件夹 */
  imaInit: false,
  obsQ: '',           /* 块 B 搜索词 */
  obsOpen: {},        /* 块 B 展开的目录 */
  obsInit: false,
  obsView: 'tree',    /* 块 B 视图：tree | graph */
  gfHide: {},         /* 图谱筛选：被隐藏的顶层目录类别（key=目录名） */
  gfOnly: false,      /* 图谱筛选：仅显示有连接的节点 */
  gfNotes: false      /* 图谱筛选：只看笔记（隐藏附件 / 原件等非 .md 文件） */
};

/* 仓库主目录 —— 2026-09-14 按磁盘实际结构更新：
   原来的 01_使用案例 / 02_IMA知识库 / 03_本地导入 已被重整为下面两块，
   页面上的「主」角标、默认展开、图谱配色都以此为准。 */
var DX_MAIN_DIRS = [
  ['IMA知识库', '从 IMA 同步过来的资料（含 attachments 原件与同名包装 .md）'],
  ['Obsidian知识库', '自己在 Obsidian 里整理的知识：工作 / 项目 / 学习 / 资源库 / 日记 / 模版']
];

ROUTES['docs'] = {
  title: '文档库',
  desc: '左边看 IMA 有什么、右边看 Obsidian 怎么收纳 —— 可看、可搜、可打开',
  render: renderDocsB
};

/* ============================================================
   工具函数
   ============================================================ */
function dxFileIcon(name, type) {
  var t = String(type || '').toUpperCase();
  var n = String(name || '');
  if (t === 'PDF' || /\.pdf$/i.test(n)) return '📕';
  if (t === 'EXCEL' || t === 'XLS' || t === 'XLSX' || /\.(xlsx?|csv)$/i.test(n)) return '📊';
  if (t === 'MD' || t === 'MARKDOWN' || /\.md$/i.test(n)) return '📝';
  if (t === 'HTML' || /\.html?$/i.test(n)) return '🌐';
  if (t === 'WORD' || t === 'DOC' || t === 'DOCX' || /\.docx?$/i.test(n)) return '📘';
  if (t === 'PPT' || t === 'PPTX' || /\.pptx?$/i.test(n)) return '📙';
  if (/\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(n)) return '🖼';
  if (/\.(canvas)$/i.test(n)) return '🎨';
  if (/\.(base)$/i.test(n)) return '🧮';
  if (/\.(zip|rar|7z)$/i.test(n)) return '🗜';
  return '📄';
}
function dxHit(name, q) { return String(name || '').toLowerCase().indexOf(q) >= 0; }
/* 两类树共用：IMA 用 kind='folder'，Obsidian 扫描器用 kind='dir' */
function dxIsDir(n) { return !!n && (n.kind === 'dir' || n.kind === 'folder'); }
/* attachments / 99_Attachments：默认折叠 + 标灰 */
function dxIsAttachFolder(n) {
  if (!dxIsDir(n)) return false;
  var nm = String(n.name || '').toLowerCase();
  return nm === 'attachments' || nm === '99_attachments';
}
/* 按搜索词剪枝：目录名命中 → 保留整棵；否则保留有命中的子树 */
function dxPrune(nodes, q) {
  if (!q) return nodes || [];
  var out = [];
  (nodes || []).forEach(function (n) {
    if (!dxIsDir(n)) { if (dxHit(n.name, q)) out.push(n); return; }
    if (dxHit(n.name, q)) { out.push(n); return; }
    var kids = dxPrune(n.children, q);
    if (!kids.length) return;
    var c = { name: n.name, count: n.count, updated: n.updated, mtime: n.mtime, children: kids };
    if (n.kind === 'folder') { c.kind = 'folder'; c.id = n.id; }
    else { c.kind = 'dir'; c.path = n.path; }
    out.push(c);
  });
  return out;
}
function dxImaKbList() { return (DX_IMA.kbs || []); }
function dxImaKb() {
  var list = dxImaKbList();
  if (!list.length) return null;
  /* 默认选文件最多的那个库（内容更丰富，一眼能看到结构） */
  if (!DX_UI.imaKb) {
    var best = list[0];
    list.forEach(function (k) { if ((k.files || 0) > (best.files || 0)) best = k; });
    return best;
  }
  var hit = null;
  list.forEach(function (k) { if (k.id === DX_UI.imaKb) hit = k; });
  return hit || list[0];
}
/* 在全库树里按 id 找节点，返回 {node, kb, path} */
function dxImaFind(id) {
  var res = null;
  (dxImaKbList() || []).forEach(function (kb) {
    (function walk(nodes, path) {
      (nodes || []).forEach(function (n) {
        if (n.id === id) { res = { node: n, kb: kb, path: path }; return; }
        if (n.kind === 'folder') walk(n.children, path.concat([n.name]));
      });
    })(kb.tree, []);
  });
  return res;
}
function dxObsFind(p) {
  var res = null;
  (function walk(nodes, path) {
    (nodes || []).forEach(function (n) {
      if (n.path === p) { res = { node: n, path: path }; return; }
      if (n.kind === 'dir') walk(n.children, path.concat([n.name]));
    });
  })(DX_OBS.tree || [], []);
  return res;
}
function dxSizeText(b) {
  var n = parseInt(b, 10) || 0;
  if (n <= 0) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}
/* 快照新鲜度：>30 天提示 */
function dxAgeDays(stamp) {
  if (!stamp) return -1;
  var m = String(stamp).match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return -1;
  var t = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime();
  return Math.floor((Date.now() - t) / 86400000);
}

/* ============================================================
   块 A · IMA 知识库（纯展示 + 在 IMA 打开）
   ============================================================ */
function dxImaHTML() {
  if (!DX_UI.imaInit) {
    DX_UI.imaInit = true;
    /* IMA 层级浅（最多 2-3 层），默认全展开，一屏看到底；但 attachments 不自动展开 */
    (function walk(ns) {
      (ns || []).forEach(function (n) {
        if (n.kind === 'folder') {
          if (!dxIsAttachFolder(n)) DX_UI.imaOpen[n.id] = true;
          walk(n.children);
        }
      });
    })(dxImaKbList().reduce(function (acc, k) { return acc.concat(k.tree || []); }, []));
  }
  var q = (DX_UI.imaQ || '').trim().toLowerCase();
  var kb = dxImaKb();
  var h = '';

  h += '<div class="blk blk-ima">';
  h += '<div class="blk-hd">' +
    '<span class="blk-ic">📚</span>' +
    '<div class="blk-tt"><b>IMA 知识库</b><i>碎片收集 · 快速问答 —— 看结构与文件名，点文件即在 IMA 客户端里打开</i></div>' +
    '<div class="blk-acts">' +
      '<button class="btn sm" data-act="dx-ima-open-kb" title="用 IMA 客户端打开当前这个知识库">↗ 在 IMA 打开库</button>' +
    '</div></div>';

  var age = dxAgeDays(DX_IMA.fetchedAt);
  var totalFiles = 0, totalFolders = 0;
  dxImaKbList().forEach(function (k) { totalFiles += k.files || 0; totalFolders += k.folders || 0; });
  h += '<div class="blk-note' + (age > 30 ? ' warn' : '') + '">' +
    '快照 <b>' + esc(DX_IMA.fetchedAt || '未采集') + '</b> · ' + dxImaKbList().length + ' 个库 · ' +
    totalFiles + ' 个文件 · ' + totalFolders + ' 个文件夹' +
    (age > 30 ? '　⚠️ 已 ' + age + ' 天没同步，数据可能过时，让 AI 采集一次即可' : '') +
    '</div>';

  if (!dxImaKbList().length) {
    h += '<div class="tip" style="margin-top:10px">还没有 IMA 快照数据。让 AI 采集一次即可（说一句「同步 IMA 快照」）。</div></div>';
    return h;
  }

  /* 库切换 */
  h += '<div class="tabs">' + dxImaKbList().map(function (k) {
    var on = kb && k.id === kb.id;
    return '<button class="tab' + (on ? ' on' : '') + '" data-act="dx-ima-kb" data-v="' + esc(k.id) + '">' +
      '📚 ' + esc(k.name) + '<span class="n">' + (k.files || 0) + ' 文件' + (k.folders ? ' · ' + k.folders + ' 夹' : '') + '</span></button>';
  }).join('') + '</div>';

  /* 搜索 */
  var tree = kb ? dxPrune(kb.tree, q) : [];
  var cnt = 0;
  (function count(ns) { (ns || []).forEach(function (n) { if (n.kind === 'folder') count(n.children); else cnt += 1; }); })(tree);

  h += '<div class="tree-tools">' +
    '<input type="text" id="dx-ima-q" placeholder="🔍 搜索文件名 / 文件夹名（如 表结构、FDE、白皮书）" value="' + esc(DX_UI.imaQ) + '">' +
    (q ? '<span class="tt-cnt">命中 <b>' + cnt + '</b> 个文件' + (q ? ' · <a data-act="dx-ima-clr">清空</a>' : '') + '</span>' : '') +
    '</div>';

  if (!tree.length) {
    h += '<div class="tip" style="margin-top:10px">' + (q ? '没有匹配「' + esc(DX_UI.imaQ) + '」的文件或文件夹。' : '这个库是空的。') + '</div>';
  } else {
    h += '<div class="tree">' + dxImaTree(tree, 0, !!q, false) + '</div>';
  }
  h += '</div>';
  return h;
}

function dxImaTree(nodes, depth, forceOpen, inAttach) {
  return (nodes || []).map(function (n) {
    if (n.kind === 'folder') {
      var isAttach = dxIsAttachFolder(n);
      var open = forceOpen || DX_UI.imaOpen[n.id];
      var kids = open ? dxImaTree(n.children, depth + 1, forceOpen, inAttach || isAttach) : '';
      return '<div class="tn tn-dir' + (isAttach ? ' dx-attach' : '') + '" data-act="dx-ima-folder" data-id="' + esc(n.id) + '">' +
        '<span class="tn-ar">' + (kids ? '▾' : '▸') + '</span>' +
        '<span class="tn-nm">' + (isAttach ? '📎' : '📁') + ' ' + esc(n.name) + (isAttach ? ' <span class="tn-tag">附件</span>' : '') + '</span>' +
        '<span class="tn-meta">' + (n.count ? n.count + ' 项' : '空') + (n.updated ? ' · ' + esc(n.updated) : '') + '</span>' +
        '</div>' + (kids ? '<div class="tree-child">' + kids + '</div>' : '');
    }
    /* 文件行：点整行 → 唤起 IMA 客户端打开该文件；行内 👁 → 查看详情 */
    return '<div class="tn k-file' + (inAttach ? ' dx-attach-f' : '') + ' dx-ima-open" data-act="dx-ima-file" data-id="' + esc(n.id) + '" title="点整行用 IMA 客户端打开「' + esc(n.name) + '」（浏览器若询问是否打开，请点允许）">' +
      '<span class="tn-ar"></span>' +
      '<span class="tn-nm">' + dxFileIcon(n.name, n.type) + ' ' + esc(n.name) + '</span>' +
      '<span class="tn-tag">' + esc(n.type || '文件') + '</span>' +
      '<span class="tn-acts">' +
        '<button class="btn xs" data-act="dx-ima-view" data-id="' + esc(n.id) + '" title="查看详情">👁</button>' +
      '</span>' +
      '</div>';
  }).join('');
}

/* IMA 文件详情（查看用途，不再做读 / 搬运） */
function dxImaFileDialog(id) {
  var hit = dxImaFind(id);
  if (!hit) return;
  var n = hit.node, kb = hit.kb;
  var where = [kb.name].concat(hit.path).join(' / ');
  var wrap = openModal({
    title: (dxFileIcon(n.name, n.type)) + ' ' + n.name,
    body:
      '<div class="frow2">' +
        '<div><span class="f-lb">类型</span><b>' + esc(n.type || '文件') + '</b></div>' +
        '<div><span class="f-lb">大小</span><b>' + esc(n.sizeText || '—') + '</b></div>' +
        '<div><span class="f-lb">更新时间</span><b>' + esc(n.updated || '—') + '</b></div>' +
        '<div><span class="f-lb">能否取正文</span><b>' + (n.fetchable ? '能' : '不能') + '</b></div>' +
      '</div>' +
      '<div class="field" style="margin-top:12px"><label>在 IMA 里的位置</label>' +
        '<div class="dx-path">' + esc(where) + '</div></div>' +
      (n.intro ? '<div class="field"><label>摘要（IMA 解析出的前段）</label><div class="dx-intro">' + esc(n.intro) + '</div></div>' : '') +
      '<div class="tip">页面是静态站，看不到全文。点下方「🖥 客户端打开」唤起本机 IMA 客户端并定位到这个文件（浏览器若询问是否打开，请点「允许」）。</div>',
    footer: '<button class="btn" data-no="1">关闭</button>' +
      '<button class="btn pri" data-client="1">🖥 客户端打开</button>'
  });
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
  wrap.querySelector('[data-client]').onclick = function () { closeModal(wrap); dxImaOpenClient(hit); };
}

/* —— IMA 打开 ——
   全部取自 IMA 网页前端 bundle（2026-09-14 取证）：
   ① 客户端注册的协议是 `imacopilot://`，**不是 `ima://`**
      （注册表实证 HKCR\imacopilot → "D:\ima\ima.copilot\ima.copilot.exe" "%1"；HKCR\ima 不存在）。
   ② 客户端唤端格式（源码 rE.shareKnowledgeBase 原样）：
        imacopilot://open?opentab=<enc(inner)>&launchChannel=<ch>&opentabV2=<enc(inner)>
      inner = chrome-extension://nkohmbngmopdajidckglcoehlaeepeoi/index.html
              ?knowledgeBaseId=…&action=autoOpenMedia&mediaId=…&launchChannel=…
      （inner 来自 nJ()；`nkohmbngmopdajidckglcoehlaeepeoi` = 客户端 G1.KnowledgeBase 扩展 id；
        action 取值来自枚举 pu.AutoOpenMedia='autoOpenMedia'，**不是** openDetailDrawer——
        此前用 url=<网页地址> 只能落到库列表，就是因为客户端不认网页那套 action。）
   ③ 客户端 PCLaunchService.ult() 解析时 **优先取 url、其次 opentab**，
      所以客户端链接里绝不能同时带 url（带了就被解析成网页地址，又回到库列表）。
   ④ 只带 knowledgeBaseId 即「打开库」，再加 action+mediaId 即「打开库里这一篇」。 */
var DX_IMA_EXT = 'chrome-extension://nkohmbngmopdajidckglcoehlaeepeoi/index.html';
var DX_IMA_CH = '10000074';
/* 客户端内部页面地址；withMedia=true 时定位到具体文件 */
function dxImaInnerUrl(hit, withMedia) {
  var kbId = (hit && hit.kb && hit.kb.id) || '';
  var mid = (hit && hit.node && hit.node.id) || '';
  var qs = 'knowledgeBaseId=' + encodeURIComponent(kbId);
  if (withMedia && mid) qs += '&action=autoOpenMedia&mediaId=' + encodeURIComponent(mid);
  qs += '&launchChannel=' + encodeURIComponent(DX_IMA_CH);
  return DX_IMA_EXT + '?' + qs;
}
function dxImaClientUrl(hit, withMedia) {
  var inner = dxImaInnerUrl(hit, withMedia !== false);
  return 'imacopilot://open?opentab=' + encodeURIComponent(inner) +
    '&launchChannel=' + encodeURIComponent(DX_IMA_CH) +
    '&opentabV2=' + encodeURIComponent(inner);
}
/* 整行点击 / 详情「🖥 客户端打开」：唤起 IMA 桌面客户端并定位到该文件 */
function dxImaOpen(hit) {
  if (!hit) { toast('没找到这个文件', 'warn'); return; }
  handleOpenUrl(dxImaClientUrl(hit, true));
  toast('正在唤起 IMA 客户端打开「' + hit.node.name + '」…若浏览器弹窗询问，请点「允许」', 'ok', 5500);
}
function dxImaOpenClient(hit) { dxImaOpen(hit); }
function dxImaOpenKb() {
  var kb = dxImaKb();
  var faux = { kb: kb, node: null };
  handleOpenUrl(dxImaClientUrl(faux, false));
  toast('正在唤起 IMA 客户端打开知识库：' + (kb ? kb.name : ''), 'ok', 5000);
}

/* ============================================================
   块 B · Obsidian 仓库（树 / 图谱 双视图）
   ============================================================ */
function dxObsHTML() {
  if (!DX_UI.obsInit) {
    DX_UI.obsInit = true;
    /* 默认展开三大内容目录 */
    DX_MAIN_DIRS.forEach(function (d) { DX_UI.obsOpen[d[0]] = true; });
  }
  var q = (DX_UI.obsQ || '').trim().toLowerCase();
  var h = '';
  var age = dxAgeDays(DX_OBS.scannedAt);

  h += '<div class="blk blk-obs">';
  h += '<div class="blk-hd">' +
    '<span class="blk-ic">🧱</span>' +
    '<div class="blk-tt"><b>Obsidian 仓库</b><i>' + esc(DX_OBS.vaultName || '未配置') + ' —— 目录与文件树，点文件直接用 Obsidian 打开</i></div>' +
    '<div class="blk-acts">' +
      '<button class="btn sm" data-act="dx-sync" data-v="obs" title="重新扫描或重载快照">↻ 扫描</button>' +
      '<button class="btn sm" data-act="obs-open" data-v="" title="用 Obsidian 打开这个仓库">↗ 打开仓库</button>' +
      '<button class="btn sm" data-act="obs-new" title="在 Obsidian 里新建一篇笔记">📝 新建笔记</button>' +
    '</div></div>';

  h += '<div class="blk-note' + (age > 30 ? ' warn' : '') + '">' +
    '扫描于 <b>' + esc(DX_OBS.scannedAt || '未扫描') + '</b> · 共 ' + (DX_OBS.total || 0) + ' 个文件' +
    (DX_OBS.vault ? ' · <span class="dx-path-inline">' + esc(DX_OBS.vault) + '</span>' : '') +
    (age > 30 ? '　⚠️ 已 ' + age + ' 天没扫描，数据可能过时' : '') +
    '</div>';

  /* 三大块说明 */
  h += '<div class="dx-maindirs">' + DX_MAIN_DIRS.map(function (d) {
    return '<div class="dx-md"><b>' + esc(d[0]) + '</b><i>' + esc(d[1]) + '</i></div>';
  }).join('') + '</div>';

  /* 视图切换：目录树 / 知识图谱 */
  h += '<div class="obs-view-tabs">' +
    '<button class="vtab' + (DX_UI.obsView !== 'graph' ? ' on' : '') + '" data-act="dx-obs-view" data-v="tree">🌲 目录树</button>' +
    '<button class="vtab' + (DX_UI.obsView === 'graph' ? ' on' : '') + '" data-act="dx-obs-view" data-v="graph">🕸 知识图谱</button>' +
    '</div>';

  var tree = dxPrune(DX_OBS.tree, q);
  var fileCnt = 0;
  (function count(ns) { (ns || []).forEach(function (n) { if (n.kind === 'dir') count(n.children); else fileCnt += 1; }); })(tree);

  h += '<div class="tree-tools">' +
    '<input type="text" id="dx-obs-q" placeholder="🔍 搜索目录 / 文件名 / 图谱节点" value="' + esc(DX_UI.obsQ) + '">' +
    (q ? '<span class="tt-cnt">命中 <b>' + fileCnt + '</b> 个文件 · <a data-act="dx-obs-clr">清空</a></span>' : '') +
    '</div>';

  if (DX_UI.obsView === 'graph') {
    h += dxObsGraph();
  } else if (!DX_OBS.tree || !DX_OBS.tree.length) {
    h += '<div class="tip" style="margin-top:10px">还没扫描到内容。点「↻ 扫描」重新扫描本地仓库。</div>';
  } else if (!tree.length) {
    h += '<div class="tip" style="margin-top:10px">没有匹配「' + esc(DX_UI.obsQ) + '」的目录或文件。</div>';
  } else {
    h += '<div class="tree">' + dxObsTree(tree, !!q, false) + '</div>';
  }
  h += '</div>';
  return h;
}

function dxObsTree(nodes, forceOpen, inAttach) {
  return (nodes || []).map(function (n) {
    if (n.kind === 'dir') {
      var isAttach = dxIsAttachFolder(n);
      var open = forceOpen || DX_UI.obsOpen[n.path];
      var kids = open ? dxObsTree(n.children, forceOpen, inAttach || isAttach) : '';
      var isMain = DX_MAIN_DIRS.some(function (d) { return d[0] === n.name; });
      var mt = n.mtime ? String(n.mtime).slice(0, 10) : '';
      return '<div class="tn tn-dir' + (isMain ? ' dx-mdir' : '') + (isAttach ? ' dx-attach' : '') + '" data-act="dx-obs-dir" data-v="' + esc(n.path) + '">' +
        '<span class="tn-ar">' + (kids ? '▾' : '▸') + '</span>' +
        '<span class="tn-nm">' + (isAttach ? '📎' : '📁') + ' ' + esc(n.name) + (isMain ? ' <span class="tn-star">主</span>' : '') + (isAttach ? ' <span class="tn-tag">附件</span>' : '') + '</span>' +
        '<span class="tn-meta">' + (n.count ? n.count + ' 篇' : '空') + (mt ? ' · ' + esc(mt) : '') + '</span>' +
        '</div>' + (kids ? '<div class="tree-child">' + kids + '</div>' : '');
    }
    return '<div class="tn k-file' + (inAttach ? ' dx-attach-f' : '') + '" data-act="dx-obs-file" data-v="' + esc(n.path) + '">' +
      '<span class="tn-ar"></span>' +
      '<span class="tn-nm">' + dxFileIcon(n.name, n.ext) + ' ' + esc(n.name) + '</span>' +
      '<span class="tn-tag">' + esc(n.ext || 'file') + '</span>' +
      '<span class="tn-meta">' + esc(dxSizeText(n.size)) + (n.mtime ? ' · ' + esc(n.mtime) : '') + '</span>' +
      '<span class="tn-acts">' +
        '<button class="btn xs" data-act="dx-obs-ai" data-v="' + esc(n.path) + '" title="让 AI 基于这篇做事">🤖</button>' +
        '<button class="btn xs" data-act="dx-obs-copy" data-v="' + esc(n.path) + '" title="复制仓库内相对路径">📋</button>' +
        '<button class="btn xs pri" data-act="obs-open" data-v="' + esc(n.path) + '" title="用 Obsidian 打开">↗</button>' +
      '</span>' +
      '</div>';
  }).join('');
}

/* ---------------- 知识图谱 ----------------
   配色不再写死目录名：分类从快照里真实存在的顶层目录动态生成，
   认识的名字用固定色，其余按调色板顺序分配 —— 仓库结构再变也不用改代码。 */
var DX_GRAPH_KNOWN = {
  'IMA知识库': '#22c1c3',
  'Obsidian知识库': '#8b5cf6',
  '（根目录）': '#f59e0b'
};
var DX_GRAPH_PALETTE = ['#8b5cf6', '#22c1c3', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#10b981', '#a855f7'];
var DX_GRAPH_DEFAULT = '#9ca3af';
var DX_GRAPH_CATS = null;
/* 顶层分类列表（按节点数降序），每项 {name,color,count} */
function dxGraphCats() {
  if (DX_GRAPH_CATS) return DX_GRAPH_CATS;
  var cnt = {};
  (((DX_OBS && DX_OBS.graph) || {}).nodes || []).forEach(function (n) {
    var d = n.dir || '（根目录）';
    cnt[d] = (cnt[d] || 0) + 1;
  });
  var names = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; });
  var pi = 0;
  DX_GRAPH_CATS = names.map(function (k) {
    var c = DX_GRAPH_KNOWN[k] || DX_GRAPH_PALETTE[(pi++) % DX_GRAPH_PALETTE.length];
    return { name: k, color: c, count: cnt[k] };
  });
  return DX_GRAPH_CATS;
}
function dxGraphColor(p) {
  var s = String(p || '');
  var top = s.indexOf('/') >= 0 ? s.split('/')[0] : '（根目录）';
  var cats = dxGraphCats();
  for (var i = 0; i < cats.length; i++) { if (cats[i].name === top) return cats[i].color; }
  return DX_GRAPH_DEFAULT;
}
/* 取图谱数据：优先用扫描产出的 graph，否则现场从 tree+links 算；再按筛选裁剪 */
function dxObsGraphData() {
  var snap = DX_OBS.graph;
  var all = [];
  if (snap && snap.nodes && snap.nodes.length) {
    all = snap.nodes.map(function (n) {
      return {
        path: n.path, name: n.name,
        dir: n.dir || (n.path.indexOf('/') >= 0 ? n.path.split('/')[0] : '（根目录）'),
        note: n.note !== false,
        color: dxGraphColor(n.path)
      };
    });
  } else {
    (function walk(ns) { (ns || []).forEach(function (n) {
      if (n.kind === 'dir') walk(n.children);
      else {
        all.push({
          path: n.path, name: n.name,
          dir: n.path.indexOf('/') >= 0 ? n.path.split('/')[0] : '（根目录）',
          note: /\.(md|canvas)$/i.test(n.name),
          color: dxGraphColor(n.path)
        });
      }
    }); })(DX_OBS.tree || []);
  }
  var hide = DX_UI.gfHide || {};
  var only = !!DX_UI.gfOnly;
  var notesOnly = !!DX_UI.gfNotes;
  var nodes = all.filter(function (n) { return !hide[n.dir] && (!notesOnly || n.note); });
  var keep = {}; nodes.forEach(function (n) { keep[n.path] = true; });
  var edges = (snap && snap.edges ? snap.edges : []).filter(function (e) { return keep[e[0]] && keep[e[1]]; });
  if (only) {
    var deg = {};
    edges.forEach(function (e) { deg[e[0]] = (deg[e[0]] || 0) + 1; deg[e[1]] = (deg[e[1]] || 0) + 1; });
    nodes = nodes.filter(function (n) { return (deg[n.path] || 0) > 0; });
    keep = {}; nodes.forEach(function (n) { keep[n.path] = true; });
    edges = edges.filter(function (e) { return keep[e[0]] && keep[e[1]]; });
  }
  return { nodes: nodes, edges: edges };
}
function dxGraphLegend() {
  var hide = DX_UI.gfHide || {};
  var only = !!DX_UI.gfOnly;
  var notesOnly = !!DX_UI.gfNotes;
  var cats = dxGraphCats();
  var html = '<div class="g-legend">';
  var allOn = cats.every(function (c) { return !hide[c.name]; });
  html += '<button class="g-chip' + (allOn ? ' on' : '') + '" data-act="dx-graph-cat" data-v="__all">全部</button>';
  cats.forEach(function (c) {
    html += '<button class="g-chip' + (hide[c.name] ? '' : ' on') + '" data-act="dx-graph-cat" data-v="' + esc(c.name) + '" style="--c:' + c.color + '"><i></i>' + esc(c.name) + '<em>' + c.count + '</em></button>';
  });
  html += '<button class="g-chip tog' + (only ? ' on' : '') + '" data-act="dx-graph-only" data-v="1" style="margin-left:6px">仅连接节点</button>';
  html += '<button class="g-chip tog' + (notesOnly ? ' on' : '') + '" data-act="dx-graph-notes" data-v="1">只看笔记</button>';
  html += '</div>';
  return html;
}
function dxObsGraph() {
  var g = dxObsGraphData();
  if (!g.nodes.length) {
    return '<div class="tip" style="margin-top:10px">仓库里还没有可连线的笔记（.md / .canvas）。写几篇带 [[双链]] 的笔记，图谱就会长出来。</div>';
  }
  var h = '';
  h += '<div class="graph-wrap">';
  h += dxGraphLegend();
  h += '<svg class="graph-svg" id="dx-graph" viewBox="0 0 1100 620" preserveAspectRatio="xMidYMid meet"></svg>';
  h += '<div class="tip" style="margin-top:8px">实心大圆 = 笔记（.md/.canvas），小空心圆 = 附件/原件；点节点用 Obsidian 打开，悬停高亮邻接，拖拽调整布局。上方图例可点选分类显隐、勾选「仅连接节点」「只看笔记」。关联取自笔记里的 [[双链]]。</div>';
  h += '</div>';
  return h;
}

/* 图谱布局 + 交互（自实现 Fruchterman-Reingold，无 d3 / CDN，离线可用，同步求解无动画） */
function dxGraphInit(svg) {
  var W = 1100, H = 620;
  var data = dxObsGraphData();
  var Q = (DX_UI.obsQ || '').trim().toLowerCase();
  /* 起始位置用向日葵（黄金角）铺满画布：原来按角度均分到一个椭圆环上，
     节点一多（26 → 63）环上就肩并肩、一开始就贴着，收敛后也难分开 */
  var GA = Math.PI * (3 - Math.sqrt(5));
  var g = data.nodes.map(function (n, i) {
    var t = Math.sqrt((i + 0.5) / Math.max(1, data.nodes.length));
    var a = i * GA;
    return {
      path: n.path, name: n.name, color: n.color, note: n.note !== false, i: i,
      x: W / 2 + Math.cos(a) * t * (W / 2 - 70) + (Math.random() - 0.5) * 12,
      y: H / 2 + Math.sin(a) * t * (H / 2 - 60) + (Math.random() - 0.5) * 12,
      vx: 0, vy: 0
    };
  });
  var idx = {}; g.forEach(function (n) { idx[n.path] = n.i; });
  var adj = {}; g.forEach(function (n) { adj[n.i] = []; });
  var edges = [];
  data.edges.forEach(function (e) {
    var a = idx[e[0]], b = idx[e[1]];
    if (a == null || b == null || a === b) return;
    edges.push([a, b]);
    adj[a].push(b); adj[b].push(a);
  });
  var NS = 'http://www.w3.org/2000/svg';
  var edgeEls = edges.map(function (e) {
    var ln = document.createElementNS(NS, 'line');
    ln.setAttribute('class', 'g-edge');
    svg.appendChild(ln); return ln;
  });
  /* 标签截断：文件全名很长（如「1000指增-1.png-01a0a46785…png」38 字），
     全量铺出来会把画布糊成一片；显示截到 18 字，全名放进 <title> 悬停可看 */
  var LBL_MAX = 18;
  function shortLabel(s) {
    s = String(s || '');
    return s.length > LBL_MAX ? s.slice(0, LBL_MAX - 1) + '…' : s;
  }
  var labelEls = [];
  var nodeEls = g.map(function (n) {
    var grp = document.createElementNS(NS, 'g');
    grp.setAttribute('class', 'g-node' + (n.note ? '' : ' g-file'));
    if (n.path) grp.setAttribute('data-path', n.path);
    var c = document.createElementNS(NS, 'circle');
    if (n.note) {
      /* 笔记：实心大圆 */
      c.setAttribute('r', 8); c.setAttribute('fill', n.color);
    } else {
      /* 附件 / 原件：小空心圆，用分类色描边 */
      c.setAttribute('r', 5); c.setAttribute('fill', '#fff');
      c.setAttribute('stroke', n.color); c.setAttribute('stroke-width', '1.6');
    }
    var ti = document.createElementNS(NS, 'title');
    ti.textContent = n.name;
    var t = document.createElementNS(NS, 'text');
    t.setAttribute('class', 'g-label' + (n.note ? '' : ' g-label-sm'));
    t.setAttribute('y', 4);
    t.textContent = shortLabel(n.name);
    labelEls.push(t);
    grp.appendChild(c); grp.appendChild(ti); grp.appendChild(t); svg.appendChild(grp); return grp;
  });

  /* hover = 当前悬停节点索引（-1 无）。放进 paint 统一处理：动画帧/拖拽都走 paint，
     若只在 mouseenter 里改样式，会被下一帧覆盖掉 */
  var hoverIdx = -1;
  function paint() {
    edgeEls.forEach(function (ln, k) {
      var e = edges[k];
      ln.setAttribute('x1', g[e[0]].x); ln.setAttribute('y1', g[e[0]].y);
      ln.setAttribute('x2', g[e[1]].x); ln.setAttribute('y2', g[e[1]].y);
      var adjEdge = hoverIdx >= 0 && (e[0] === hoverIdx || e[1] === hoverIdx);
      if (adjEdge) {
        /* 关联线：加粗 + 染成悬停节点的分类色，一眼看清连着谁 */
        ln.classList.add('hi');
        ln.style.stroke = g[hoverIdx].color;
        ln.style.opacity = '1';
      } else {
        ln.classList.remove('hi');
        ln.style.stroke = '';
        ln.style.opacity = hoverIdx >= 0 ? '0.09' : '0.75';
      }
    });
    nodeEls.forEach(function (grp, i) {
      grp.setAttribute('transform', 'translate(' + g[i].x + ',' + g[i].y + ')');
      /* 靠右的节点把标签翻到左侧，否则长标签会被画布右边缘切掉 */
      var flip = g[i].x > W - 190;
      labelEls[i].setAttribute('x', (g[i].note ? 13 : 9) * (flip ? -1 : 1));
      labelEls[i].setAttribute('text-anchor', flip ? 'end' : 'start');
    });
    if (hoverIdx >= 0) {
      nodeEls.forEach(function (grp, i) {
        var on = (i === hoverIdx || adj[hoverIdx].indexOf(i) >= 0);
        grp.style.opacity = on ? '1' : '0.2';
        /* 附件标签默认藏着（数量太多会糊屏）；悬停时本体 + 邻接一起放出来 */
        grp.classList.toggle('on', on);
      });
      return;
    }
    if (Q) {
      nodeEls.forEach(function (grp, i) {
        var hit = String(g[i].name).toLowerCase().indexOf(Q) >= 0;
        grp.style.opacity = hit ? '1' : '0.22';
        grp.classList.toggle('on', hit);
      });
      edgeEls.forEach(function (ln, k) {
        var e = edges[k];
        var hit = String(g[e[0]].name).toLowerCase().indexOf(Q) >= 0 || String(g[e[1]].name).toLowerCase().indexOf(Q) >= 0;
        ln.style.opacity = hit ? '0.9' : '0.07';
      });
      return;
    }
    nodeEls.forEach(function (grp) { grp.style.opacity = '1'; grp.classList.remove('on'); });
  }

  var dragNode = null, moved = false, sx = 0, sy = 0;
  /* 布局：Fruchterman-Reingold，**同步求解**（跑 fixed 次迭代后一次绘制，不用 RAF 逐帧动画）。
     为什么换掉原来的「库仑斥力 1/d² + 弹簧 + alpha 退火 + RAF」：
     63 个节点时那套长时间积分不稳定 —— 1s 内看着还好，之后节点成对粘死（实测 3s 后 195 对 <5px、
     最近 0.08px，冻结后也救不回来）。试过的补救全部只会变成另一种坏形态：
     ① 单加大斥力/向心力 → 整团压成一点；② 加硬核斥力 → 节点被甩到墙角重叠；
     ③ 给 1/d² 加距离下限 → 失去扩张力、整团塌到圆心；④ 加快 alpha 退火 → 只是提前停在粘连态。
     FR 用 1/d 斥力 + d²/k 引力，且单步位移由「温度」直接封顶，所以不会发散；
     同步求解还有个好处：布局是确定性的，截图/断言不再受「动画跑到第几帧」影响。 */
  var ITER = Math.min(600, Math.max(260, 9 * g.length));
  /* 理想间距 k。FR 的平衡边长就是 k，取 sqrt(W·H/n) 会让 63 节点的团直径 ~1650 > 画布 1100，
     于是全部节点被压到左右边界贴成两条竖线；乘 0.62 后直径 ~510，装得下且不重叠 */
  var K = Math.sqrt((W * H) / Math.max(1, g.length)) * 0.62;
  var GRAV = 3;
  var TEMP = W / 8;
  var COOL = TEMP / ITER;
  var dxs = new Array(g.length), dys = new Array(g.length);
  function step() {
    var i, j;
    for (i = 0; i < g.length; i++) { dxs[i] = 0; dys[i] = 0; }
    /* 斥力 k²/d（∝1/d，不像 1/d² 那样在近距发散到几万） */
    for (i = 0; i < g.length; i++) {
      for (j = i + 1; j < g.length; j++) {
        var dx = g[j].x - g[i].x, dy = g[j].y - g[i].y;
        var d2 = dx * dx + dy * dy;
        /* 完全重合时 dx/d 无意义（0/0），给个随机方向才能分开 */
        if (d2 < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = dx * dx + dy * dy || 0.01; }
        var d = Math.sqrt(d2);
        var f = K * K / d;
        var ux = dx / d * f, uy = dy / d * f;
        dxs[i] -= ux; dys[i] -= uy;
        dxs[j] += ux; dys[j] += uy;
      }
    }
    /* 引力 d²/k，只作用于有 [[双链]] 的点对 */
    edges.forEach(function (e) {
      var a = g[e[0]], b = g[e[1]];
      var ex = b.x - a.x, ey = b.y - a.y;
      var ed = Math.max(Math.sqrt(ex * ex + ey * ey), 0.01);
      var ef = ed * ed / K;
      var vx2 = ex / ed * ef, vy2 = ey / ed * ef;
      dxs[e[1]] -= vx2; dys[e[1]] -= vy2;
      dxs[e[0]] += vx2; dys[e[0]] += vy2;
    });
    /* 位移封顶 = 温度：整套算法稳定性的关键一步，去掉它就会像上面那样发散。
       另外加一个弱向心：FR 的斥力总和随半径线性增长（≈ 2k²n/R），不收回就会被一路推到
       边界、贴着四边成一个空心环；同时保留边界夹持兜底 */
    for (i = 0; i < g.length; i++) {
      dxs[i] += (W / 2 - g[i].x) * GRAV;
      dys[i] += (H / 2 - g[i].y) * GRAV;
      var len = Math.sqrt(dxs[i] * dxs[i] + dys[i] * dys[i]);
      if (len < 0.01) continue;
      var mv = Math.min(len, TEMP);
      g[i].x += dxs[i] / len * mv;
      g[i].y += dys[i] / len * mv;
      g[i].x = Math.max(30, Math.min(W - 30, g[i].x));
      g[i].y = Math.max(26, Math.min(H - 26, g[i].y));
    }
    TEMP -= COOL;
  }
  for (var it = 0; it < ITER; it++) step();
  paint();

  nodeEls.forEach(function (grp, i) {
    var n = g[i];
    grp.style.cursor = 'pointer';
    grp.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      dragNode = n; moved = false; sx = ev.clientX; sy = ev.clientY;
      try { grp.setPointerCapture(ev.pointerId); } catch (e) {}
    });
    grp.addEventListener('pointermove', function (ev) {
      if (dragNode !== n) return;
      if (Math.abs(ev.clientX - sx) > 4 || Math.abs(ev.clientY - sy) > 4) moved = true;
      if (moved) {
        var pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
        var loc = pt.matrixTransform(svg.getScreenCTM().inverse());
        n.x = loc.x; n.y = loc.y; paint();
      }
    });
    grp.addEventListener('pointerup', function () {
      if (dragNode === n && !moved) {
        obsLaunch(obsOpenUrl(String(n.path || '')), '已用 Obsidian 打开：' + n.name);
      }
      dragNode = null;
    });
    grp.addEventListener('mouseenter', function () { hoverIdx = i; paint(); });
    grp.addEventListener('mouseleave', function () { if (hoverIdx === i) hoverIdx = -1; paint(); });
  });
}

/* Obsidian 文件：让 AI 基于它做事 */
var DX_OBS_GOALS = [
  ['explain', '讲解这篇', '用中文讲清这篇在说什么：核心观点、关键信息、能拿来干什么。'],
  ['case', '提炼成使用案例', '把它提炼成一条「具体场景 + 怎么做 + 踩过的坑」的使用案例笔记，写回 Obsidian知识库 对应子目录。'],
  ['link', '找关联 / 出图谱', '找出它和仓库里其它笔记的关联，给出双链建议；必要时更新 MOC 索引页。'],
  ['polish', '润色 / 改写', '按目标读者润色语言，保持原意，公众号 / 小红书等平台风格。'],
  ['digest', '沉淀为原子笔记', '提炼为可长期复用的原子笔记：一句话结论、要点、可引用片段、关联主题与双链。']
];
function dxObsAiDialog(p, goalKey) {
  var hit = dxObsFind(p);
  var node = hit ? hit.node : { name: p, path: p };
  var state = { goal: goalKey || (node.ext === 'pdf' ? 'explain' : 'case') };
  var wrap = openModal({
    title: '🤖 基于这篇做事',
    body:
      '<div class="tip" style="margin-bottom:10px"><b>' + esc(node.name) + '</b><br>路径：' + esc(p) + '</div>' +
      '<div class="field"><label>想让 AI 做什么</label><div class="chips" id="oa-goals">' +
        DX_OBS_GOALS.map(function (g) {
          return '<button class="chip ' + (state.goal === g[0] ? 'on' : '') + '" data-g="' + g[0] + '">' + g[1] + '</button>';
        }).join('') +
      '</div></div>' +
      '<div class="field"><label>补充要求（可留空）</label><textarea id="oa-x" style="min-height:56px" placeholder="如：面向新手；控制在 800 字；重点讲清踩坑"></textarea></div>' +
      '<div class="tip">会唤起 WorkBuddy 任务，由 AI 真去读这个文件。页面读不到磁盘。</div>',
    footer: '<button class="btn" data-copy="1">⧉ 复制指令</button><button class="btn" data-no="1">取消</button>' +
      '<button class="btn pri" data-go="1">发起任务</button>'
  });
  wrap.querySelectorAll('#oa-goals [data-g]').forEach(function (b) {
    b.onclick = function () {
      state.goal = b.getAttribute('data-g');
      wrap.querySelectorAll('#oa-goals [data-g]').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
    };
  });
  function collect() {
    var g = DX_OBS_GOALS.filter(function (x) { return x[0] === state.goal; })[0] || DX_OBS_GOALS[0];
    var extra = (wrap.querySelector('#oa-x').value || '').trim();
    var L = [];
    L.push('【文档库 · Obsidian · ' + g[1] + '】' + node.name);
    L.push('');
    L.push('▍要读的文件');
    L.push('本地 Obsidian 仓库：' + (DX_OBS.vault || obsVaultPath() || '（未配置）'));
    L.push('文件：' + p);
    L.push('');
    L.push('▍目标');
    L.push(g[2]);
    if (extra) { L.push(''); L.push('▍补充要求'); L.push(extra); }
    L.push('');
    L.push('▍要求');
    L.push('1. 先真的读这个文件，再动手；引用内容标出来源');
    L.push('2. 结果写成本地文件，并把路径回填到工作台文档库索引');
    L.push('3. 若改动了仓库内容，最后跑 `node tools/obsidian-scan.mjs` 再 `node build.mjs`');
    return L.join('\n');
  }
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
  wrap.querySelector('[data-copy]').onclick = function () {
    copyText(collect()).then(function (ok) { toast(ok ? '指令已复制' : '复制失败', ok ? 'ok' : 'warn'); });
  };
  wrap.querySelector('[data-go]').onclick = function () {
    var p2 = collect(); closeModal(wrap);
    invokeWorkbuddy(docTaskUrl(p2));
    toast('已发起任务：AI 将读取该文件并处理', 'ok', 4500);
  };
}

/* ============================================================
   同步 / 扫描（仅 Obsidian 侧；IMA 侧无页面入口，按需让我采集）
   ============================================================ */
function dxObsScanPrompt() {
  var L = [];
  L.push('【文档库 · 重新扫描 Obsidian 仓库】');
  L.push('');
  L.push('▍目标');
  L.push('扫描本地 Obsidian 仓库的最新目录与文件，刷新工作台文档库的快照。');
  L.push('');
  L.push('▍步骤');
  L.push('1. 运行 `node tools/obsidian-scan.mjs`（默认扫 ' + (DX_OBS.vault || 'D:/workBuddy_place/Obsidian_Place') + '）');
  L.push('2. 运行 `node build.mjs`');
  L.push('3. 回报：文件总数、顶层目录（' + ((DX_MAIN_DIRS || []).map(function (d) { return d[0]; }).join(' / ') || 'IMA知识库 / Obsidian知识库') + '）各多少篇、有无新增目录、知识图谱节点与边数');
  return L.join('\n');
}
function dxSyncDialog(kind) {
  var wrap = openModal({
    title: '↻ 重新扫描 Obsidian 仓库',
    body:
      '<div class="tip" style="margin-bottom:10px">Obsidian 仓库在本地磁盘上，<b>页面读不到</b>。有两种扫描方式：</div>' +
      '<div class="opt" data-o="1">' +
        '<div class="opt-h">① 重载内置快照<em>立即生效，不联网</em></div>' +
        '<div class="opt-d">把当前构建进页面的快照重新渲染一遍。当前快照：<b>' + esc(DX_OBS.scannedAt || '无') + '</b></div>' +
      '</div>' +
      '<div class="opt" data-o="2">' +
        '<div class="opt-h">② 发起 AI 扫描任务<em>真正刷新数据</em></div>' +
        '<div class="opt-d">由 AI 运行 `node tools/obsidian-scan.mjs` → 重建页面。</div>' +
      '</div>' +
      '<div class="tip">本地也可以直接双击 <b>tools/sync-skills.cmd</b>，它会把技能库、WB案例、Obsidian 快照一起刷新并重建。</div>',
    footer: '<button class="btn" data-no="1">关闭</button>'
  });
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
  wrap.querySelectorAll('.opt').forEach(function (o) {
    o.onclick = function () {
      var which = o.getAttribute('data-o');
      closeModal(wrap);
      if (which === '1') {
        rerender();
        toast('已重载内置快照（' + (DX_OBS.scannedAt || '无') + '）', 'ok', 4000);
      } else {
        invokeWorkbuddy(docTaskUrl(dxObsScanPrompt()));
        toast('已发起任务：AI 将重新扫描仓库并重建页面', 'ok', 5000);
      }
    };
  });
}

/* ============================================================
   知识库管理 / 设置路径（收在底部）
   ============================================================ */
function kbList() { return (S.kbs || []); }
function kbById(id) { return kbList().filter(function (k) { return k.id === id; })[0]; }
function kbTypeName(t) {
  return t === 'ima' ? 'IMA' : t === 'obsidian' ? 'Obsidian' : t === 'library' ? '资料库' : '本地';
}
function kbIcon(t) {
  return t === 'ima' ? '📚' : t === 'obsidian' ? '🧱' : t === 'library' ? '🗂️' : '📁';
}
function kbTarget(kb) {
  if (!kb) return '';
  if (kb.type === 'obsidian') return kb.ref || (S.settings && S.settings.obsidianPath) || '';
  return kb.ref || '';
}
function imaKbs() { return kbList().filter(function (k) { return k.type === 'ima'; }); }
function obsKbs() { return kbList().filter(function (k) { return k.type === 'obsidian'; }); }

function obsVaultPath() {
  var kb = obsKbs()[0];
  return (S.settings && S.settings.obsidianPath) || (kb && kb.ref) || (DX_OBS.vault || '');
}
function obsVaultName() {
  return String(obsVaultPath() || '').replace(/[\\/]+$/, '').split(/[\\/]/).pop() || '';
}
/* ⚠️ 绝对不要剥掉 file 参数的扩展名（尤其是 `.md`）—— 2026-09-14 在 obsidian.asar 里实证：
   Obsidian 处理 obsidian://open?file=X 的流程（register("open")，asar 偏移 ~3,553,5xx）：
     ① Al(X) 取 X 的 **basename**，在 uniqueFileLookup（按 file.name.toLowerCase() 建的索引，
        文件名**带扩展名**）里查得候选；
     ② 再用候选的**完整路径** endsWith(X) 过滤，路径对不上就丢弃；
     ③ 若 ① 命中为空则补 ".md" 再查一次；都没有 → 弹「找不到文件」。
   所以对 `IMA知识库/…/Datawhale FDE案例100.pdf.md`：
     - 传完整路径（含 .md）→ basename `datawhale fde案例100.pdf.md` → ① 直接命中该笔记本身 → 成功。
     - 若剥成 `…/Datawhale FDE案例100.pdf` → basename 变成 `datawhale fde案例100.pdf`
       → **正好撞上 attachments/ 里的同名 PDF 原件**，候选只剩原件 → ② 目录后缀不匹配 → 失败。
   结论：file= 一律传「仓库内完整相对路径 + 原扩展名」。 */
function obsOpenUrl(file) {
  var v = obsVaultName();
  if (!v) return '';
  var u = 'obsidian://open?vault=' + encodeURIComponent(v);
  if (file) u += '&file=' + encodeURIComponent(file);
  return u;
}
function obsNewUrl(name, content) {
  var v = obsVaultName();
  if (!v) return '';
  var u = 'obsidian://new?vault=' + encodeURIComponent(v);
  if (name) u += '&file=' + encodeURIComponent(name);
  if (content) u += '&content=' + encodeURIComponent(content);
  return u;
}
function obsLaunch(url, okMsg) {
  if (!url) { toast('还没配置 Obsidian 仓库路径，点底部「⚙ 知识库管理」补上', 'warn'); return; }
  invokeWorkbuddy(url);
  toast(okMsg + ' · 若无反应请先手动打开一次 Obsidian', 'ok', 4000);
}
function kbOpen(kb) {
  if (!kb) return;
  if (kb.type === 'obsidian') {
    var u = obsOpenUrl('');
    if (!u) { toast('还没配置 Obsidian 仓库路径，点底部「⚙ 知识库管理」补上', 'warn'); return; }
    invokeWorkbuddy(u);
    toast('已唤起 Obsidian（仓库：' + obsVaultName() + '）', 'ok', 3500);
    return;
  }
  var t = kbTarget(kb);
  if (!t) { toast('这个知识库还没填地址 / 路径，点「⚙ 知识库管理」补上', 'warn'); return; }
  handleOpenUrl(t);
}

function kbManageDialog() {
  var wrap = openModal({
    title: '知识库管理',
    body: '<div id="kb-list"></div>' +
      '<div class="tip" style="margin-top:10px">IMA 库填 ima.qq.com 链接或库 ID；Obsidian 填本地库路径（如 D:\\workBuddy_place\\Obsidian_Place）。' +
      '<br>说明：页面是静态站，读不到磁盘、也调不了知识库。这里只做「绑定 + 一键打开」，真正去检索 / 搬运的是 AI 助手。</div>',
    footer: '<button class="btn" data-no="1">关闭</button><button class="btn pri" data-add="1">＋ 新增知识库</button>'
  });
  function paint() {
    var box = wrap.querySelector('#kb-list');
    var list = kbList();
    box.innerHTML = list.length ? list.map(function (kb) {
      return '<div class="kb-row">' +
        '<span class="kb-ic">' + kbIcon(kb.type) + '</span>' +
        '<span class="kb-b"><b>' + esc(kb.name) + '</b>' +
          '<i>' + kbTypeName(kb.type) + (kbTarget(kb) ? ' · ' + esc(kbTarget(kb)) : ' · 未填地址') + '</i></span>' +
        '<button class="icon-btn" data-ke="' + kb.id + '" title="编辑">✎</button>' +
        '<button class="icon-btn danger" data-kd="' + kb.id + '" title="删除">✕</button>' +
        '</div>';
    }).join('') : '<div class="tip">还没有知识库，点右下角新增。</div>';
    box.querySelectorAll('[data-ke]').forEach(function (b) {
      b.onclick = function () { kbForm(kbById(b.getAttribute('data-ke')), function () { paint(); }); };
    });
    box.querySelectorAll('[data-kd]').forEach(function (b) {
      b.onclick = function () {
        var kid = b.getAttribute('data-kd');
        S.kbs = kbList().filter(function (k) { return k.id !== kid; });
        commit(); paint(); rerender(); toast('已删除知识库');
      };
    });
  }
  paint();
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
  wrap.querySelector('[data-add]').onclick = function () { kbForm(null, function () { paint(); }); };
}
function kbForm(kb, onSaved) {
  var isNew = !kb;
  var o = kb || { type: 'ima', name: '', ref: '', note: '' };
  var wrap = openModal({
    title: isNew ? '新增知识库' : '编辑知识库',
    body:
      '<div class="field"><label>名称<span class="req">*</span></label><input type="text" id="kb-n" value="' + esc(o.name) + '" placeholder="如：枫城的知识库 / Obsidian 主库"></div>' +
      '<div class="field"><label>类型</label><select id="kb-t">' +
        [['ima', 'IMA 知识库'], ['obsidian', 'Obsidian 本地库'], ['library', 'WorkBuddy 资料库'], ['local', '其他 / 本地']].map(function (t) {
          return '<option value="' + t[0] + '"' + (o.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>';
        }).join('') +
      '</select></div>' +
      '<div class="field"><label>地址 / 库 ID / 路径</label><input type="text" id="kb-r" value="' + esc(o.ref || '') + '" placeholder="https://ima.qq.com 或 001aa354... 或 D:\\workBuddy_place\\Obsidian_Place"></div>' +
      '<div class="field"><label>备注</label><input type="text" id="kb-nt" value="' + esc(o.note || '') + '" placeholder="如：团队共享 / 个人主力库"></div>',
    footer: '<button class="btn" data-no="1">取消</button><button class="btn pri" data-ok="1">保存</button>'
  });
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
  wrap.querySelector('[data-ok]').onclick = function () {
    var n = wrap.querySelector('#kb-n').value.trim();
    if (!n) { toast('名称必填', 'warn'); return; }
    var obj = {
      type: wrap.querySelector('#kb-t').value,
      name: n,
      ref: wrap.querySelector('#kb-r').value.trim(),
      note: wrap.querySelector('#kb-nt').value.trim()
    };
    if (isNew) { obj.id = uid(); obj.createdAt = nowISO(); S.kbs = S.kbs || []; S.kbs.push(obj); }
    else { Object.keys(obj).forEach(function (k) { o[k] = obj[k]; }); }
    commit(); closeModal(wrap); rerender();
    if (onSaved) onSaved();
    toast(isNew ? '已新增知识库' : '已保存', 'ok');
  };
}
function setObsidianPathDialog() {
  var wrap = openModal({
    title: '设置 Obsidian 库路径',
    body: '<div class="field"><label>本地库路径</label>' +
      '<input type="text" id="ob-p" value="' + esc(S.settings.obsidianPath || '') + '" placeholder="例如：D:\\workBuddy_place\\Obsidian_Place">' +
      '<div class="tip">填仓库根目录（不是 .obsidian）。填好后点文件就能用 Obsidian 打开。</div></div>',
    footer: '<button class="btn" data-no="1">取消</button><button class="btn pri" data-ok="1">保存</button>'
  });
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
  wrap.querySelector('[data-ok]').onclick = function () {
    S.settings.obsidianPath = wrap.querySelector('#ob-p').value.trim();
    commit(); closeModal(wrap); rerender();
    toast(S.settings.obsidianPath ? '已保存 Obsidian 路径' : '已清空路径', 'ok');
  };
}

/* ============================================================
   主渲染
   ============================================================ */
function renderDocsB(el) {
  var h = '';
  h += '<div class="page-note">两块：<b>IMA 知识库</b>（有什么、可搜、可打开）→ <b>Obsidian 仓库</b>（怎么收纳、点开即看，还有知识图谱）。' +
    '页面读的是构建期快照，同步入口在各块右上角。</div>';
  h += dxImaHTML();
  h += dxObsHTML();
  h += '<div class="card tight" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
    '<span style="font-size:12.5px;color:var(--ink-3)">知识库与仓库设置：</span>' +
    '<button class="btn sm" data-act="kb-manage">⚙ 知识库管理</button>' +
    '<button class="btn sm" data-act="set-obsidian">📂 设置 Obsidian 路径</button>' +
    '<button class="btn sm" data-act="obs-manual">📖 打开仓库首页</button>' +
    '</div>';
  el.innerHTML = h;

  /* 搜索框：元素级监听（全站 data-act 只有 click 委托） */
  dxBindSearch(el, '#dx-ima-q', 'imaQ');
  dxBindSearch(el, '#dx-obs-q', 'obsQ');

  /* 图谱视图：插入后启动力导向图 */
  if (DX_UI.obsView === 'graph') {
    var svg = el.querySelector('#dx-graph');
    if (svg) dxGraphInit(svg);
  }
}
function dxBindSearch(el, sel, key) {
  var i = el.querySelector(sel);
  if (!i) return;
  i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { DX_UI[key] = i.value; rerender(); } });
  i.addEventListener('blur', function () { if (i.value !== DX_UI[key]) { DX_UI[key] = i.value; rerender(); } });
}
