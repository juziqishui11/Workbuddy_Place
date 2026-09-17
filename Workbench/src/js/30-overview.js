/* ============================================================
   30-overview.js —— 概览页（首页）：AI 每日一句 / 时间天气 / 星座运势 / 任务卡 / 自动化 / 页脚
   ============================================================ */
var WMO = {
  0: ['晴', '☀️'], 1: ['晴间多云', '🌤️'], 2: ['多云', '⛅'], 3: ['阴', '☁️'],
  45: ['雾', '🌫️'], 48: ['雾凇', '🌫️'],
  51: ['毛毛雨', '🌦️'], 53: ['小雨', '🌦️'], 55: ['细雨', '🌧️'],
  56: ['冻雨', '🌧️'], 57: ['冻雨', '🌧️'],
  61: ['小雨', '🌧️'], 63: ['中雨', '🌧️'], 65: ['大雨', '🌧️'],
  66: ['冻雨', '🌧️'], 67: ['冻雨', '🌧️'],
  71: ['小雪', '🌨️'], 73: ['中雪', '🌨️'], 75: ['大雪', '❄️'], 77: ['米雪', '🌨️'],
  80: ['阵雨', '🌦️'], 81: ['阵雨', '🌧️'], 82: ['强阵雨', '⛈️'],
  85: ['阵雪', '🌨️'], 86: ['强阵雪', '❄️'],
  95: ['雷阵雨', '⛈️'], 96: ['雷阵雨伴冰雹', '⛈️'], 99: ['强雷暴', '⛈️']
};
function wmo(code) { return WMO[code] || ['未知', '🌡️']; }

var _wxCache = { key: '', data: null };

function fetchWeather(cb) {
  var st = S.settings;
  var key = st.city + '|' + st.lat + '|' + st.lon;
  if (_wxCache.key === key && _wxCache.data) { cb(_wxCache.data); return; }
  var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(st.lat) +
    '&longitude=' + encodeURIComponent(st.lon) +
    '&current=temperature_2m,weather_code,relative_humidity_2m' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
    '&timezone=Asia%2FShanghai&forecast_days=1';
  var done = false;
  var timer = setTimeout(function () {
    if (done) return; done = true;
    cb({ error: '天气获取超时' });
  }, 8000);
  fetch(url).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function (j) {
    if (done) return; done = true; clearTimeout(timer);
    var cur = j.current || {};
    var d = (j.daily && j.daily.temperature_2m_max && j.daily.temperature_2m_max.length) ? j.daily.temperature_2m_max[0] : null;
    var n = (j.daily && j.daily.temperature_2m_min && j.daily.temperature_2m_min.length) ? j.daily.temperature_2m_min[0] : null;
    var code = cur.weather_code !== undefined ? cur.weather_code : ((j.daily && j.daily.weather_code) ? j.daily.weather_code[0] : 0);
    var data = { ok: true, temp: cur.temperature_2m, code: code, max: d, min: n, humidity: cur.relative_humidity_2m };
    _wxCache.key = key; _wxCache.data = data;
    cb(data);
  }).catch(function (e) {
    if (done) return; done = true; clearTimeout(timer);
    cb({ error: (e && e.message) ? e.message : '天气获取失败' });
  });
}

function searchCity(name, cb) {
  var url = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(name) +
    '&count=8&language=zh&format=json';
  fetch(url).then(function (r) { return r.json(); })
    .then(function (j) { cb((j && j.results) || []); })
    .catch(function () { cb([]); });
}

/* ---------------- 运势文案池 ---------------- */
var F_YI = ['推进关键任务', '主动催办等待中的事项', '做一次复盘整理', '留出整块时间深度思考', '拉齐沟通对齐口径', '收尾交付已有成果', '学一个新知识点', '清理积压的小事', '把模糊需求写成清单'];
var F_JI = ['拖延等待', '同时开好几条线', '临时改需求', '过度打磨细节', '忽略风险信号', '把沟通全靠脑补'];
var F_TIP = [
  '先把最难的那件事做掉，后面会轻松很多。',
  '今天适合收口，不适合开新坑。',
  '有等待中的事项，主动问一句比继续等更有效。',
  '把「差不多」变成「写明标准」，质量会稳很多。',
  '留 30 分钟给复盘，比多干一小时更值。',
  '高优先级的事，今天必须看到进展。',
  '风险越早暴露，代价越小。',
  '别让临时事项挤掉主线项目的时间。'
];
var LUCKY_COLORS = ['天空蓝', '薄荷绿', '暖橙', '珊瑚粉', '雾紫', '珍珠白', '焦糖棕', '薄荷青'];
var LUCKY_DIRECTIONS = ['东', '南', '西', '北', '东南', '东北', '西南', '西北'];
var AI_QUOTES = [
  'AI 不是替代思考，而是把重复的判断交给机器，把复杂的权衡留给人。',
  '今天的 AI 提示：先把问题拆到最小可验证的一步，再让模型进场。',
  '好 Agent 的秘诀不是更聪明的 prompt，而是更清晰的边界与可观测的反馈。',
  '每一次清晰的输入，都是在为未来的自动化铺路。',
  'AI 时代，「会问问题」比「会写答案」更值钱。',
  '把 80% 的确定性工作交给 Agent，省下时间处理 20% 的异常与判断。',
  '今天的目标：让至少一个重复动作变成自动化。',
  '数据是 AI 的土壤，先把土壤松好，再指望它长出东西。'
];

function hashStr(s) {
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return h >>> 0;
}
function fortuneFor(dateStr, seed, signKey) {
  var sign = getZodiac(signKey);
  var s = hashStr(dateStr + '#' + seed + '#' + signKey);
  var score = 60 + (s % 40); // 60-99
  var stars = score >= 90 ? 5 : (score >= 80 ? 4 : (score >= 70 ? 3 : (score >= 60 ? 2 : 1)));
  var level = score >= 90 ? '大吉' : (score >= 80 ? '吉' : (score >= 70 ? '平' : (score >= 60 ? '凶' : '大凶')));
  var a = s % F_YI.length;
  var b = (s >> 4) % F_YI.length; if (b === a) b = (b + 3) % F_YI.length;
  var ji = (s >> 8) % F_JI.length;
  var color = LUCKY_COLORS[(s >> 10) % LUCKY_COLORS.length];
  var number = 1 + (s % 9);
  var direction = LUCKY_DIRECTIONS[(s >> 12) % LUCKY_DIRECTIONS.length];
  var tip = F_TIP[(s >> 16) % F_TIP.length];
  /* 分维度指数：事业、财运、感情、健康、学习 */
  var dims = [
    { k: '事业', v: 60 + ((s >> 18) % 40) },
    { k: '财运', v: 60 + ((s >> 20) % 40) },
    { k: '感情', v: 60 + ((s >> 22) % 40) },
    { k: '健康', v: 60 + ((s >> 24) % 40) },
    { k: '学习', v: 60 + ((s >> 26) % 40) }
  ];
  return {
    score: score, stars: stars, level: level,
    element: sign.elementName, signName: sign.name, signIcon: sign.icon,
    luckyColor: color, luckyNumber: number, luckyDirection: direction,
    yi: [F_YI[a], F_YI[b]], ji: F_JI[ji], tip: tip, dims: dims
  };
}
function dailyQuote(dateStr) {
  var s = hashStr(dateStr + '#AIQUOTE');
  return AI_QUOTES[s % AI_QUOTES.length];
}
function renderStars(n) {
  var out = '';
  for (var i = 0; i < 5; i++) out += i < n ? '★' : '☆';
  return out;
}

/* ---------------- 桌宠傲娇/调皮台词 ---------------- */
var PET_LINES = [
  function (d) { return greet(d) + '，枫城 👋'; },
  function () { return '哼，才不是特意来跟你打招呼的，只是顺路～'; },
  function () { return '别、别误会，我可不是在等你点我！'; },
  function (d) { return greet(d) + '啦——才、才不是因为你才说的！'; },
  function () { return '今天也要加油哦，才、才不是关心你！'; },
  function () { return '摸头可以，但只一下下，不准得意～'; },
  function () { return '任务好多？怕什么，有本桌宠在呢（叉腰）'; },
  function () { return '想我了没？…才怪！'; },
  function () { return '枫城你今天气色不错嘛…（小声）也就一般般啦。'; },
  function () { return '我又来啦，别太感动哦。'; },
  function () { return '你的运势本桌宠已经看过了，勉强及格吧（傲）'; },
  function () { return '快来摸摸我，不然我可要闹脾气了！'; }
];
var PET_LAST = -1;
function petGreeting(d) {
  var i = Math.floor(Math.random() * PET_LINES.length);
  if (i === PET_LAST) i = (i + 1) % PET_LINES.length;
  PET_LAST = i;
  return PET_LINES[i](d);
}

/* ---------------- 概览页 ---------------- */
ROUTES['overview'] = { title: '首页概览', desc: '一屏看清今天，一键直达各分区', render: renderOverview, noHead: true };

/* 桌宠 SVG（云崽风格简化版） */
function petAvatarHTML() {
  return '<div class="pet-avatar" data-act="pet-greet" title="点我打招呼">' +
    '<svg viewBox="0 0 100 100" width="100%" height="100%">' +
    '<defs>' +
    '<linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6d5efc"/><stop offset="100%" stop-color="#22c1c3"/></linearGradient>' +
    '<filter id="pglow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
    '</defs>' +
    '<circle cx="50" cy="55" r="36" fill="url(#pg)" filter="url(#pglow)"/>' +
    '<ellipse cx="38" cy="48" rx="10" ry="12" fill="#fff"/>' +
    '<ellipse cx="62" cy="48" rx="10" ry="12" fill="#fff"/>' +
    '<circle cx="40" cy="50" r="4" fill="#1b1f35"/>' +
    '<circle cx="60" cy="50" r="4" fill="#1b1f35"/>' +
    '<circle cx="42" cy="48" r="1.5" fill="#fff"/>' +
    '<circle cx="58" cy="48" r="1.5" fill="#fff"/>' +
    '<path d="M42 68 Q50 76 58 68" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="28" cy="40" r="5" fill="#ffd6e0"/>' +
    '<circle cx="72" cy="40" r="5" fill="#ffd6e0"/>' +
    '<path d="M22 30 Q16 24 22 18" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M78 30 Q84 24 78 18" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '</svg>' +
    '<div class="pet-bubble hidden">枫城你好 👋</div>' +
    '</div>';
}

/* 任务统计卡 */
function statCardHTML(item) {
  return '<div class="stat-card ' + (item.cls || '') + '" data-nav="' + item.go + '">' +
    '<div class="sc-ic">' + item.icon + '</div>' +
    '<div class="sc-body">' +
    '<div class="sc-lb">' + esc(item.lbl) + '</div>' +
    '<div class="sc-val">' + item.val + (item.unit ? '<small>' + item.unit + '</small>' : '') + '</div>' +
    '<div class="sc-ft">' + esc(item.ft) + '</div>' +
    '</div>' +
    '</div>';
}

/* 自动化列表 */
function automationListHTML() {
  var list = S.automations || [];
  if (!list.length) return '<div class="card empty"><div class="e-ic">⚙</div><div class="e-t">暂无自动化任务</div><div class="e-s">在「设置」里导入或新建自动化</div></div>';
  return '<div class="auto-list">' + list.map(function (a) {
    var running = a.status === 'running';
    return '<div class="auto-item ' + (running ? 'on' : 'off') + '">' +
      '<div class="ai-dot"></div>' +
      '<div class="ai-main">' +
      '<div class="ai-name">' + esc(a.name) + '<span class="ai-tag">' + esc(a.schedule) + '</span></div>' +
      '<div class="ai-meta">' + (a.lastRun ? '上次：' + esc(a.lastRun.slice(11, 16)) : '未运行') + ' · 目标：' + esc(a.target) + '</div>' +
      '<div class="ai-desc">' + esc(a.desc || '') + '</div>' +
      '</div>' +
      '<div class="ai-acts">' +
      '<button class="icon-btn" data-act="auto-toggle" data-id="' + a.id + '" title="' + (running ? '暂停' : '启用') + '">' + (running ? '⏸' : '▶') + '</button>' +
      '<button class="icon-btn" data-act="auto-run" data-id="' + a.id + '" title="立即执行">⏵</button>' +
      '</div>' +
      '</div>';
  }).join('') + '</div>';
}

/* 首页页脚 */
function homeFooterHTML() {
  var cols = [
    { h: '🎨 创作工具', items: [
      { label: '即梦 AI 出图', url: 'https://jimeng.jianying.com' },
      { label: 'WorkBuddy 文档', url: 'https://www.workbuddy.cn/docs/workbuddy/Overview' }
    ]},
    { h: '📚 知识协作', items: [
      { label: 'IMA 知识库', url: 'https://ima.qq.com' },
      { label: 'Obsidian', url: 'https://obsidian.md' },
      { label: 'GitHub 仓库', url: 'https://github.com/juziqishui11/Workbuddy_Place' }
    ]},
    { h: '📲 即时通知', items: [
      { label: 'pushplus 微信推送', url: 'http://www.pushplus.plus' }
    ]}
  ];
  return '<footer class="home-footer">' +
    '<div class="hf-top">' +
    '<div class="hf-brand">' +
    '<div class="hf-logo">枫</div>' +
    '<div>' +
    '<div class="hf-title">枫城的工作台</div>' +
    '<div class="hf-desc">9 大分区 · 一屏速览 · 本地持久化</div>' +
    '<div class="hf-tag">数据只存在本机浏览器 · 安全私密</div>' +
    '</div>' +
    '</div>' +
    '<div class="hf-cols">' + cols.map(function (c) {
      return '<div class="hf-col"><div class="hf-col-h">' + c.h + '</div>' +
        c.items.map(function (it) {
          return '<a href="' + esc(it.url) + '" target="_blank" rel="noopener" class="hf-link">' + esc(it.label) + '</a>';
        }).join('') + '</div>';
    }).join('') + '</div>' +
    '</div>' +
    '<div class="hf-copy">© 2026 枫城个人工作台 · 用 WorkBuddy 搭起来的一块屏幕</div>' +
    '</footer>';
}

function renderOverview(el) {
  var d = new Date();
  var wd = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][d.getDay()];
  var st = todayStats();
  var w = weekStats();
  var f = fortuneFor(ymd(d), S.settings.fortuneSeed || 0, S.settings.zodiacSign || 'libra');
  var quote = dailyQuote(ymd(d));

  /* FDE 学习进度独立计算（90 天计划打勾 + 练习成绩） */
  var planPct = fdePct();
  var streak = fdeStreak();
  var quizAvgV = quizAvg();
  var quizCnt = (S.quizRecords || []).length;

  var html = '';

  /* 1. AI 每日一句（大号 + 桌宠 + 滚动） */
  html += '<div class="ai-quote v2">' +
    '<div class="aq-pet">' + petAvatarHTML() + '</div>' +
    '<div class="aq-body">' +
    '<div class="aq-top"><span class="aq-tag">💡 AI 每日一句</span><span class="aq-date">' + ymd(d) + '</span></div>' +
    '<div class="aq-marquee"><div class="aq-track">' + esc(quote) + '</div></div>' +
    '</div>' +
    '</div>';

  /* 2. Hero：时间天气 + 星座运势（参考截图风格） */
  html += '<div class="hero v3">' +
    '<div class="h-main">' +
    '<div class="h-left">' +
    '<div class="h-greet">' + esc(greet(d)) + '，<b>' + esc(S.settings.userName || '枫城') + '</b></div>' +
    '<div class="h-clock" id="ov-clock">' + hm(d) + '</div>' +
    '<div class="h-date">' + d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 · ' + wd + '</div>' +
    '<div class="h-wx" id="ov-weather"><span class="w-ic">…</span><span>天气加载中…</span></div>' +
    '<div class="h-actions">' +
    '<button class="btn" data-act="change-city">切换城市</button>' +
    '<button class="btn" data-act="set-zodiac">设置星座</button>' +
    '<button class="btn" data-act="reroll-fortune">换一换运势</button>' +
    '</div>' +
    '</div>' +
    '<div class="h-right">' +
    '<div class="fortune-card">' +
    '<div class="fc-hd">' +
    '<div class="fc-sign"><span class="fc-ic">' + f.signIcon + '</span>' + esc(f.signName) + '<small>' + esc(f.element) + '</small></div>' +
    '<div class="fc-score"><span>' + f.score + '</span><small>分</small></div>' +
    '</div>' +
    '<div class="fc-stars" title="运势等级：' + esc(f.level) + '">' + renderStars(f.stars) + '<span>' + esc(f.level) + '</span></div>' +
    '<div class="fc-dims">' + f.dims.map(function (dim) {
      var cls = dim.v >= 80 ? 'h' : (dim.v >= 70 ? 'm' : 'l');
      return '<div class="fc-d ' + cls + '"><i>' + dim.k + '</i><b>' + dim.v + '</b></div>';
    }).join('') + '</div>' +
    '<div class="fc-tags">' +
    '<span><i>幸运色</i>' + esc(f.luckyColor) + '</span>' +
    '<span><i>幸运数字</i>' + f.luckyNumber + '</span>' +
    '<span><i>幸运方位</i>' + esc(f.luckyDirection) + '</span>' +
    '</div>' +
    '<div class="fc-yiji">' +
    '<span class="fc-yi">宜 ' + esc(f.yi[0]) + '</span>' +
    '<span class="fc-yi">宜 ' + esc(f.yi[1]) + '</span>' +
    '<span class="fc-ji">忌 ' + esc(f.ji) + '</span>' +
    '</div>' +
    '<div class="fc-tip">' + esc(f.tip) + '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>';

  /* 3. 任务统计卡（带图标） */
  html += '<div class="stat-row">' + [
    { icon: '📥', lbl: '待处理任务', val: st.openTotal, ft: '未完成的任务总数', cls: '', go: 'work/tasks' },
    { icon: '📅', lbl: '今日待办', val: st.todayTodo, ft: '今天到期需处理', cls: st.todayTodo ? 's-warn' : 's-ok', go: 'work/today' },
    { icon: '⏰', lbl: '已延期', val: st.overdue, ft: '超过截止日期未完成', cls: st.overdue ? 's-danger' : 's-ok', go: 'work/radar' },
    { icon: '⏳', lbl: '等待别人', val: st.waiting, ft: '等待反馈中', cls: st.waiting ? 's-warn' : 's-ok', go: 'work/radar' }
  ].map(statCardHTML).join('') + '</div>';

  /* 4. FDE 学习进度独立卡片 */
  html += '<div class="card learn-card click" data-nav="learning/90day">' +
    '<div class="learn-head">' +
    '<div><div class="card-hd" style="padding:0;margin:0"><div class="ico">📚</div><h3>FDE 学习进度</h3></div>' +
    '<div class="learn-sub">90 天计划 · 已完成 ' + fdeDoneCount() + '/' + fdeTotalDays() + ' 天' +
    ' · 连续学习 ' + streak + ' 天' +
    (quizCnt ? ' · 练习平均 ' + quizAvgV + ' 分' : '') + '</div></div>' +
    '<div class="learn-pct">' + planPct + '<small>%</small></div>' +
    '</div>' +
    '<div class="progress-bar"><i style="width:' + planPct + '%"></i></div>' +
    '<div class="learn-foot">' +
    '<span>📖 概念词典 ' + ((window.FDE_DATA && FDE_DATA.glossary) ? FDE_DATA.glossary.length : 0) + ' 词条</span>' +
    '<span>⌨ 练习题库 ' + ((window.FDE_DATA && FDE_DATA.exercises) ? FDE_DATA.exercises.length : 0) + ' 道</span>' +
    '<span>✎ AI 练习 ' + quizCnt + ' 次' + (quizWrongIds().length ? ' · 错题 ' + quizWrongIds().length : '') + '</span>' +
    '<button class="btn sm" data-nav="learning/quiz">去练习</button>' +
    '</div>' +
    '</div>';

  /* 5. 今日三件事 + 风险 */
  var t3 = top3Tasks();
  var risks = riskItems().slice(0, 4);

  html += '<div class="grid-2" style="align-items:start">';
  html += '<div class="card" style="margin-bottom:0">' +
    '<div class="card-hd"><div class="ico">🌟</div><h3>今日最重要的 3 件事</h3>' +
    '<button class="btn sm" data-nav="work/today">查看全部</button></div>' +
    (t3.length ? '<div class="top3">' + t3.map(function (t, i) {
      var pj = projectOf(t.projectId);
      return '<div class="top3-item r' + (i + 1) + '">' +
        '<div class="rk">' + (i + 1) + '</div>' +
        '<div class="b"><div class="tt">' + esc(t.title) + '</div>' +
        '<div class="mm">' + taskTags(t) +
        (pj ? '<span class="tag brand">' + esc(pj.name) + '</span>' : '<span class="tag">临时事项</span>') +
        '</div></div>' +
        '<button class="icon-btn" data-act="task-done" data-id="' + t.id + '" title="标记完成">✓</button>' +
        '</div>';
    }).join('') + '</div>' : emptyBox('◔', '今天没有待办任务', '点「＋ 新增任务」添加一条')) +
    '</div>';

  html += '<div class="card" style="margin-bottom:0">' +
    '<div class="card-hd"><div class="ico danger">⚠️</div><h3>风险提示</h3>' +
    '<button class="btn sm" data-nav="work/radar">风险雷达</button></div>' +
    (risks.length ? risks.map(function (r) {
      var lv = sevLevel(r.sev);
      return '<div class="risk sev-' + lv + '" style="margin-bottom:8px">' +
        '<div class="ri">' + sevIcon(r.sev) + '</div>' +
        '<div class="rb"><div class="rt">' + esc(r.title) + '</div>' +
        '<div class="rm"><span class="tag ' + r.cls + '">' + esc(r.tag) + '</span> ' + esc(r.desc) + '</div></div></div>';
    }).join('') : emptyBox('✓', '当前没有风险项', '逾期、临期、等待超时都会出现在这里')) +
    '</div>';
  html += '</div>';

  /* 6. 自动化任务列表 */
  html += '<div class="sec-title"><h2>⚙️ 自动化任务</h2><span class="n">' + ((S.automations || []).length) + ' 个</span>' +
    '<button class="btn sm" data-nav="toolbox" style="margin-left:auto">管理全部</button></div>';
  html += '<div class="card" style="margin-bottom:0">' + automationListHTML() + '</div>';

  /* 7. 项目速览 */
  var ps = (S.projects || []).filter(function (p) { return p.status !== 'done'; });
  html += '<div class="sec-title"><h2>🗂️ 项目速览</h2><span class="n">' + ps.length + ' 个进行中</span>' +
    '<button class="btn sm" data-nav="work/projects" style="margin-left:auto">项目中心</button></div>';
  html += ps.length ? '<div class="grid-3">' + ps.slice(0, 3).map(projectMiniCard).join('') + '</div>'
    : '<div class="card">' + emptyBox('◫', '还没有项目', '到「项目中心」创建第一个项目') + '</div>';

  /* 8. 页脚 */
  html += homeFooterHTML();

  el.innerHTML = html;

  /* 时钟 */
  var clk = el.querySelector('#ov-clock');
  if (clk) {
    clearInterval(window.__ovTimer);
    window.__ovTimer = setInterval(function () {
      var n = new Date();
      var c = document.getElementById('ov-clock');
      if (!c) { clearInterval(window.__ovTimer); return; }
      c.textContent = hm(n);
    }, 1000);
  }

  /* 天气 */
  var wxEl = el.querySelector('#ov-weather');
  fetchWeather(function (data) {
    if (!wxEl || !wxEl.isConnected) return;
    if (data && data.ok) {
      var wm = wmo(data.code);
      wxEl.innerHTML = '<span class="w-ic">' + wm[1] + '</span>' +
        '<span>' + esc(S.settings.city) + ' · ' + esc(wm[0]) + ' · ' +
        (data.temp !== undefined ? Math.round(data.temp) + '°C' : '') +
        (data.humidity !== undefined ? ' · 湿度 ' + data.humidity + '%' : '') +
        (data.min !== null && data.max !== null ? ' · ' + Math.round(data.min) + '° / ' + Math.round(data.max) + '°' : '') + '</span>';
    } else {
      wxEl.innerHTML = '<span class="w-ic">🌡️</span><span>' + esc(S.settings.city) + ' · 天气暂不可用（' + esc((data && data.error) || '网络异常') + '）</span>';
    }
  });
}

function greet(d) {
  var h = d.getHours();
  if (h < 6) return '夜深了';
  if (h < 11) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}
function projectMiniCard(p) {
  var r = projectRisk(p);
  var remain = projectRemainDays(p);
  return '<div class="card" style="margin-bottom:0;box-shadow:var(--sh-sm)">' +
    '<div style="display:flex;align-items:center;gap:8px"><div style="font-size:15px;font-weight:700;flex:1;min-width:0">' + esc(p.name) + '</div>' +
    '<span class="tag ' + r.cls + '">' + r.label + '</span></div>' +
    '<div style="margin:10px 0 6px">' + progressBar(p.progress || 0) + '</div>' +
    '<div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink-3)">' +
    '<span>进度 <b style="color:var(--ink)">' + (p.progress || 0) + '%</b></span>' +
    '<span>' + (remain === null ? '未设截止' : (remain < 0 ? '超期 ' + (-remain) + ' 天' : '剩余 ' + remain + ' 天')) + '</span>' +
    '<span>未完成 <b style="color:var(--ink)">' + openTasksOf(p.id).length + '</b> 项</span></div>' +
    (p.nextAction ? '<div style="margin-top:9px;font-size:12.5px;color:var(--ink-2);background:var(--bg-soft);padding:8px 10px;border-radius:9px"><b style="color:var(--ink-3);font-size:11px;display:block">下一步</b>' + esc(p.nextAction) + '</div>' : '') +
    '</div>';
}

/* ---------------- 切换城市 ---------------- */
function changeCityDialog() {
  var wrap = openModal({
    title: '切换城市',
    body: '<div class="field"><label>城市名称</label>' +
      '<input type="text" id="city-in" value="' + esc(S.settings.city) + '" placeholder="例如：杭州 / 上海 / 北京" autocomplete="off">' +
      '<div class="tip">使用 Open-Meteo 免注册接口，仅按你输入的城市名换取经纬度。</div></div>' +
      '<div id="city-res" style="display:flex;flex-direction:column;gap:6px"></div>',
    footer: '<button class="btn" data-cancel="1">取消</button><button class="btn pri" data-ok="1">保存</button>'
  });
  var input = wrap.querySelector('#city-in');
  var res = wrap.querySelector('#city-res');
  var picked = null;
  function pick(c) {
    picked = c;
    input.value = c.name;
    res.innerHTML = '';
  }
  function search() {
    var q = input.value.trim();
    if (!q) return;
    res.innerHTML = '<div style="font-size:12.5px;color:var(--ink-3)">搜索中…</div>';
    searchCity(q, function (list) {
      if (!list.length) { res.innerHTML = '<div style="font-size:12.5px;color:var(--ink-3)">没有找到匹配的城市</div>'; return; }
      res.innerHTML = list.slice(0, 6).map(function (c, i) {
        var nm = c.name + (c.admin1 && c.admin1 !== c.name ? ' · ' + c.admin1 : '') + (c.country ? ' · ' + c.country : '');
        return '<button class="btn" style="justify-content:flex-start" data-ci="' + i + '">' + esc(nm) + '</button>';
      }).join('');
      res.querySelectorAll('[data-ci]').forEach(function (b) {
        b.onclick = function () { pick(list[parseInt(b.getAttribute('data-ci'), 10)]); };
      });
    });
  }
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); search(); } });
  setTimeout(search, 100);

  wrap.querySelector('[data-cancel]').onclick = function () { closeModal(wrap); };
  wrap.querySelector('[data-ok]').onclick = function () {
    var name = input.value.trim();
    if (picked && picked.name === name) {
      S.settings.city = picked.name;
      S.settings.lat = picked.latitude;
      S.settings.lon = picked.longitude;
    } else if (name) {
      S.settings.city = name;
      toast('已保存城市名称。如需精确天气，请从搜索结果中点选一次。', 'warn', 4000);
    }
    _wxCache.key = ''; _wxCache.data = null;
    commit(); closeModal(wrap); rerender();
  };
}
