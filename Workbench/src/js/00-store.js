/* ============================================================
   00-store.js —— 数据层：schema / 持久化 / 导入导出 / 示例数据
   ============================================================ */
var STORE_KEY = 'wd_workbench_v1';
var SCHEMA_VERSION = 2;

/* Cloud Studio 在线版链接（部署后回填，换域名只改这里）。
   workbench = 主站（含工具与案例模块）；token / resource = 两个独立看板 HTML。 */
var WB_DEPLOY_LINKS = {
  workbench: 'https://workbench-43687.app.workbuddy.host/',
  token: 'https://token-dash.app.workbuddy.host/',
  resource: 'https://res-dash.app.workbuddy.host/',
  mbti: 'https://mbti-assessment-14386.app.workbuddy.host/',
  game2048: 'https://2048-game.app.workbuddy.host/',
  fde: 'https://ef4190335f2349b79e01b26a5c33c69b.app.workbuddy.link/',
  toycol: ''
};

/* 我的作品 / 案例（真实数据，不打 demo 标记）。
   cat = '案例'（偏落地场景）/ '工具'（偏功能性、可点击打开或使用）；
   group = 工具分类；prompt = 点击工具时给出的使用提示词。
   抽成函数，供 seedDemo（新用户）与 migrate（老用户幂等补录/同步）两处复用。 */
function seedWorks() {
  var iso = new Date().toISOString();
  var R = 'https://github.com/juziqishui11/Workbuddy_Place/tree/main';
  var W = WB_DEPLOY_LINKS;
  return [
    /* —— 案例（偏落地的场景）—— */
    /* 案例5(MBTI)/案例6(2048)/案例7(FDE) 各有独立 Cloud Studio 部署链接（W.mbti/W.game2048/W.fde）；
       其余案例不挂主站链接，留空由用户手动填「在线版」。github 仅填真实独立的仓库/文件夹，
       主站模块类案例的 github 留空（不挂主仓库深链）—— 唯独「个人工作任务台（本站）」本身就是主站，
       故 online=W.workbench、github=主仓库 Workbench 文件夹（特例）。 */
    { id: uid(), name: '公众号「我与AI的那些事」', type: '公众号', cat: '案例', status: '运营中', url: '', github: '', online: '', desc: '以云崽为主角，记录 AI 实践与 WorkBuddy 用法。', tags: ['内容', 'AI'], createdAt: iso, updatedAt: iso },
    { id: uid(), name: '云崽微信表情包', type: '表情包', cat: '案例', status: '进行中', url: '', github: '', online: '', desc: '办公族主题 · 泡泡玛特潮玩风，用即梦 4.0 出图（多批次+风格定型）。', tags: ['IP', '即梦'], createdAt: iso, updatedAt: iso },
    { id: uid(), name: '个人工作任务台（本站）', type: 'WB案例', cat: '案例', status: '进行中', url: '', github: R + '/Workbench', online: W.workbench, desc: '9 大分区的单文件工作台：任务、项目、知识、学习、技能、文档、工具、复盘、方向。', tags: ['WorkBuddy', '工作台'], createdAt: iso, updatedAt: iso },
    { id: uid(), name: '知识库集成（IMA+Obsidian）', type: 'WB案例', cat: '案例', status: '进行中', url: 'https://ima.qq.com', github: '', online: '', desc: '目录树+知识图谱；V4.8 重扫 63 文件、FR 布局根治崩坏。', tags: ['Obsidian', '图谱'], createdAt: iso, updatedAt: iso },
    { id: uid(), name: 'MBTI 人格测评站', type: 'WB案例', cat: '案例', status: '已上线', url: 'https://github.com/juziqishui11/Workbuddy_Place', github: R + '/mbti-assessment', online: W.mbti, desc: '44 题 / 16 型 / 4 维度，单文件 index.html 交付。', tags: ['MBTI', '单文件'], createdAt: iso, updatedAt: iso },
    { id: uid(), name: '潮玩收藏册小程序', type: '小程序', cat: '案例', status: '已上线', url: 'https://github.com/juziqishui11/Workbuddy_Place', github: R + '/toy-collection-mp', online: W.toycol, desc: '微信原生小程序：双 IP 可切换（泡泡玛特潮玩 / 宝可梦图鉴）的收藏管理，本地存储、系列进度、估值、心愿单；支持模拟抽卡包，抽到的卡自动点亮收藏册。', tags: ['小程序', '收藏', '双IP', '抽卡'], createdAt: iso, updatedAt: iso },
    { id: uid(), name: '2048 小游戏', type: 'WB案例', cat: '案例', status: '已上线', url: 'https://github.com/juziqishui11/Workbuddy_Place', github: R + '/2048', online: W.game2048, desc: '纯前端小游戏，含动画与最高分记录。', tags: ['游戏'], createdAt: iso, updatedAt: iso },
    { id: uid(), name: 'FDE 90天学习网站', type: 'WB案例', cat: '案例', status: '进行中', url: '', github: '', online: W.fde, desc: '12 周 / 90 天 / 45 练习 / 54 词条 单文件站（本站内置模块）。', tags: ['学习', 'FDE'], createdAt: iso, updatedAt: iso },
    { id: uid(), name: 'WB案例库', type: 'WB案例', cat: '案例', status: '已上线', url: '', github: '', online: '', desc: '站点内置 WB 案例快照模块：团队 / 个人案例沉淀与复用。', tags: ['案例库', 'WB'], createdAt: iso, updatedAt: iso },
    { id: uid(), name: '豆包下载无水印图片插件', type: '插件', cat: '案例', status: '已上线', url: '', github: '', online: '', desc: '豆包（Doubao）浏览器插件：一键下载无水印原图。', tags: ['豆包', '插件', '图片'], createdAt: iso, updatedAt: iso },
    /* —— 工具（偏功能性，可点击打开 / 使用）—— */
    /* 非看板工具不挂主站 Cloud Studio 链接；看板类（token / 资源）单独部署，保留各自链接。 */
    { id: uid(), name: '技能推荐', type: '自研工具', cat: '工具', group: '技能', status: '已上线', url: '', github: '', online: '', desc: '站点「技能」模块：SkillHub 每日推荐 + 已安装技能清单。', tags: ['技能', '推荐'], prompt: '在「技能」模块浏览 SkillHub 每日推荐，或说「帮我找/安装一个 XXX 技能」即可让助手检索并安装。', createdAt: iso, updatedAt: iso },
    { id: uid(), name: 'pushplus-wechat 等自研技能', type: '自研工具', cat: '工具', group: '推送', status: '已上线', url: '', github: '', online: '', desc: 'WorkBuddy skill 开发（微信推送等）。', tags: ['skill', '推送'], prompt: '说「推送到微信」即可把任务结果摘要推到微信（pushplus-wechat 技能）。', createdAt: iso, updatedAt: iso },
    { id: uid(), name: '模型 TOKEN 消耗看板', type: '自研工具', cat: '工具', group: '看板', status: '已上线', url: '', github: R + '/tools', online: W.token, desc: 'token-dashboard skill：KPI/日历热力图/模型分布/三级下钻。', tags: ['token', '看板'], prompt: '说「看看我的 token 用量」运行 token-dashboard 技能，生成离线看板 HTML。', createdAt: iso, updatedAt: iso },
    { id: uid(), name: '本机资源监控看板（CPU/内存/FPS）', type: '自研工具', cat: '工具', group: '监控', status: '待构建', url: '', github: R + '/tools', online: W.resource, desc: '本地采整机指标→离线看板，可定时刷新。', tags: ['监控', '系统'], prompt: '说「生成本机监控看板」运行 sys-resource-dashboard 技能，采 CPU/内存/磁盘/网络/进程并生成离线 HTML（含页内 FPS）。', createdAt: iso, updatedAt: iso },
    { id: uid(), name: '聊天记录→摘要→知识库', type: '自研工具', cat: '工具', group: '知识库', status: '待验证', url: '', github: '', online: '', desc: '群聊摘要(baoyu-wechat-summary)+IMA导入(ima-kb)，链路可行未跑通。', tags: ['群聊', '知识库'], prompt: '先把聊天记录交给 baoyu-wechat-summary 提炼为 .md 摘要，再用 ima-kb 把文件导入 IMA 知识库。', createdAt: iso, updatedAt: iso },
    { id: uid(), name: '本地 MySQL 8.0 安装与配置', type: '自研工具', cat: '工具', group: '数据库', status: '已上线', url: '', github: '', online: '', desc: 'mysql-local skill 托管，端口 3306 开机自启。', tags: ['MySQL', '数据库'], prompt: '用 mysql-local 技能管理本地 MySQL：说「启动/停止 MySQL 服务」「列出数据库 / 查表结构」。', createdAt: iso, updatedAt: iso },
    { id: uid(), name: 'AI日报/资讯 搜集与生成', type: '自研工具', cat: '工具', group: '资讯', status: '已上线', url: '', github: '', online: '', desc: 'aihot 抓热点 + 站点资讯/公众号推送。', tags: ['资讯', '日报'], prompt: '说「今天 AI 圈有什么」或访问「AI资讯」模块；aihot 拉取热点，可一键生成公众号日报。', createdAt: iso, updatedAt: iso }
  ];
}

/* 我的工具（手动快捷入口 + 使用提示词）。
   不打 demo 标记（与 works 一致），清空示例数据不会误删。 */
function seedTools() {
  var iso = new Date().toISOString();
  var repo = 'https://github.com/juziqishui11/Workbuddy_Place';
  return [
    { id: uid(), name: 'CloudStudio 部署', url: '', github: '', online: '', icon: '🚀', category: '部署', prompt: '用 cloudstudio-deploy 技能发布项目：说「把这个项目发布上线」即可部署到 Cloud Studio 云沙箱并拿到分享链接。', createdAt: iso },
    { id: uid(), name: '即梦 AI 出图', url: '', github: '', online: '', icon: '🎨', category: '创作', prompt: '说「用即梦生成一张 XXX 风格的图」或「生成一段 XXX 主题的视频」，助手调用 jimeng-image-gen / seedance 出图出视频（默认存 Img_Place/即梦4）。', createdAt: iso },
    { id: uid(), name: 'GitHub 仓库', url: repo, github: repo, online: '', icon: '🐙', category: '代码', prompt: '访问 monorepo 查看 / 同步各子项目；或用 git 工具提交代码。', createdAt: iso },
    { id: uid(), name: 'IMA 知识库', url: 'https://ima.qq.com', github: '', online: '', icon: '📚', category: '知识', prompt: '说「存进 ima」把文件 / 链接 / 网页导入 IMA 知识库（ima-kb 技能）。', createdAt: iso },
    { id: uid(), name: 'Open-Meteo 天气', url: 'https://open-meteo.com/en/docs', github: '', online: '', icon: '🌤️', category: '技术', prompt: '天气数据由概览页自动拉取（Open-Meteo 免 key），无需手动操作；可点此查看接口文档。', createdAt: iso },
    { id: uid(), name: '腾讯会议', url: 'https://meeting.tencent.com', github: '', online: '', icon: '🎥', category: '会议', prompt: '通过腾讯会议技能：说「帮我预约明天下午3点项目周会，30分钟」或「列出我本周的会议」「导出参会成员 / 查录制与转写」。需腾讯会议账号已授权连接器。', createdAt: iso }
  ];
}

function defaultState() {
  return {
    version: SCHEMA_VERSION,
    /* 工作任务 */
    projects: [], tasks: [],
    /* AI 资讯：articles = 公众号精选；news = AI HOT 快照缓存 */
    articles: [], news: { at: '', items: [] },
    /* 兼容旧数据（不再渲染，仅保留以免丢失） */
    cases: [], dailies: [],
    /* FDE 学习：fdeDays = 已勾选的天 { '12': {at} }；fdeChecks = 验收清单勾选 */
    fdeDays: {}, fdeChecks: {},
    /* AI 知识练习：quizRecords = 每次成绩；quizWrong = 错题本 { qid: {n,lastAt} } */
    quizRecords: [], quizWrong: {},
    /* 兼容旧数据（旧版学习计划，不再渲染，仅保留以免丢失） */
    plans: [], planItems: [], checkins: [], materials: [],
    /* 技能库 / 文档库 */
    skills: [], docs: [],
    /* SkillHub 每日推荐：实时拉取缓存（items/at），缺省为空走内置快照 */
    skillhub: { items: [], at: '' },
    /* 工具与案例 */
    tools: [], works: [],
    /* 工作台方向 */
    roadmap: [],
    /* 自动化任务 */
    automations: [],
    settings: {
      city: '杭州',
      lat: 30.29365,
      lon: 120.16142,
      userName: '枫城',
      zodiacSign: 'libra',
      fortuneSeed: 0,
      fortuneDate: '',
      fortuneData: null,
      obsidianPath: 'D:\\workBuddy_place\\Obsidian_Place',
      imaUrl: 'https://ima.qq.com',
      docCwd: 'D:\\workBuddy_place'
    },
    /* 知识库清单（文档库绑定用）：type = ima | obsidian | library | local */
    kbs: [
      { id: 'kb-ima-fc', type: 'ima', name: '枫城的知识库', ref: '001aa354fc407023', note: '个人主力库', createdAt: '' },
      { id: 'kb-ima-team', type: 'ima', name: '团队的知识库', ref: '7502640824983879', note: '团队共享', createdAt: '' },
      { id: 'kb-obs-main', type: 'obsidian', name: 'Obsidian 主库', ref: 'D:\\workBuddy_place\\Obsidian_Place', note: '本地 Markdown · 双链出图谱', createdAt: '' }
    ],
    meta: { seeded: false, createdAt: '', onesSeed: 0, onesAt: '', articlesSeed: 0, skillsSeed: 0, fdeSyncedAt: '' }
  };
}

var S = defaultState();
var LAST_SAVE_OK = true;

/* ---------------- 星座常量 ---------------- */
var ZODIAC = {
  aries:       { name: '白羊座', element: 'fire',  elementName: '火象', start: [3,21],  end: [4,19],   icon: '♈' },
  taurus:      { name: '金牛座', element: 'earth', elementName: '土象', start: [4,20],  end: [5,20],   icon: '♉' },
  gemini:      { name: '双子座', element: 'air',   elementName: '风象', start: [5,21],  end: [6,21],   icon: '♊' },
  cancer:      { name: '巨蟹座', element: 'water', elementName: '水象', start: [6,22],  end: [7,22],   icon: '♋' },
  leo:         { name: '狮子座', element: 'fire',  elementName: '火象', start: [7,23],  end: [8,22],   icon: '♌' },
  virgo:       { name: '处女座', element: 'earth', elementName: '土象', start: [8,23],  end: [9,22],   icon: '♍' },
  libra:       { name: '天秤座', element: 'air',   elementName: '风象', start: [9,23],  end: [10,23],  icon: '♎' },
  scorpio:     { name: '天蝎座', element: 'water', elementName: '水象', start: [10,24], end: [11,22],  icon: '♏' },
  sagittarius: { name: '射手座', element: 'fire',  elementName: '火象', start: [11,23], end: [12,21], icon: '♐' },
  capricorn:   { name: '摩羯座', element: 'earth', elementName: '土象', start: [12,22], end: [1,19],   icon: '♑' },
  aquarius:    { name: '水瓶座', element: 'air',   elementName: '风象', start: [1,20],  end: [2,18],   icon: '♒' },
  pisces:      { name: '双鱼座', element: 'water', elementName: '水象', start: [2,19],  end: [3,20],   icon: '♓' }
};
function getZodiac(key) { return ZODIAC[key] || ZODIAC['libra']; }
function zodiacList() {
  return Object.keys(ZODIAC).map(function (k) { return { key: k, name: ZODIAC[k].name, icon: ZODIAC[k].icon }; });
}

/* ---------------- 所属项目预设（新增/编辑任务的下拉菜单） ---------------- */
var PROJECT_PRESETS = [
  '资管数据中台',
  '资管数据门户自主开发项目',
  '资管综合信息服务系统自主开发项目',
  '个人日常'
];

/* ---------------- 迁移 / 补齐 ---------------- */
var ARR_FIELDS = [
  'projects', 'tasks',
  'articles', 'cases', 'dailies',
  'quizRecords',
  'plans', 'planItems', 'checkins', 'materials',
  'skills', 'docs', 'kbs',
  'tools', 'works',
  'roadmap', 'automations'
];
/* 对象型字段（不是数组），迁移时单独校正 */
var OBJ_FIELDS = ['news', 'fdeDays', 'fdeChecks', 'quizWrong'];

function migrate(raw) {
  var base = defaultState();
  var out = base;
  out.version = SCHEMA_VERSION;
  ARR_FIELDS.forEach(function (k) {
    var v = raw[k];
    out[k] = Array.isArray(v) ? v.filter(function (x) { return x && typeof x === 'object'; }) : [];
  });
  /* 案例 / 工具 幂等补录与分类同步：老用户 localStorage 有旧 works，上面被 raw 覆盖、拿不到新种子。
     这里按名称补入缺失条目，并把新种子里的分类(cat/group)、类型(type)、链接(url)、提示词(prompt)
     同步到已存在的同名条目；移除废弃的「AI 日报小程序」与旧名「AI资讯+技能推荐+WB案例库」
     （已改名为「技能推荐」，WB案例库另立为案例）。不覆盖用户手动新增的作品。 */
  (function mergeSeedWorks() {
    var byName = {};
    out.works.forEach(function (w) { if (w && w.name) byName[w.name] = w; });
    /* 删除废弃 / 改名前的旧条目 */
    out.works = out.works.filter(function (w) {
      return w.name !== 'AI 日报小程序' && w.name !== 'AI资讯+技能推荐+WB案例库'
        && w.name !== 'WorkBuddy_Place 多项目仓库' && w.name !== 'AI 图片/视频生成';
    });
    seedWorks().forEach(function (w) {
      var cur = byName[w.name];
      if (!cur) {
        out.works.push(w);
      } else {
        /* 幂等同步分类与链接（不覆盖用户手动改过的其他字段） */
        if (w.cat) cur.cat = w.cat;
        if (w.group) cur.group = w.group;
        if (w.type) cur.type = w.type;
        if (w.url && !cur.url) cur.url = w.url;
        if (w.prompt && !cur.prompt) cur.prompt = w.prompt;
        if (w.status && !cur.status) cur.status = w.status;
        /* 在线版/仓库链接(online·github)合并规则（2026-09-17 修正）：
           - 种子显式给了真实链接(w.x 非空)：仅当“当前为空”或“当前正好是上轮误回填的主站/主仓库
             深链”时才写入，既修正误填、又不覆盖用户手动填的真实链接(≠主站链接)；
           - 种子未给链接、而当前正好是主站/主仓库深链：清除该误填值；
           - 其余（用户手动填的真实≠主站链接）一律保留。 */
        var __mainSite = WB_DEPLOY_LINKS.workbench;
        var __mainRepo = 'https://github.com/juziqishui11/Workbuddy_Place/tree/main/Workbench';
        if (w.online) {
          if (!cur.online || cur.online === __mainSite) cur.online = w.online;
        } else if (cur.online === __mainSite) {
          cur.online = '';
        }
        if (w.github) {
          if (!cur.github || cur.github === __mainRepo) cur.github = w.github;
        } else if (cur.github === __mainRepo) {
          cur.github = '';
        }
      }
    });
  })();
  /* 工具入口幂等补充：新增「腾讯会议」，移除与 works 重复的「本地 MySQL 8.0」（保留 works 版，信息更全） */
  (function mergeToolSeed() {
    var byName = {};
    out.tools.forEach(function (t) { if (t && t.name) byName[t.name] = t; });
    out.tools = out.tools.filter(function (t) { return t.name !== '本地 MySQL 8.0'; });
    seedTools().forEach(function (t) {
      var cur = byName[t.name];
      if (!cur) {
        out.tools.push(t);
      } else {
        /* 幂等同步链接字段（不覆盖用户手动改过的其他字段） */
        if (t.github && !cur.github) cur.github = t.github;
        if (t.online && !cur.online) cur.online = t.online;
        if (t.prompt && !cur.prompt) cur.prompt = t.prompt;
      }
    });
  })();
  /* 对象型字段：news 有固定形状，其余为普通映射，统一做“是对象且非数组”校正 */
  var rn = raw.news;
  if (rn && typeof rn === 'object' && !Array.isArray(rn)) {
    out.news = { at: rn.at || '', items: Array.isArray(rn.items) ? rn.items : [] };
  } else {
    out.news = { at: '', items: [] };
  }
  OBJ_FIELDS.forEach(function (k) {
    if (k === 'news') return;
    var v = raw[k];
    out[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
    /* 丢掉非对象值，避免脏数据进渲染层 */
    Object.keys(out[k]).forEach(function (kk) {
      if (!out[k][kk] || typeof out[k][kk] !== 'object') delete out[k][kk];
    });
  });
  /* v1 → v2：旧字段 knowledge 迁到 docs */
  if ((!out.docs.length) && Array.isArray(raw.knowledge)) {
    out.docs = raw.knowledge.filter(function (x) { return x && typeof x === 'object'; });
  }
  if (raw.settings && typeof raw.settings === 'object') {
    Object.keys(base.settings).forEach(function (k) {
      if (raw.settings[k] !== undefined && raw.settings[k] !== null) out.settings[k] = raw.settings[k];
    });
  }
  /* 旧默认称呼 'Zhang' → '枫城'（用户可在设置里改） */
  if (out.settings.userName === 'Zhang') out.settings.userName = '枫城';
  /* kbs 是后加字段：老存档没有时用默认清单补齐，避免空列表 */
  if (!out.kbs.length) out.kbs = base.kbs.slice();
  /* 2026-09-12 已配置本地 Obsidian 仓库：回填空路径（用户改过的不动） */
  if (!out.settings.obsidianPath) out.settings.obsidianPath = 'D:\\workBuddy_place\\Obsidian_Place';
  out.kbs.forEach(function (kb) {
    if (kb && kb.type === 'obsidian' && !kb.ref) kb.ref = out.settings.obsidianPath;
  });
  /* 同一次配置：把 Obsidian 类文档记录补上仓库内路径与知识库绑定 */
  out.docs.forEach(function (d) {
    if (d && d.tool === 'Obsidian' && !d.pathOrUrl) {
      d.pathOrUrl = 'D:\\workBuddy_place\\Obsidian_Place\\00_首页.md';
      if (!d.kbId) d.kbId = 'kb-obs-main';
    }
  });
  /* stage 是历史字段（文档库 V3 已不再渲染），保留回填以免老存档结构不一致 */
  out.docs.forEach(function (d) {
    if (!d || d.stage === 'inbox' || d.stage === 'refine' || d.stage === 'archive') return;
    var tool = d.tool || '';
    if (tool === 'IMA') d.stage = 'inbox';
    else if (d.status === '已发布' || d.status === '已沉淀') d.stage = 'archive';
    else if (d.status === '写作中') d.stage = 'refine';
    else if (tool === 'Obsidian') d.stage = 'refine';
    else d.stage = 'inbox';
  });
  if (raw.meta && typeof raw.meta === 'object') out.meta = Object.assign(base.meta, raw.meta);
  return out;
}

/* ---------------- 读 ---------------- */
function loadState() {
  var raw = null;
  try {
    raw = localStorage.getItem(STORE_KEY);
  } catch (e) {
    S = defaultState();
    return { ok: false, error: '无法访问浏览器本地存储（可能处于隐私模式或被禁用），本次改动不会被保存。', fatal: true };
  }
  if (raw === null || raw === '') {
    S = defaultState();
    return { ok: true, fresh: true };
  }
  try {
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('根节点不是对象');
    S = migrate(parsed);
    return { ok: true };
  } catch (e) {
    S = defaultState();
    S.__brokenRaw = raw;
    return { ok: false, error: '本地数据无法解析（' + (e && e.message ? e.message : e) + '）', broken: true };
  }
}

/* ---------------- 写 ---------------- */
function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(S));
    LAST_SAVE_OK = true;
    return { ok: true };
  } catch (e) {
    LAST_SAVE_OK = false;
    var msg = '保存失败：本地存储不可用或空间不足。请及时导出 JSON 备份。';
    if (e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014)) {
      msg = '保存失败：本地存储空间已满。请导出备份后清理数据。';
    }
    return { ok: false, error: msg };
  }
}

function commit(silent) {
  var r = saveState();
  if (!r.ok && !silent) toast(r.error, 'error', 6000);
  return r.ok;
}

/* ---------------- 导入校验 ---------------- */
function validateImport(obj) {
  var errs = [];
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return ['文件根节点不是一个 JSON 对象'];
  if (typeof obj.version !== 'number') errs.push('缺少 version 字段（应为数字）');
  ARR_FIELDS.forEach(function (k) {
    if (obj[k] !== undefined && !Array.isArray(obj[k])) errs.push('字段 ' + k + ' 不是数组');
  });
  var count = 0;
  ARR_FIELDS.forEach(function (k) {
    if (Array.isArray(obj[k])) {
      count += obj[k].length;
      obj[k].forEach(function (it, i) {
        if (!it || typeof it !== 'object') errs.push(k + '[' + i + '] 不是对象');
        else if (!it.id) errs.push(k + '[' + i + '] 缺少 id 字段');
      });
    }
  });
  /* 兼容 v1 备份：允许只带 knowledge */
  if (count === 0 && !Array.isArray(obj.knowledge)) errs.push('数据中没有任何条目，可能不是本工作台的备份文件');
  return errs;
}

function applyImport(obj) {
  S = migrate(obj);
  return commit();
}

/* ---------------- 导出 ---------------- */
function exportJSON() {
  var data = JSON.parse(JSON.stringify(S));
  delete data.__brokenRaw;
  var text = JSON.stringify(data, null, 2);
  var name = 'workbench-backup-' + ymd(new Date()) + '.json';
  try {
    var blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    toast('已导出备份：' + name, 'ok');
    return true;
  } catch (e) {
    toast('导出失败：' + (e && e.message ? e.message : e), 'error');
    return false;
  }
}

/* ---------------- 清空 ---------------- */
function clearAll() {
  S = defaultState();
  S.meta.seeded = true; // 清空后不再自动灌示例
  return commit();
}

/* ============================================================
   示例数据（首次打开预置，真实上下文，不含任何密码/密钥）
   ============================================================ */
var DEMO_FIELDS = ['projects', 'tasks', 'docs', 'roadmap', 'automations'];

function seedDemo() {
  var now = new Date();
  var iso = now.toISOString();
  /* 先留一份现有数据，示例只做「补」不做「换」——避免把 ONES 导入的任务、你自己建的条目冲掉 */
  var prev = {};
  DEMO_FIELDS.forEach(function (k) { prev[k] = (S[k] || []).slice(); });

  /* ---- 项目 ---- */
  S.projects = [
    {
      id: uid(), name: '新品发布项目',
      desc: 'Q4 新品上市的整体节奏把控：物料、渠道、发布会。',
      startDate: dOff(-20), dueDate: dOff(25),
      priority: 'high', progress: 55,
      nextAction: '完成渠道物料终稿确认，锁定发布会流程表',
      status: 'normal', note: '整体节奏正常，盯住渠道物料。',
      createdAt: iso, updatedAt: iso, completedAt: ''
    },
    {
      id: uid(), name: '官网改版项目',
      desc: '官网首页与产品页改版，含视觉升级与文案重写。',
      startDate: dOff(-35), dueDate: dOff(2),
      priority: 'high', progress: 80,
      nextAction: '确认首页视觉终稿并提交上线',
      status: 'normal', note: '距截止仅剩 2 天，需尽快收口。',
      createdAt: iso, updatedAt: iso, completedAt: ''
    },
    {
      id: uid(), name: '客户合作方案',
      desc: '与重点客户的系统对接方案与商务条款确认。',
      startDate: dOff(-12), dueDate: dOff(10),
      priority: 'mid', progress: 35,
      nextAction: '等待对方反馈接口字段口径后继续推进',
      status: 'blocked', note: '卡在对方接口口径确认，已催办两次。',
      createdAt: iso, updatedAt: iso, completedAt: ''
    }
  ];
  var p1 = S.projects[0].id, p2 = S.projects[1].id, p3 = S.projects[2].id;

  /* ---- 任务 ---- */
  function mk(o) {
    var t = {
      id: uid(), title: o.t, projectId: o.p || null,
      dueDate: o.d === undefined ? '' : dOff(o.d),
      dueTime: o.tm || '', priority: o.pr || 'mid',
      status: o.st || 'todo', focus: !!o.f, note: o.n || '',
      createdAt: iso, updatedAt: iso, completedAt: '', statusChangedAt: iso
    };
    if (o.st === 'done') t.completedAt = o.doneAt ? shiftISO(o.doneAt) : iso;
    if (o.sc) t.statusChangedAt = shiftISO(o.sc);
    return t;
  }
  S.tasks = [
    mk({ t: '输出新品发布会主持稿', p: p1, d: 0, tm: '18:00', pr: 'high', st: 'todo', f: true, n: '需与运营确认最终流程' }),
    mk({ t: '官网首页视觉终稿确认', p: p2, d: 0, tm: '12:00', pr: 'high', st: 'doing', n: '设计已出第 3 版' }),
    mk({ t: '整理客户合作方案接口字段清单', p: p3, d: -2, pr: 'high', st: 'waiting', sc: -5, n: '等对方技术确认字段口径' }),
    mk({ t: '回复渠道商合作邮件', p: p1, d: 0, tm: '20:00', pr: 'mid', st: 'todo' }),
    mk({ t: '更新产品 FAQ 文档', d: 1, pr: 'mid', st: 'todo', n: '临时事项，暂无所属项目' }),
    mk({ t: '预约下周客户沟通会', p: p3, d: -1, tm: '17:00', pr: 'mid', st: 'todo', n: '已延期，需今天补上' }),
    mk({ t: '收集官网改版所需产品图', p: p2, d: 2, pr: 'low', st: 'doing' }),
    mk({ t: '完成本周复盘草稿', d: 0, pr: 'low', st: 'done', doneAt: 0 }),
    mk({ t: '提交新品定价表', p: p1, d: -1, pr: 'high', st: 'done', doneAt: -1 }),
    mk({ t: '阅读 FDE Playbook 第 3 章', d: 3, pr: 'mid', st: 'todo', n: '配合 90 天学习计划' })
  ];

  /* ---- AI 资讯 ---- */
  /* 公众号精选由 ARTICLES_SEED（08-ai-news-data.js）经 seedArticles() 提供； */
  /* AI HOT 快照在页面实时拉取后写入 S.news。此处不再放示例数据。 */

  /* ---- FDE 学习 ---- */
  /* 90 天内容由 71-fde-data.js（源：ai_agent_study/agent-90days/fde-90day-plan.html）提供，
     题库由 72-quiz-data.js 提供；打勾进度与练习成绩属于用户真实数据，不预置示例。 */


  /* ---- 技能库 ---- */
  /* 技能与连接器目录由 76-skills-data.js（SKILL_SEED / CONN_SEED）经 seedSkills() 幂等导入，
     内容取自 ~/.workbuddy/skills 与 connector-states.json。此处不再放示例数据。 */

  /* ---- 文档库 ---- */
  /* stage：碎片收集(inbox) → 深度整理(refine) → 长期沉淀(archive)。
     IMA 承担第一段，Obsidian 承接后两段（用户 2026-09-12 定的两段式协同）。 */
  S.docs = [
    { id: uid(), title: 'IMA 个人知识库', tool: 'IMA', genre: '笔记', category: '知识库', pathOrUrl: 'https://ima.qq.com', status: '已沉淀', stage: 'inbox', words: 0, tags: ['IMA', '入口'], summary: '主力知识库入口，支持个人库与团队库（如「基协表结构」）。', excerpt: '个人库 ≈ 001aa354fc407023（1 篇）；团队库 ≈ 7502640824983879（5 项，含文件夹）。', note: '', kbId: 'kb-ima-fc', createdAt: iso, updatedAt: iso },
    { id: uid(), title: 'IMA 团队库 · 基协表结构', tool: 'IMA', genre: '方案', category: '工作', pathOrUrl: '', status: '写作中', stage: 'inbox', words: 0, tags: ['OB-HIVE', '团队'], summary: 'OB-HIVE 项目表结构资料，已收录 xlsx / html / md 三类文档。', excerpt: '覆盖基协采集表加工链路与结果表（A/B/C 表）结构说明。', note: '', kbId: 'kb-ima-team', createdAt: iso, updatedAt: iso },
    { id: uid(), title: 'Obsidian 主库 · 仓库首页', tool: 'Obsidian', genre: '笔记', category: '笔记', pathOrUrl: 'D:\\workBuddy_place\\Obsidian_Place\\00_首页.md', status: '已沉淀', stage: 'archive', words: 0, tags: ['Obsidian', 'MOC'], summary: '本地 Markdown 仓库（D:\\workBuddy_place\\Obsidian_Place），双链 + Graph View 天然出知识图谱。', excerpt: '目录：00_Inbox / 10_Notes / 20_Projects / 30_Articles / 40_Knowledge / 50_Daily / 90_Templates。', note: '点「🧱 在 Obsidian 打开」直接唤起客户端。', kbId: 'kb-obs-main', createdAt: iso, updatedAt: iso },
    { id: uid(), title: 'Obsidian 使用手册', tool: 'Obsidian', genre: '笔记', category: '手册', pathOrUrl: 'D:\\workBuddy_place\\Obsidian_Place\\10_Notes\\学习\\Obsidian 使用手册.md', status: '已沉淀', stage: 'archive', words: 0, tags: ['Obsidian', '手册'], summary: '快捷键 / Markdown 语法 / 双链与图谱 / 模板 / 日记 / Callout / 插件 / 写作流 / 备份，一篇讲完。', excerpt: '核心：文件夹管归属、标签管状态、双链管关联；刷新与读写靠深链。', note: '', kbId: 'kb-obs-main', createdAt: iso, updatedAt: iso },
    { id: uid(), title: '90 天 FDE 学习计划（本地页面）', tool: '本地', genre: '方案', category: '学习', pathOrUrl: 'D:\\workBuddy_place\\ai_agent_study\\agent-90days\\fde-90day-plan.html', status: '已沉淀', stage: 'archive', words: 0, tags: ['FDE', '90天'], summary: '12 周完整大纲、练习题与概念词典。', excerpt: '12 周 / 90 天 / 45 练习 / 54 词条。', note: '', kbId: '', createdAt: iso, updatedAt: iso },
    { id: uid(), title: '车厘子记事本', tool: '本地', genre: '笔记', category: '凭据', pathOrUrl: 'C:\\Users\\EDY\\.workbuddy\\车厘子记事本.md', status: '已沉淀', stage: 'archive', words: 0, tags: ['凭据', '案例库'], summary: '已授权/已实践案例库入口。注意：敏感信息只放这里，不要写进网页或备份文件。', excerpt: '', note: '', kbId: '', createdAt: iso, updatedAt: iso },
    { id: uid(), title: 'Workbuddy_Place 仓库说明', tool: '本地', genre: '文案', category: '代码', pathOrUrl: 'https://github.com/juziqishui11/Workbuddy_Place', status: '草稿', stage: 'refine', words: 0, tags: ['GitHub', 'monorepo'], summary: '多项目 monorepo 的目录说明与提交规范，待补齐。', excerpt: '', note: '', kbId: '', createdAt: iso, updatedAt: iso }
  ];

  /* ---- 工具 ----（seedTools：手动快捷入口 + 提示词，真实工具不打 demo） */
  S.tools = seedTools();

  /* ---- 我的作品 / 案例 ----（seedWorks：9 案例 + 7 工具(含 2 看板)，真实数据不打 demo，清空示例不误删） */
  S.works = seedWorks();

  /* ---- 工作台方向 ---- */
  S.roadmap = [
    { id: uid(), title: '首页改成模块图标宫格，一屏直达 9 个分区', type: '优化建议', status: '进行中', priority: 'high', month: monthTag(0), detail: '每个分区一个渐变图标 + 实时数字，减少找入口的时间。', createdAt: iso, updatedAt: iso },
    { id: uid(), title: '任务支持批量改期 / 批量完成', type: '优化建议', status: '待办', priority: 'mid', month: monthTag(0), detail: '清理延期任务时一条条点太慢，需要多选操作。', createdAt: iso, updatedAt: iso },
    { id: uid(), title: '周报支持导出 Markdown 与一键推送微信', type: '优化建议', status: '待办', priority: 'mid', month: monthTag(0), detail: '复用 pushplus-wechat 技能，周报生成后直接推到微信。', createdAt: iso, updatedAt: iso },
    { id: uid(), title: 'AI 日报固定成每天 10 分钟输入', type: '改善方向', status: '进行中', priority: 'high', month: monthTag(0), detail: '每天至少沉淀 1 条，月末自动汇总成一份「AI 观察小结」。', createdAt: iso, updatedAt: iso },
    { id: uid(), title: 'FDE 计划推到 W6（三道保护 + 主线场景启动）', type: '改善方向', status: '待办', priority: 'high', month: monthTag(0), detail: '本周重点：把 Eval 与重试/兜底/护栏补齐，主线项目跑通端到端。', createdAt: iso, updatedAt: iso },
    { id: uid(), title: '文档库与 IMA / Obsidian 建立双向索引', type: '改善方向', status: '待办', priority: 'mid', month: monthTag(1), detail: '文档库只记入口，写完后回链更新状态，避免写完就丢。', createdAt: iso, updatedAt: iso }
  ];

  /* ---- 自动化任务（示例） ---- */
  S.automations = [
    { id: uid(), name: '全局自动化结果邮件通知', schedule: 'HOURLY', status: 'running', lastRun: dOff(0) + 'T08:00:00', nextRun: dOff(0) + 'T09:00:00', target: '15757101418@163.com', desc: '每小时读取 automation_runs，把新增运行摘要邮件发出。', createdAt: iso, updatedAt: iso },
    { id: uid(), name: '全局自动化结果微信推送', schedule: 'HOURLY', status: 'running', lastRun: dOff(0) + 'T07:30:00', nextRun: dOff(0) + 'T08:30:00', target: 'pushplus', desc: '每小时汇总新增自动化运行，经 pushplus 推送到微信。', createdAt: iso, updatedAt: iso },
    { id: uid(), name: 'AI 日报每日沉淀提醒', schedule: 'DAILY 22:00', status: 'paused', lastRun: '', nextRun: dOff(0) + 'T22:00:00', target: '本地', desc: '每晚提醒补充一条 AI 日报，月末自动汇总。', createdAt: iso, updatedAt: iso }
  ];

  S.meta.seeded = true;
  S.meta.createdAt = iso;
  /* 只给 seedDemo 自己写入的 6 个数组打示例标记（works 除外），
     避免误标 ONES 任务 / AI 资讯 / WB案例 / 技能库 / 练习成绩这些非示例数据，
     否则「清空示例数据」会把它们一起删掉。
     works（我的作品与案例）视为用户真实数据，不打 demo，清空示例时予以保留。 */
  ['projects', 'tasks', 'docs', 'roadmap', 'automations'].forEach(function (k) {
    (S[k] || []).forEach(function (x) { if (x && typeof x === 'object') x.demo = true; });
  });
  commit(true);
}

/** 形如 2026-09 的月份标签，n 为相对当前月的偏移 */
function monthTag(n) {
  var d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + (n || 0));
  return d.getFullYear() + '-' + p2(d.getMonth() + 1);
}
