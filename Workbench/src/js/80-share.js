/* ============================================================
   80-share.js —— AI 资讯：每日 AI 资讯（AI HOT 热度榜）+ WB案例资讯
   ============================================================ */
var NEWS_ERR = '';            // 最近一次拉取失败原因
var NEWS_LOADING = false;     // 是否正在拉取
var NEWS_AUTO_DONE = false;   // 本次会话是否已自动拉取过
var ART_FILTER = { q: '', src: 'all' };   // WB案例：关键词 / 来源类型
var ART_SRCS = [
  ['all', '全部来源'],
  ['wechat', '公众号'],
  ['community', '腾讯社区']
];

ROUTES['share/news'] = { title: '每日 AI 资讯', desc: 'AI HOT 每日精选 Top 10，按热度排行，打开即拉取最新', render: renderNews };
ROUTES['share/articles'] = { title: 'WB案例资讯', desc: '公众号 WorkBuddy 实战案例：小而明确可落地的具体场景 + 用到的技能', render: renderArticles };

/* ============================================================
   每日 AI 资讯 —— 热度排行榜
   ============================================================ */
function renderNews(el) {
  var items = newsRanked();
  var hotN = Math.min(3, items.length);

  var html = '';
  html += '<div class="page-note">' +
    (items.length
      ? ('今日精选 ' + items.length + ' 条 · 按 AI HOT 热度排行，前 ' + hotN + ' 名 🔥 · 更新于 ' + esc(newsUpdatedText()))
      : '首次打开会自动拉取今日 AI 精选，并按热度排行') +
    (NEWS_ERR ? ' · <b>' + esc(NEWS_ERR) + '</b>' : '') + '</div>';

  html += '<div class="card news-box">' +
    '<div class="card-hd"><div class="ico brand">🔥</div><h3>AI HOT · 热度排行榜</h3>' +
    '<span class="hint">' + (NEWS_LOADING ? '正在刷新…' : esc(newsUpdatedText())) + '</span>' +
    '<button class="btn sm" data-act="news-refresh">' + (NEWS_LOADING ? '刷新中…' : '↻ 刷新') + '</button></div>';

  if (!items.length) {
    html += NEWS_ERR
      ? emptyBox('📡', '暂时拿不到 AI HOT 数据', '点右上角「↻ 刷新」重试，或稍后再打开看看')
      : emptyBox('📡', '正在获取今日 AI 精选…', '首次打开需要联网拉取，稍等几秒');
  } else {
    html += '<div class="news-list">' + items.map(newsRow).join('') + '</div>';
  }

  html += '<div class="news-foot">排序依据 AI HOT 的 score 热度分 · 数据来源 <a href="' + NEWS_SITE + '" target="_blank" rel="noopener">AI HOT</a>' +
    ' · 每日精选实时同步，30 分钟内不重复请求</div>';
  html += '</div>';

  el.innerHTML = html;
  newsAutoRefresh();
}

function newsRow(it, i) {
  var c = newsCat(it.category);
  var hot = i < 3;
  var sc = newsScore(it);
  var tags = newsTags(it);
  return '<div class="news-row' + (hot ? ' hot' : '') + '">' +
    '<div class="news-n">' + (i + 1) + '</div>' +
    '<div class="news-b">' +
      '<a class="news-t" href="' + esc(it.url) + '" target="_blank" rel="noopener">' +
        (hot ? '<span class="news-fire" title="热度 Top ' + (i + 1) + '">🔥</span>' : '') +
        esc(it.title) +
      '</a>' +
      '<div class="news-m">' +
        '<span class="tag ' + c.c + '">' + esc(c.t) + '</span>' +
        (sc !== null ? '<span class="news-heat">热度 ' + sc + '</span>' : '') +
        (it.source ? '<span class="news-src">' + esc(it.source) + '</span>' : '') +
        (it.publishedAt ? '<span class="news-time">' + esc(relTime(it.publishedAt)) + '</span>' : '') +
      '</div>' +
      (it.summary ? '<div class="news-sum">' + esc(it.summary) + '</div>' : '') +
      (tags.length ? '<div class="news-tags">' + tags.map(function (t) {
        return '<span class="news-tag">#' + esc(t) + '</span>';
      }).join('') + '</div>' : '') +
    '</div>' +
    '</div>';
}

/* 打开页面时自动拉取一次（失败不自动重试，避免反复请求） */
function newsAutoRefresh() {
  if (NEWS_AUTO_DONE || NEWS_LOADING || newsFresh()) return;
  NEWS_AUTO_DONE = true;
  NEWS_LOADING = true;
  if (currentRoute() === 'share/news') rerender();
  fetchAIHot(function (res) {
    NEWS_LOADING = false;
    NEWS_ERR = res.error || '';
    if (currentRoute() === 'share/news') rerender();
  });
}

/* 手动刷新 */
function refreshNews() {
  if (NEWS_LOADING) return;
  NEWS_LOADING = true; NEWS_ERR = '';
  if (currentRoute() === 'share/news') rerender();
  fetchAIHot(function (res) {
    NEWS_LOADING = false;
    NEWS_ERR = res.error || '';
    toast(res.ok ? ('已更新 ' + res.n + ' 条 AI 资讯') : ('刷新失败：' + res.error), res.ok ? 'ok' : 'warn');
    if (currentRoute() === 'share/news') rerender();
  });
}

/* ============================================================
   WB案例资讯
   ============================================================ */
function renderArticles(el) {
  var q = (ART_FILTER.q || '').trim().toLowerCase();
  var src = ART_FILTER.src || 'all';
  var all = (S.articles || []).slice();
  /* 公众号排在腾讯社区前面 */
  all.sort(function (a, b) {
    var ra = (a.srcType === 'wechat') ? 0 : 1;
    var rb = (b.srcType === 'wechat') ? 0 : 1;
    return ra - rb;
  });
  var list = all.filter(function (a) {
    if (src !== 'all' && (a.srcType || 'wechat') !== src) return false;
    if (!q) return true;
    var hay = ((a.title || '') + ' ' + (a.howto || a.summary || '') + ' ' + (a.source || '') +
      ' ' + (a.scene || '') + ' ' + ((a.skills || []).join(' '))).toLowerCase();
    return hay.indexOf(q) >= 0;
  });

  var nWe = all.filter(function (a) { return (a.srcType || 'wechat') === 'wechat'; }).length;
  var nCo = all.length - nWe;
  var age = artSnapshotAgeDays();
  var stale = (age !== null && age > ART_STALE_DAYS);

  var html = '';
  html += '<div class="page-note' + (stale ? ' warn' : '') + '">共 <b>' + all.length + '</b> 条具体场景 · 公众号 <b>' + nWe + '</b> 条 / 腾讯社区 <b>' + nCo +
    '</b> 条 · 采集于 ' + esc(ARTICLES_FETCHED_AT || '未知') +
    (stale ? '（已 ' + age + ' 天未更新，建议双击 tools/sync-skills.cmd 重新采集）' : '') +
    ' · 仅收「小而明确可落地」的场景，同种场景只收一条</div>';

  html += '<div class="card tight">' +
    '<div style="display:flex;gap:9px;flex-wrap:wrap;align-items:center">' +
      '<input type="text" id="art-q" placeholder="🔍 搜索场景 / 技能 / 来源" value="' + esc(ART_FILTER.q) + '" style="flex:1;min-width:200px">' +
      '<button class="btn" data-act="art-refresh">↻ 重载快照</button>' +
      '<button class="btn pri" data-act="art-new">＋ 新增案例</button>' +
    '</div>' +
    '<div class="sk-frow chips" style="margin-top:11px">' +
      '<span class="chip-lbl">来源</span>' +
      ART_SRCS.map(function (c) {
        return '<button class="chip ' + (src === c[0] ? 'on' : '') + '" data-act="art-src" data-v="' + esc(c[0]) + '">' + esc(c[1]) + '</button>';
      }).join('') +
    '</div>' +
  '</div>';

  html += list.length
    ? '<div class="grid-2">' + list.map(articleCard).join('') + '</div>'
    : '<div class="card">' + emptyBox('✦', all.length ? '没有符合条件的案例' : '还没有案例',
      all.length ? '换个关键词或来源再试' : '点「＋ 新增案例」收录第一条') + '</div>';

  el.innerHTML = html;
  var qi = el.querySelector('#art-q');
  if (qi) {
    qi.addEventListener('keydown', function (e) { if (e.key === 'Enter') { ART_FILTER.q = qi.value; rerender(); } });
    qi.addEventListener('blur', function () { if (qi.value !== ART_FILTER.q) { ART_FILTER.q = qi.value; rerender(); } });
  }
}

function articleCard(a) {
  var isWe = (a.srcType || 'wechat') === 'wechat';
  var skills = a.skills || [];
  return '<div class="art-card' + (a.starred ? ' starred' : '') + '">' +
    '<div class="art-hd">' +
      (a.scene ? '<span class="tag brand">' + esc(a.scene) + '</span>' : '') +
      '<span class="tag ' + (isWe ? 'art-src-we' : 'art-src-co') + ' art-src">' + esc(a.source || '未标注') + '</span>' +
      (a.starred ? '<span class="art-star" title="已打标，重导入时会保留">★</span>' : '') +
      (a.forkedFrom ? '<span class="tag art-cat">二创</span>' : '') +
    '</div>' +
    '<div class="art-t">' +
      (a.url ? '<a href="' + esc(a.url) + '" target="_blank" rel="noopener">' + esc(a.title) + '</a>' : esc(a.title)) +
    '</div>' +
    (a.howto || a.summary ? '<div class="art-sum">' + esc(a.howto || a.summary) + '</div>' : '') +
    (skills.length ? '<div class="art-skills">' + skills.map(function (s) {
      return '<span class="art-skill">' + esc(s) + '</span>';
    }).join('') + '</div>' : '') +
    '<div class="art-f">' +
      (a.url ? '<button class="btn sm pri" data-act="open-url" data-url="' + esc(a.url) + '">打开原文</button>' : '') +
      '<button class="btn sm" data-act="art-fork" data-id="' + a.id + '" title="以这条为底新建一条自己的笔记">⎘ 二创</button>' +
      '<button class="btn sm' + (a.starred ? ' on' : '') + '" data-act="art-star" data-id="' + a.id + '" title="打标后重导入不会被清理">' + (a.starred ? '★ 已打标' : '☆ 打标') + '</button>' +
      '<button class="icon-btn" data-act="art-edit" data-id="' + a.id + '" title="编辑" aria-label="编辑">✎</button>' +
      '<button class="icon-btn danger" data-act="art-del" data-id="' + a.id + '" title="删除" aria-label="删除">✕</button>' +
    '</div></div>';
}

/* forkOf：传入源案例时为「二创」，以源文为底预填一份新条目 */
function articleForm(a, forkOf) {
  var isNew = !a;
  var src = a || (forkOf
    ? { title: forkOf.title + '（二创）', source: forkOf.source || '', scene: forkOf.scene || '', url: forkOf.url || '', howto: '', srcType: forkOf.srcType || 'wechat' }
    : { title: '', source: '', scene: '', url: '', howto: '', srcType: 'wechat' });
  var srcOpts = [['wechat', '公众号'], ['community', '腾讯社区']].map(function (c) {
    return '<option value="' + c[0] + '"' + ((src.srcType || 'wechat') === c[0] ? ' selected' : '') + '>' + c[1] + '</option>';
  }).join('');
  var body =
    '<div class="field"><label>标题<span class="req">*</span></label><input type="text" id="a-t" value="' + esc(src.title) + '" placeholder="案例标题"></div>' +
    '<div class="field"><label>具体场景<span class="req">*</span></label><input type="text" id="a-sc" value="' + esc(src.scene || '') + '" placeholder="如：写文章 / 聊天记录汇总 / 生成视频（同种场景只留一条）"></div>' +
    '<div class="field"><label>来源类型</label><select id="a-st">' + srcOpts + '</select></div>' +
    '<div class="field"><label>来源渠道<span class="req">*</span></label><input type="text" id="a-s" value="' + esc(src.source) + '" placeholder="公众号名称 / 腾讯云开发者社区"></div>' +
    '<div class="field"><label>链接</label><input type="url" id="a-u" value="' + esc(src.url || '') + '" placeholder="https://..."></div>' +
    '<div class="field"><label>用到的技能</label><input type="text" id="a-sk" value="' + esc((src.skills || []).join('、')) + '" placeholder="多个用「、」或「,」分隔"></div>' +
    '<div class="field"><label>可落地做法</label><textarea id="a-m" placeholder="具体怎么做、指令原文、踩坑点、结果数字">' + esc(src.howto || '') + '</textarea></div>';
  var wrap = openModal({
    title: isNew ? (forkOf ? '二创：基于《' + forkOf.title + '》' : '新增案例') : '编辑案例',
    body: body,
    footer: (isNew ? '' : '<button class="btn danger" data-del="1">删除</button>') +
      '<button class="btn" data-no="1">取消</button><button class="btn pri" data-ok="1">保存</button>'
  });
  wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); };
  if (!isNew) wrap.querySelector('[data-del]').onclick = function () {
    closeModal(wrap);
    S.articles = (S.articles || []).filter(function (x) { return x.id !== a.id; });
    commit(); rerender(); toast('已删除案例');
  };
  wrap.querySelector('[data-ok]').onclick = function () {
    var t = wrap.querySelector('#a-t').value.trim();
    if (!t) { toast('标题必填', 'warn'); return; }
    var sc = wrap.querySelector('#a-sc').value.trim();
    if (!sc) { toast('具体场景必填（用于同种场景去重）', 'warn'); return; }
    var skRaw = wrap.querySelector('#a-sk').value.trim();
    var obj = {
      title: t,
      scene: sc,
      srcType: wrap.querySelector('#a-st').value,
      source: wrap.querySelector('#a-s').value.trim() || '未标注',
      url: wrap.querySelector('#a-u').value.trim(),
      howto: wrap.querySelector('#a-m').value.trim(),
      summary: wrap.querySelector('#a-m').value.trim(),
      skills: skRaw ? skRaw.split(/[、,，]/).map(function (x) { return x.trim(); }).filter(Boolean) : []
    };
    if (isNew) {
      obj.id = uid(); obj.createdAt = nowISO(); obj.updatedAt = nowISO();
      if (forkOf) {
        obj.forkedFrom = forkOf.id;
        /* 二创过的源案例也一并打标，重导入时不会被清理 */
        S.articles.forEach(function (x) { if (x.id === forkOf.id) { x.starred = true; x.updatedAt = nowISO(); } });
      }
      S.articles = S.articles || [];
      S.articles.unshift(obj);
      if (commit()) toast(forkOf ? '已创建二创条目，源案例已打标保留' : '已新增案例', 'ok');
    } else {
      Object.keys(obj).forEach(function (k) { a[k] = obj[k]; });
      a.updatedAt = nowISO();
      a.userEdited = true;   /* 用户改过的，重导入时不覆盖、不清理 */
      if (commit()) toast('已保存', 'ok');
    }
    closeModal(wrap); rerender();
  };
}
