/* ============================================================
   09-ai-news.js —— AI 资讯：分类常量 / AI HOT 拉取 / WB案例种子
   ============================================================ */

/* AI HOT 的 5 个分类 → 中文标签 + 标签配色 class */
var NEWS_CAT = {
  'ai-models':  { t: '模型发布', c: 'brand' },
  'ai-products': { t: '产品发布', c: 'ok' },
  'industry':   { t: '行业动态', c: '' },
  'paper':      { t: '论文研究', c: 'warn' },
  'tip':        { t: '技巧观点', c: 'brand' }
};
function newsCat(c) { return NEWS_CAT[c] || { t: 'AI 动态', c: '' }; }

/* AI HOT 公开只读接口（匿名、无需 Key、已开放跨域） */
var NEWS_API = 'https://aihot.virxact.com/api/public/items?mode=selected&take=10';
var NEWS_SITE = 'https://aihot.news/';

/* 拉取今日精选 Top 10；成功写入 S.news 快照，失败保留旧快照 */
function fetchAIHot(cb) {
  var done = false;
  var timer = setTimeout(function () {
    if (done) return; done = true;
    cb({ error: 'AI HOT 请求超时' });
  }, 8000);
  fetch(NEWS_API).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function (j) {
    if (done) return; done = true; clearTimeout(timer);
    var raw = (j && j.items) || [];
    var items = raw.slice(0, 10).map(function (it) {
      return {
        id: it.id || '',
        title: it.title || it.title_en || '（无标题）',
        url: it.url || it.permalink || '',
        permalink: it.permalink || '',
        source: it.source || '',
        publishedAt: it.publishedAt || it.discoveredAt || '',
        summary: it.summary || '',
        category: it.category || '',
        score: (typeof it.score === 'number') ? it.score : null
      };
    });
    if (!items.length) { cb({ error: 'AI HOT 暂无数据' }); return; }
    S.news = { at: nowISO(), items: items };
    commit();
    cb({ ok: true, n: items.length });
  }).catch(function (e) {
    if (done) return; done = true; clearTimeout(timer);
    cb({ error: (e && e.message) ? e.message : 'AI HOT 获取失败' });
  });
}

/* ---- 热度排行榜：按 AI HOT 的 score 从高到低重排 ---- */
function newsScore(it) { return (it && typeof it.score === 'number') ? it.score : null; }
function newsRanked() {
  return newsItems().slice().sort(function (a, b) {
    var sa = newsScore(a), sb = newsScore(b);
    if (sa === null && sb === null) return 0;
    if (sa === null) return 1;   /* 没有分数的排到最后 */
    if (sb === null) return -1;
    return sb - sa;
  });
}

/* ---- 底部 #标签：品牌词 + 主题词词典（刻意不含分类词，避免与中部标签重复） ---- */
var NEWS_TAG_BRANDS = [
  'OpenAI', 'Anthropic', 'Google', 'DeepSeek', '腾讯', '混元', '阿里', '通义', 'Qwen',
  '字节', '豆包', '月之暗面', 'Kimi', 'MiniMax', '智谱', 'GLM', 'Meta', '微软', '英伟达',
  'Nvidia', '苹果', 'Amazon', 'xAI', 'Grok', 'Claude', 'Gemini', 'GPT', 'Sora', 'Mistral',
  'Perplexity', '百度', '文心', '华为', '盘古', '阿里云', '腾讯云', 'WorkBuddy', '快手',
  '可灵', '商汤', '讯飞', 'MCP', 'Skill'
];
var NEWS_TAG_RULES = [
  ['大模型', /大模型|基础模型|基模|旗舰模型|LLM/i],
  ['多模态', /多模态|图像|视频|语音|视觉|3D/i],
  ['Agent', /Agent|智能体/i],
  ['开源', /开源|open ?source/i],
  ['编程', /编程|代码|Coding|IDE|开发工具|前端/i],
  ['成本', /定价|价格|成本|费用|Token|额度|免费用/i],
  ['安全', /安全|攻击|漏洞|越狱|对齐|风险|合规/i],
  ['研究', /论文|研究|评测|基准|指数/i],
  ['芯片', /芯片|GPU|算力|推理|部署/i],
  ['办公', /办公|文档|表格|PPT|会议|邮件/]
];
function newsTags(it) {
  if (!it) return [];
  var hay = (it.title || '') + ' ' + (it.summary || '') + ' ' + (it.source || '');
  var low = hay.toLowerCase();
  var out = [];
  NEWS_TAG_BRANDS.forEach(function (b) {
    if (out.length >= 3) return;
    if (low.indexOf(b.toLowerCase()) >= 0 && out.indexOf(b) < 0) out.push(b);
  });
  NEWS_TAG_RULES.forEach(function (r) {
    if (out.length >= 4) return;
    if (r[1].test(hay) && out.indexOf(r[0]) < 0) out.push(r[0]);
  });
  if (!out.length) out.push(newsCat(it.category).t);
  return out.slice(0, 4);
}

/* 快照是否还新鲜（30 分钟内不再自动重拉） */
function newsFresh() {
  var at = S.news && S.news.at;
  if (!at) return false;
  var t = new Date(at).getTime();
  if (isNaN(t)) return false;
  return (Date.now() - t) < 30 * 60 * 1000;
}
function newsItems() { return (S.news && S.news.items) || []; }
function newsUpdatedText() {
  var at = S.news && S.news.at;
  return at ? (ymd(new Date(at)) + ' ' + hm(new Date(at))) : '尚未更新';
}

/* WB案例种子：按 sid 幂等 upsert；同一 scene（具体落地场景）只保留一条。
   重导入时会清理历史种子，但保留「手动新增 / 打标 / 二创过 / 编辑过」的条目。 */
function seedArticles(force) {
  var gate = (S.meta && S.meta.articlesSeed) || 0;
  if (!force && gate >= ARTICLES_SEED_VERSION) return false;
  S.articles = S.articles || [];

  var sids = {};
  ARTICLES_SEED.forEach(function (s) { sids[s.sid] = 1; });

  /* 剪枝：无 sid 的（用户新增/二创）保留；打标 / 编辑过的保留；sid 仍在新种子里的保留 */
  S.articles = S.articles.filter(function (a) {
    if (!a || !a.sid) return true;
    if (a.starred || a.userEdited || a.forkedFrom) return true;
    return !!sids[a.sid];
  });

  /* 场景去重：种子内部同种场景只留一条（优先公众号来源）；已被用户打标/编辑的条目不动 */
  var sceneKept = {};
  var kept = [];
  ARTICLES_SEED.forEach(function (s) {
    var sc = s.scene || s.sid;
    if (sceneKept[sc]) return;
    sceneKept[sc] = 1;
    kept.push(s);
  });

  var bySid = {}, byUrl = {};
  S.articles.forEach(function (a) {
    if (a && a.sid) bySid[a.sid] = a;
    if (a && a.url) byUrl[a.url] = a;
  });
  kept.forEach(function (s) {
    var ex = bySid[s.sid] || byUrl[s.url];
    if (ex) {
      if (ex.userEdited) return;   /* 用户改过的不覆盖 */
      ex.source = s.source; ex.title = s.title; ex.howto = s.howto;
      ex.skills = s.skills || []; ex.scene = s.scene || '';
      ex.srcType = s.srcType || 'wechat'; ex.summary = s.howto;
      ex.sid = s.sid; ex.url = s.url; ex.category = s.category || '工作场景';
      ex.updatedAt = nowISO();
    } else {
      S.articles.push({
        id: uid(), sid: s.sid, scene: s.scene || '', srcType: s.srcType || 'wechat',
        source: s.source, title: s.title, howto: s.howto, summary: s.howto,
        skills: s.skills || [], category: s.category || '工作场景', url: s.url,
        createdAt: nowISO(), updatedAt: nowISO()
      });
    }
  });
  S.meta.articlesSeed = ARTICLES_SEED_VERSION;
  commit();
  return true;
}

/* ---- WB案例资讯：重载内置快照（公众号无法在浏览器实时抓取） ---- */
function artSnapshotAgeDays() {
  var iso = (typeof ARTICLES_FETCHED_AT === 'string') ? ARTICLES_FETCHED_AT : '';
  if (!iso) return null;
  var t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}
var ART_STALE_DAYS = 45;

function artRefresh() {
  var changed = seedArticles(false);
  var n = (S.articles || []).length;
  var age = artSnapshotAgeDays();
  var stale = (age !== null && age > ART_STALE_DAYS);
  rerender();
  var when = ARTICLES_FETCHED_AT ? ('采集于 ' + ARTICLES_FETCHED_AT) : '内置快照';
  if (stale) {
    toast('快照已 ' + age + ' 天未更新（' + when + '），双击 tools/sync-skills.cmd 重新采集', 'warn');
  } else {
    toast('已重载内置快照：' + n + ' 条案例（' + when + '）' + (changed ? '' : '，内容无变化'), 'ok');
  }
}
