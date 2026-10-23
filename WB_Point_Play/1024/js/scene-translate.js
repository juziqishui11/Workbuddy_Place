/* S5 需求翻译机：把一句模糊的产品描述，翻成能排期、能验收的话。
   纯本地规则匹配，不联网、不调模型。 */
(function () {
  const U = APP.util, D = APP.DATA, $ = U.$;
  const body = () => $('#body-translate');

  const SAMPLES = ['页面再丝滑一点', '简单搞下就行', '先上线看看', '参考一下竞品'];

  let lastOut = null;   // { hits, level, fallback, text }

  /* ---------- 翻译 ---------- */
  function translate(text) {
    const s = String(text || '').toLowerCase();
    const scored = D.TRANSLATIONS
      .map((t) => ({ t, n: t.match.filter((k) => s.indexOf(k.toLowerCase()) !== -1).length }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n || b.t.level - a.t.level);
    if (!scored.length) return { hits: [], level: 2, fallback: true, text };
    const hits = scored.slice(0, 3).map((x) => x.t);
    return { hits, level: Math.max.apply(null, hits.map((h) => h.level)), fallback: false, text };
  }

  function uniqJoin(arr) {
    const out = [];
    arr.forEach((s) => { if (s && out.indexOf(s) === -1) out.push(s); });
    return out.join(' ');
  }

  function levelBar(n) {
    let h = '<span class="tr-lvl">';
    for (let i = 1; i <= 5; i++) h += '<i class="' + (i <= n ? 'is-on' : '') + '"></i>';
    return h + '<b>' + n + '/5</b></span>';
  }

  function block(cls, title, txt) {
    return '<div class="tr-card" data-c="' + cls + '">'
      + '<div class="tr-card__h">' + title + '</div>'
      + '<div class="tr-card__b">' + U.esc(txt) + '</div></div>';
  }

  // 空态不放一句「请先输入」，而是先把四栏的骨架摆出来 —— 面板自己说明自己要产出什么
  function ghost(cls, title, sample) {
    return '<div class="tr-card is-ghost" data-c="' + cls + '">'
      + '<div class="tr-card__h">' + title + '</div>'
      + '<div class="tr-card__b">' + U.esc(sample) + '</div></div>';
  }

  function outHTML(r) {
    if (!r) {
      return '<div class="tr-ghost">'
        + '<div class="tr-ghost__tip">填一句产品说过的话，点「翻译成人话」，这里出四栏：</div>'
        + ghost('real', '隐含需求 · 他真正想说的', '表面在说 A，其实要的是 B')
        + ghost('load', '隐藏工作量 · 排期要算的', '要动几处、要不要改数据、要回归哪些页面')
        + ghost('risk', '风险点 · 会回来找你的', '上线之后哪块最容易翻车')
        + ghost('pit', '排坑提醒 · 开工前先做', '先埋点、先对齐口径、先留一个开关')
        + '</div>';
    }
    if (r.fallback) {
      return '<div class="tr-fb"><b>这句翻不出来。</b><br>'
        + '可能是因为它太具体了（这算好事），或者太抽象了（那就再抽象一点，比如「优化一下体验」）。<br>'
        + '换种说法，或者点左边的示例试一试。</div>';
    }
    const first = r.hits[0];
    // 命中多条时各栏合并去重：工作量取最重的那条，风险与排坑接在一起
    const load = r.hits.map((h) => h.load).sort((a, b) => b.length - a.length)[0];
    const risk = uniqJoin(r.hits.map((h) => h.risk));
    const pit = uniqJoin(r.hits.map((h) => h.pit));

    return '<div class="tr-head">'
      + '<div class="tr-terms">' + r.hits.map((h) => '<span class="tr-term">' + U.esc(h.term) + '</span>').join('') + '</div>'
      + '<div class="tr-lvlwrap">危险等级' + levelBar(r.level) + '</div>'
      + '</div>'
      + block('real', '隐含需求 · 他真正想说的', first.real)
      + block('load', '隐藏工作量 · 排期要算的', load)
      + block('risk', '风险点 · 会回来找你的', risk)
      + block('pit', '排坑提醒 · 开工前先做', pit);
  }

  /* ---------- 黑话危险榜：把规则库摊开，点一行直接翻 ---------- */
  // 从 load 文案里抽出人日量级：「开发 1 人日 + 待命 2 人日」→ 3，「3–5 人日」→ 5
  function costOf(load) {
    const re = /(\d+)(?:\s*[–\-~至]\s*(\d+))?\s*人日/g;
    let sum = 0, m;
    const s = String(load || '');
    while ((m = re.exec(s))) sum += Number(m[2] || m[1]);
    return sum;
  }

  function rankHTML() {
    const list = D.TRANSLATIONS.map((t) => ({ t, c: costOf(t.load) }))
      .sort((a, b) => b.t.level - a.t.level || b.c - a.c || a.t.term.length - b.t.term.length)
      .slice(0, 8);
    const rows = list.map((x, i) => '<button class="tr-rank__row" type="button" data-rank="' + U.esc(x.t.term) + '">'
      + '<span class="tr-rank__n">' + (i + 1) + '</span>'
      + '<span class="tr-rank__m"><b>' + U.esc(x.t.term) + '</b>'
      + '<i>' + U.esc(x.t.real) + '</i></span>'
      + '<span class="tr-rank__c">' + (x.c ? '≈' + x.c + ' 人日' : '不好估')
      + '<em>' + levelBar(x.t.level) + '</em></span>'
      + '</button>').join('');
    return '<div class="tr-rank only-open">'
      + '<div class="tr-rank__h"><span>黑话危险榜 · 按排期杀伤力排序</span>'
      + '<span class="tr-rank__tip">点一行直接翻</span></div>'
      + rows
      + '</div>';
  }

  /* ---------- 收起态小样：五行「原话 → 人话」，比一句话更能勾人 ---------- */
  const MINI_IDS = ['smooth', 'simple', 'shipfirst', 'feeling', 'benchmark'];

  function miniHTML() {
    const rows = MINI_IDS.map((id) => {
      const t = D.TRANSLATIONS.filter((x) => x.id === id)[0];
      if (!t) return '';
      return '<div class="tr-mini__row"><b>' + U.esc(t.term) + '</b>'
        + '<i>' + U.esc(t.real) + '</i></div>';
    }).join('');
    return '<div class="tr-mini">'
      + '<div class="tr-mini__h">产品原话 → 人话</div>'
      + rows
      + '<div class="tr-mini__m">' + D.TRANSLATIONS.length + ' 句常见黑话 · 本机匹配</div>'
      + '</div>';
  }

  /* ---------- 渲染 ---------- */
  function render() {
    const box = body();
    if (!box) return;

    box.innerHTML = miniHTML()
      + '<div class="tr only-open">'
      + '<div class="tr__l">'
      + '<textarea class="textarea" id="trText" maxlength="200" placeholder="把产品原话粘进来。比如：这个页面再丝滑一点，明天能给吗？"></textarea>'
      + '<div class="row">'
      + '<button class="btn btn--main" data-act="go">翻译成人话</button>'
      + '<span style="flex:1"></span>'
      + '<span class="note">Ctrl / ⌘ + Enter</span>'
      + '</div>'
      + '<div class="tr-samples">'
      + SAMPLES.map((s) => '<button class="tr-chip" type="button" data-chip="' + U.esc(s) + '">' + U.esc(s) + '</button>').join('')
      + '</div>'
      + '<div class="note tr-tip">规则库收录了 ' + D.TRANSLATIONS.length + ' 句常见黑话，全部在本地匹配，不会把你的话发到任何地方。</div>'
      + '</div>'

      + '<div class="tr__r" id="trOut">' + outHTML(lastOut) + '</div>'
      + '</div>'
      + rankHTML();

    if (!box.dataset.bound) {
      box.dataset.bound = '1';
      box.addEventListener('click', onClick);
      box.addEventListener('keydown', onKey);
    }
  }

  function paint(r) {
    lastOut = r;
    const out = $('#trOut');
    if (out) out.innerHTML = outHTML(r);
  }

  function run() {
    const ta = $('#trText');
    const text = (ta && ta.value || '').trim();
    if (!text) { U.toast('先粘一句产品说的话', 'warn'); return; }
    paint(translate(text));
  }

  function onClick(e) {
    const chip = e.target.closest('[data-chip]');
    if (chip) {
      const ta = $('#trText');
      if (ta) { ta.value = chip.dataset.chip; }
      paint(translate(chip.dataset.chip));
      return;
    }
    const row = e.target.closest('[data-rank]');
    if (row) {
      const ta = $('#trText');
      if (ta) { ta.value = row.dataset.rank; }
      paint(translate(row.dataset.rank));
      return;
    }
    const act = e.target.closest('[data-act]');
    if (act && act.dataset.act === 'go') run();
  }

  function onKey(e) {
    if (e.target.id === 'trText' && (e.key === 'Enter') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      run();
    }
  }

  APP.scenes.translate = {
    render,
    refresh() { const o = $('#trOut'); if (o) o.innerHTML = outHTML(lastOut); },
    onOpen() { render(); },
    onClose() {}
  };
})();
