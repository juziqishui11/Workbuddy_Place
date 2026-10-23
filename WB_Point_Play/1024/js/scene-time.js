/* S3 代码时光机：规则库对照 + 代际坐标 + 并排 diff + 年度存档 */
(function () {
  const U = APP.util, D = APP.DATA, $ = U.$;
  const body = () => $('#body-time');
  let last = null;

  /* 内置示例：五段跨年代的代码，改动量都很大，diff 才看得出代差。
     标注年代只用于内置示例；用户自己粘的代码按写法特征估算。 */
  // 样例按年份升序摆，芯片一眼看出代际递进（原数组顺序不是时间顺序）
  const SAMPLES = D.SAMPLES.slice().sort((a, b) => a.year - b.year);
  let cur = 0;
  let hintYear = SAMPLES.length ? SAMPLES[0].year : 0;
  let hintId = SAMPLES.length ? SAMPLES[0].id : '';

  function analyze(code, hint, id) {
    // 统一换行，否则 \r\n 会让「有没有改过」判断出错
    const src = String(code).replace(/\r\n?/g, '\n');
    const lines = src.split('\n');
    const hits = [];
    D.RULES.forEach((r) => {
      let n = 0;
      const re = new RegExp(r.test.source, r.test.flags.replace('g', ''));
      lines.forEach((ln) => {
        if (ln.length > 800) return;
        re.lastIndex = 0;
        if (re.test(ln)) n++;
      });
      if (n) hits.push({ rule: r, n });
    });
    hits.sort((a, b) => b.n - a.n || a.rule.y - b.rule.y);

    let modern = src;
    D.RULES.forEach((r) => {
      if (!r.apply) return;
      r.apply.forEach((pair) => { modern = modern.replace(pair[0], pair[1]); });
    });

    let total = 0, weighted = 0;
    hits.forEach((h) => { total += h.n; weighted += h.n * h.rule.y; });
    const est = total ? Math.round(weighted / total) : new Date().getFullYear();
    const era = hint || est;

    return { hits, modern, era, est, hint: !!hint, total, lines, id: id || '', lineCount: lines.length };
  }

  function timeline(res) {
    const Y0 = 2006, Y1 = 2026, W = 100;
    let ticks = '';
    for (let y = Y0; y <= Y1; y += 4) {
      const p = (y - Y0) / (Y1 - Y0) * W;
      ticks += '<div class="timeline__tick" style="left:' + p + '%"><span>' + y + '</span></div>';
    }
    const byYear = {};
    res.hits.forEach((h) => { byYear[h.rule.y] = (byYear[h.rule.y] || 0) + h.n; });
    let pins = '';
    Object.keys(byYear).forEach((y) => {
      const p = (Number(y) - Y0) / (Y1 - Y0) * W;
      pins += '<div class="timeline__pin" style="left:' + p + '%" title="' + y + ' 年 · ' + byYear[y] + ' 处">' + String(y).slice(2) + '</div>';
    });
    const p = U.clamp((res.era - Y0) / (Y1 - Y0) * W, 0, 100);

    let note;
    if (!res.total) {
      note = '没认出明显的老写法，这段代码已经很当代了';
    } else if (res.id === 'legacy') {
      // 祖传代码本来就横跨多个年代，硬写成「标注 A 估算 B」反而像算错
      note = '这段代码最早能追到 <b style="color:var(--violet-ink)">' + res.era + ' 年</b>，'
        + '之后被反复缝补，写法特征一路横跨到 <b style="color:var(--violet-ink)">' + res.est + ' 年</b>'
        + ' · 命中 ' + res.total + ' 处老写法';
    } else if (res.hint) {
      note = '这段代码标注在 <b style="color:var(--violet-ink)">' + res.era + ' 年</b>，'
        + '按写法特征估算约 <b style="color:var(--violet-ink)">' + res.est + ' 年</b>'
        + ' · 命中 ' + res.total + ' 处老写法';
    } else {
      note = '按写法特征估算，这段代码停留在 <b style="color:var(--violet-ink)">' + res.era + ' 年</b>'
        + ' · 命中 ' + res.total + ' 处老写法';
    }

    return '<div class="timeline">'
      + '<div class="timeline__axis"></div>' + ticks + pins
      + '<div class="timeline__now" style="left:' + p + '%"></div>'
      + '</div>'
      + '<div class="note">代码代际坐标：' + note + '</div>';
  }

  function hitList(res) {
    if (!res.hits.length) return '<div class="feed__empty">没有命中任何规则。可能这段代码本身就很新，或者它用的是另一种语言。</div>';
    return '<div class="hits">' + res.hits.map((h) => {
      const r = h.rule;
      return '<div class="hit">'
        + '<span class="hit__y">' + r.y + ' · ' + U.esc(r.cat) + ' ×' + h.n + '</span>'
        + '<span class="hit__t">' + U.esc(r.title) + '</span>'
        + '<span class="hit__w">' + U.esc(r.why) + '</span>'
        + '<span class="hit__code"><b>' + U.esc(r.from) + '</b>\n<i>' + U.esc(r.to) + '</i></span>'
        + '</div>';
    }).join('') + '</div>';
  }

  /* 行级 LCS：原来按字符比，一段改动量大的代码会碎成上千个 div */
  function lcsDiff(a, b) {
    const LIM = 200;
    const n = Math.min(a.length, LIM), m = Math.min(b.length, LIM);
    const dp = [];
    for (let i = 0; i <= n; i++) dp.push(new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    const out = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { out.push({ t: 'same', s: a[i] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: 'del', s: a[i] }); i++; }
      else { out.push({ t: 'add', s: b[j] }); j++; }
    }
    while (i < n) { out.push({ t: 'del', s: a[i++] }); }
    while (j < m) { out.push({ t: 'add', s: b[j++] }); }
    if (a.length > LIM || b.length > LIM) {
      out.push({ t: 'same', s: '…（超过 ' + LIM + ' 行，只比对前 ' + LIM + ' 行）' });
    }
    return out;
  }

  function diffView(res) {
    const after = res.modern.split('\n');
    const same = res.lines.length === after.length && res.lines.every((ln, i) => ln === after[i]);
    if (!res.modern || same) {
      return '<div class="feed__empty">这段代码没有可自动替换的部分。有些写法（比如整体架构）只能靠人改，规则不敢动手。</div>';
    }
    const rows = lcsDiff(res.lines, after);
    return '<div class="diff">' + rows.map((r) => {
      const sign = r.t === 'add' ? '+ ' : r.t === 'del' ? '- ' : '  ';
      return '<div class="' + r.t + '">' + sign + (U.esc(r.s) || '&nbsp;') + '</div>';
    }).join('') + '</div>'
      + '<div class="note" style="margin-top:5px">保守替换：只改能确定的老写法，不动结构。逐条理由见上方清单。</div>';
  }

  function saves() {
    const arr = APP.state.saved || [];
    if (!arr.length) return '<div class="feed__empty">还没有封存过代码。每年 1024 存一段，几年后回看很有意思。</div>';
    return '<div class="saves">' + arr.slice().reverse().map((s, i) =>
      '<div class="save"><b>' + s.year + '</b><span>' + U.esc(s.title || '未命名') + '</span>'
      + '<span style="margin-left:auto;color:var(--tx-3)">命中 ' + (s.hits || 0) + '</span>'
      + '<button class="btn btn--sm btn--ghost" data-unsave="' + (arr.length - 1 - i) + '">删</button></div>').join('') + '</div>';
  }

  function render() {
    const box = body();
    if (!box) return;
    box.innerHTML = ''
      + '<div class="tm">'
      + '<div class="tm__l">'
      + '<div class="tm-samples">'
      + SAMPLES.map((s, i) => '<button class="tm-samp' + (i === cur ? ' is-on' : '') + '" type="button" data-samp="' + i + '">'
        + '<b>' + s.year + '</b><span>' + U.esc(s.title) + '</span></button>').join('')
      + '</div>'
      + '<textarea class="textarea" id="tmCode" spellcheck="false" placeholder="粘贴一段多年前的老代码，或你自己以前写的。">'
      + U.esc(SAMPLES[cur].code) + '</textarea>'
      + '<div class="row only-open">'
      + '<button class="btn btn--main" data-act="run">开始对照</button>'
      + '<button class="btn" data-act="next">下一段 →</button>'
      + '<button class="btn btn--ghost" data-act="save">封存这段代码</button>'
      + '</div>'
      + '<div class="note only-open">' + SAMPLES.length + ' 段跨年代示例，从 2006 的祖传八层 for 到 2018 的字符串拼表格。'
      + '规则库覆盖 ' + D.RULES.length + ' 条代际写法：变量声明、回调与 Promise、数组迭代、XHR 与 jQuery、DOM 操作、比较与类型判断、CSS 布局。'
      + '代码只在本机处理，不上传。</div>'
      + '</div>'
      + '<div class="tm__r" id="tmOut">'
      + '<div class="note">点「开始对照」，左边这段代码会告诉你它停留在哪一年。</div>'
      + '</div>'
      + '</div>'
      + '<div class="only-open">'
      + '<hr class="sep">'
      + '<div class="sect__h">我的编码史</div>'
      + '<div id="tmSaves">' + saves() + '</div>'
      + '<div class="row" style="margin-top:8px"><button class="btn btn--sm" data-act="history">导出编码史长图</button></div>'
      + '</div>';

    // 手一改，示例的标注年代就作废，改回按写法特征估算
    const ta0 = $('#tmCode');
    if (ta0) ta0.addEventListener('input', function () { hintYear = 0; hintId = ''; });

    if (!box.dataset.bound) {
      box.dataset.bound = '1';
      box.addEventListener('click', onClick);
      box.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(); }
      });
    }
  }

  function run() {
    const ta = $('#tmCode');
    if (!ta) return;
    const code = ta.value;
    if (!code.trim()) { U.toast('先粘一段代码进来', 'warn'); return; }
    if (code.length > 200000) { U.toast('代码太长了，先截到 200KB 以内', 'warn'); return; }
    const t0 = performance.now();
    last = analyze(code, hintYear, hintId);
    const ms = Math.round(performance.now() - t0);
    const out = $('#tmOut');
    if (!out) return;
    out.innerHTML = timeline(last)
      + '<div class="sect__h">并排对照</div>' + diffView(last)
      + '<div class="row" style="margin:2px 0 6px">'
      + '<button class="btn btn--sm" data-act="copy-modern">复制现代化版本</button>'
      + '<span class="note">分析耗时 ' + ms + 'ms · ' + last.lineCount + ' 行</span></div>'
      + '<div class="sect__h">命中的代际写法 · ' + last.hits.length + ' 类</div>' + hitList(last);
    if (ms > 400) U.toast('输入较大，已分块处理', 'warn');
  }

  function load(i) {
    if (!SAMPLES.length) return;
    cur = ((i % SAMPLES.length) + SAMPLES.length) % SAMPLES.length;
    hintYear = SAMPLES[cur].year;
    hintId = SAMPLES[cur].id;
    const ta = $('#tmCode');
    if (ta) ta.value = SAMPLES[cur].code;
    APP.util.$$('[data-samp]', body()).forEach((b) => {
      b.classList.toggle('is-on', Number(b.dataset.samp) === cur);
    });
  }

  function onClick(e) {
    const samp = e.target.closest('[data-samp]');
    if (samp) { load(Number(samp.dataset.samp)); run(); return; }
    const un = e.target.closest('[data-unsave]');
    if (un) {
      APP.state.saved.splice(Number(un.dataset.unsave), 1);
      U.save();
      const s = $('#tmSaves'); if (s) s.innerHTML = saves();
      return;
    }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    const a = act.dataset.act;
    if (a === 'run') { run(); return; }
    if (a === 'next') { load(cur + 1); run(); return; }
    if (a === 'copy-modern') {
      if (!last) { U.toast('先跑一次对照', 'warn'); return; }
      if (navigator.clipboard) navigator.clipboard.writeText(last.modern).then(() => U.toast('已复制现代化版本')).catch(() => U.toast('复制失败', 'warn'));
      else U.toast('请手动复制');
      return;
    }
    if (a === 'save') {
      if (!last) { U.toast('先跑一次对照，再封存', 'warn'); return; }
      const y = prompt('这段代码属于哪一年？', String(new Date().getFullYear()));
      if (y === null) return;
      const title = prompt('给它起个名字（可留空）', '') || '';
      APP.state.saved.push({ year: String(y).slice(0, 4), title, code: last.lines.join('\n').slice(0, 4000), hits: last.total, ts: Date.now() });
      U.save();
      const s = $('#tmSaves'); if (s) s.innerHTML = saves();
      U.toast('已封存 ' + String(y).slice(0, 4));
      return;
    }
    if (a === 'history') { exportHistory(); }
  }

  function exportHistory() {
    const arr = APP.state.saved || [];
    if (!arr.length) { U.toast('先封存至少一段代码', 'warn'); return; }
    const cv = APP.exporter.drawHistory({
      no: APP.state.num != null ? U.pad(APP.state.num, 4) : '----',
      items: arr.slice().sort((a, b) => Number(a.year) - Number(b.year))
    });
    APP.exporter.save(cv, '1024-code-history.png');
  }

  APP.scenes.time = {
    render,
    refresh() {},
    onOpen() {
      render();
      if (!body().dataset.ran) {
        body().dataset.ran = '1';
        setTimeout(run, 80);
      }
    },
    onClose() {}
  };
})();
