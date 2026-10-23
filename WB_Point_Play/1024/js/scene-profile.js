/* S2 我的程序员设：答题领工号 + 雷达 + bug 体质 + 掉发指数 */
(function () {
  const U = APP.util, D = APP.DATA, $ = U.$;
  const body = () => $('#body-profile');

  function bitsStrip() {
    const set = APP.state.answers.filter((a) => a !== null).length;
    const done = set === 10;
    let bits = '';
    for (let i = 0; i < 10; i++) {
      const b = APP.state.answers[i];
      const col = i < 8 ? D.DIMS[Math.floor(i / 2)].color : 'var(--lemon)';
      const cls = 'bit'
        + (b == null ? ' is-empty' : ' is-set')
        + (i === APP.state.idx && !done ? ' is-cur' : '')
        + (i === 1 || i === 3 || i === 5 || i === 7 ? ' bit--dim' : '')
        + (i === 8 ? ' bit--gacha' : '');
      bits += '<span class="' + cls + '" data-i="' + i + '" style="--c:' + col + '"'
        + ' title="第 ' + (i + 1) + ' 题 · 位权 ' + (1 << (9 - i)) + '">'
        + '<i class="bit__w">' + (b == null ? (1 << (9 - i)) : '') + '</i>'
        + '<b class="bit__v">' + (b == null ? '' : b) + '</b></span>';
    }
    return '<div class="bitgen' + (done ? ' is-done' : '') + '" role="group" aria-label="答题二进制序列">'
      + '<div class="bitgen__h">'
      + '<span class="bitgen__t">' + (done ? '工号已拼齐' : '正在生成你的 1024 工号') + '</span>'
      + '<span class="bitgen__s"><b>' + set + '</b> / 10 位已定</span>'
      + '</div>'
      + '<div class="bitgen__row">' + bits + '</div>'
      + '</div>';
  }

  function intro() {
    const done = APP.state.answers.filter((a) => a !== null).length;
    const c = U.compute();

    // 已答完：不硬推结果页，给一个「主页」，想看重测什么都在这里
    if (c) {
      const hero = U.heroOf(c.code);
      return ''
        + '<div class="prof-empty">'
        + '<div class="prof-id">'
        + '<div class="prof-id__no">#' + c.cardId + '</div>'
        + '<div class="prof-id__t">TYPE-' + c.code + ' · ' + U.esc(c.type.name) + '</div>'
        + '<div class="prof-id__h">封神原型 · ' + U.esc(hero.name) + '</div>'
        + '</div>'
        + '<div class="row">'
        + '<button class="btn btn--main" data-act="result">查看我的工牌</button>'
        + '<button class="btn" data-act="restart">再测一次</button>'
        + '<button class="btn btn--ghost" data-act="edit">只改几道题</button>'
        + '</div>'
        + '<p class="note" style="margin:10px 0 0">工号已经发下来了。想看看结果就点第一个；不满意可以整轮重答，也可以只回去改几道。</p>'
        + '<div class="sect"><div class="sect__h">编号怎么来的</div>'
        + '<div class="note">10 位二进制 → 十进制。前 8 位两两一组构成 4 个维度（发布胆量 / 重构冲动 / 评审火力 / 需求弹性），后 2 位是装备彩蛋。'
        + '4 维 × 2 极性 = 16 型，每型恰好 64 个编号，16 × 64 = 1024，一位不差。</div></div>'
        + '</div>';
    }

    return ''
      + '<div class="prof-empty">'
      + '<p class="note" style="margin:0">10 道二选一，你的每个选择是一位二进制。答完得到 <b style="color:var(--purple)">0–1023</b> 的专属编号，这张工牌会跟着你走完下面每一个面板。</p>'
      + '<div class="row">'
      + (done > 0 && done < 10 ? '<button class="btn btn--main" data-act="resume">继续答题（' + done + '/10）</button>' : '')
      + '<button class="btn ' + (done > 0 && done < 10 ? '' : 'btn--main') + '" data-act="start">' + (done > 0 ? '重新开始' : '开始领工号') + '</button>'
      + '</div>'
      + '<div class="sect"><div class="sect__h">编号怎么来的</div>'
      + '<div class="note">10 位二进制 → 十进制。前 8 位两两一组构成 4 个维度（发布胆量 / 重构冲动 / 评审火力 / 需求弹性），后 2 位是装备彩蛋。'
      + '4 维 × 2 极性 = 16 型，每型恰好 64 个编号，16 × 64 = 1024，一位不差。</div></div>'
      + '</div>';
  }

  function quiz() {
    const i = U.clamp(APP.state.idx, 0, 9);
    const q = D.QUIZ[i];
    const ans = APP.state.answers[i];
    return '<div class="quiz">'
      + '<div class="qz-top"><span class="qz-count">' + (i + 1) + ' / 10</span>'
      + '<div class="qz-prog"><i style="width:' + ((i + (ans !== null ? 1 : 0)) / 10 * 100) + '%"></i></div>'
      + '<button class="btn btn--sm btn--ghost" data-act="prev"' + (i === 0 ? ' disabled' : '') + '>← 上一题</button></div>'
      + bitsStrip()
      + '<div class="qz-card">'
      + '<div class="qz-card__tag">[ ' + U.esc(q.tag) + ' ]</div>'
      + '<div class="qz-card__when">' + U.esc(q.when || '') + '</div>'
      + '<div class="qz-card__q">' + U.esc(q.q) + '</div>'
      + '<div class="qz-opts">'
      + '<button class="opt' + (ans === 0 ? ' is-hit' : '') + '" data-opt="0">'
      + '<span class="opt__k">A</span><span class="opt__t">' + U.esc(q.a) + '</span></button>'
      + '<button class="opt' + (ans === 1 ? ' is-hit' : '') + '" data-opt="1">'
      + '<span class="opt__k">B</span><span class="opt__t">' + U.esc(q.b) + '</span></button>'
      + '</div></div>'
      + '<div class="row"><span class="note">键盘 1 / 2 或 A / B 作答，← 返回上一题</span>'
      + '<span style="flex:1"></span>'
      + (i === 9 ? '<button class="btn btn--main" data-act="finish"' + (APP.state.answers.some((a) => a === null) ? ' disabled' : '') + '>出结果</button>' : '')
      + '</div>'
      + '</div>';
  }

  function radar(list) {
    const cx = 150, cy = 145, R = 100, n = list.length;
    const pt = (i, r) => {
      const a = -Math.PI / 2 + Math.PI * 2 * i / n;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    };
    let h = '<svg class="radar" viewBox="0 0 300 290" role="img" aria-label="六维技能雷达">';
    [.33, .66, 1].forEach((f) => {
      h += '<polygon points="' + list.map((_, i) => pt(i, R * f).join(',')).join(' ')
        + '" fill="none" stroke="' + (f === 1 ? 'var(--line-3)' : 'var(--line)') + '" stroke-width="1"/>';
    });
    list.forEach((_, i) => {
      const p = pt(i, R);
      h += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke="var(--line)"/>';
    });
    const poly = list.map((d, i) => pt(i, R * Math.max(0.06, d.v / 100)).join(',')).join(' ');
    h += '<polygon points="' + poly + '" fill="var(--violet)" fill-opacity=".16" stroke="var(--violet)" stroke-width="2"/>';
    list.forEach((d, i) => {
      const p = pt(i, R * Math.max(0.06, d.v / 100));
      h += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.5" fill="var(--violet)"/>';
      const lp = pt(i, R + 26);
      const anchor = Math.abs(lp[0] - cx) < 6 ? 'middle' : (lp[0] > cx ? 'start' : 'end');
      h += '<text x="' + lp[0] + '" y="' + (lp[1] + 4) + '" font-size="10" fill="var(--tx-3)" text-anchor="' + anchor + '" font-family="ui-monospace,monospace">'
        + U.esc(d.k) + '</text>';
      h += '<text x="' + lp[0] + '" y="' + (lp[1] + 17) + '" font-size="10" font-weight="700" fill="var(--violet-ink)" text-anchor="' + anchor + '" font-family="ui-monospace,monospace">'
        + Math.round(d.v) + '</text>';
    });
    return h + '</svg>';
  }

  function gauge(v, label, band, color) {
    const len = Math.PI * 38;
    const off = len * (1 - v / 100);
    return '<div class="gauge">'
      + '<svg width="88" height="52" viewBox="0 0 88 52">'
      + '<path d="M 6 44 A 38 38 0 0 1 82 44" fill="none" stroke="var(--surface-3)" stroke-width="7" stroke-linecap="round"/>'
      + '<path d="M 6 44 A 38 38 0 0 1 82 44" fill="none" stroke="' + color + '" stroke-width="7" stroke-linecap="round"'
      + ' stroke-dasharray="' + len.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>'
      + '<text x="44" y="40" font-size="17" font-weight="700" fill="' + color + '" text-anchor="middle" font-family="ui-monospace,monospace">' + v + '</text>'
      + '</svg>'
      + '<div class="gauge__t">' + label + '</div><div class="gauge__b" style="color:' + color + '">' + band + '</div></div>';
  }

  function grid1024(c) {
    let h = '<div class="grid1024" aria-label="1024 个编号中你的位置">';
    const typeNums = [];
    for (let i = 0; i < 1024; i++) {
      const b = i.toString(2).padStart(10, '0');
      const code = '' + b[0] + b[2] + b[4] + b[6];
      if (code === c.code) typeNums.push(i);
    }
    for (let i = 0; i < 1024; i++) {
      const p = U.popcount(i);
      const isMe = i === c.num;
      const isType = !isMe && typeNums.indexOf(i) !== -1;
      h += '<i data-p="' + p + '"' + (isMe ? ' class="is-me" title="你的编号 #' + U.pad(i, 4) + '"' : isType ? ' class="is-type" title="同型 #' + U.pad(i, 4) + '"' : '') + '></i>';
    }
    // 同型共 64 个，除了自己还剩 63 个 —— 这个数必须实算，不能写死
    return { html: h + '</div>', sameType: typeNums.length - 1, total: typeNums.length };
  }

  function gridLegend(c, g) {
    return '<div class="glegend">'
      + '<span><i class="glegend__k is-me"></i>你 · #' + c.cardId + '</span>'
      + '<span><i class="glegend__k is-type"></i>同型其余 ' + g.sameType + ' 个</span>'
      + '<span class="glegend__sc"><i data-p="1"></i><i data-p="4"></i><i data-p="7"></i><i data-p="10"></i>'
      + '越亮 = 10 位里 1 越多</span>'
      + '</div>';
  }

  function passCard(c) {
    const ava = 'assets/avatar/' + c.code + '.webp';
    const hero = U.heroOf(c.code);
    return '<div class="pass">'
      + '<div class="pass__ava"><span>' + U.esc(hero.name.slice(0, 1)) + '</span>'
      + '<img src="' + ava + '" alt="" loading="lazy" onerror="this.remove()"></div>'
      + '<div>'
      + '<div class="pass__no">#' + c.cardId + '</div>'
      + '<div class="pass__type">TYPE-' + c.code + ' · ' + U.esc(c.type.name) + '</div>'
      + '<div class="pass__tag">' + U.esc(c.type.tag) + '</div>'
      + '<div class="pass__proto">封神原型 · ' + U.esc(hero.name) + '</div>'
      + '<span class="pass__egg">' + U.esc(c.egg) + '</span>'
      + '<div class="pass__meta">'
      + '<div>BINARY<b>' + c.bits.join('') + '</b></div>'
      + '<div>置位<b>' + c.pc + '/10</b></div>'
      + '<div>同号<b>' + U.rarity(c.pc).count + ' 个</b></div>'
      + '</div></div></div>';
  }

  function heroCard(c) {
    const hero = U.heroOf(c.code);
    const ava = 'assets/avatar/' + c.code + '.webp';
    return '<figure class="hero">'
      + '<div class="hero__art">'
      + '<span class="hero__ph">' + U.esc(hero.name.slice(0, 1)) + '</span>'
      + '<img src="' + ava + '" alt="封神原型 ' + U.esc(hero.name) + ' 的原创手办形象" loading="eager" onerror="this.remove()">'
      + '</div>'
      + '<figcaption class="hero__meta">'
      + '<div class="hero__eyebrow">封神原型 / ARCHETYPE</div>'
      + '<h3 class="hero__name">' + U.esc(hero.name) + '</h3>'
      + '<div class="hero__tali">法宝 · ' + U.esc(hero.talisman) + '</div>'
      + '<p class="hero__line">“' + U.esc(hero.line) + '”</p>'
      + '<div class="hero__type">TYPE-' + c.code + ' · ' + U.esc(c.type.name) + '</div>'
      + '<div class="hero__note">' + U.esc(D.HERO_DISCLAIMER) + '</div>'
      + '</figcaption>'
      + '</figure>';
  }

  function resBar(c) {
    return '<div class="resbar">'
      + '<span class="resbar__id">#' + c.cardId + '</span>'
      + '<span class="resbar__type">TYPE-' + c.code + ' · ' + U.esc(c.type.name) + '</span>'
      + '<span class="resbar__sp"></span>'
      + '<button class="btn btn--sm" type="button" data-act="restart">再测一次</button>'
      + '</div>';
  }

  function result(c) {
    const bars = c.dims.map((d) => {
      const pct = d.tie ? 50 : d.lv * 100;
      return '<div><div class="bar__l"><span>' + d.label + '</span><span>' + (d.tie ? '1:1 平 · 直觉裁定' : d.lv ? d.high + '（2/2）' : d.low + '（0/2）') + '</span></div>'
        + '<div class="bar__t"><i style="width:' + pct + '%;background:' + d.color + '"></i></div></div>';
    }).join('');

    const flip = (code, i) => { const a = code.split(''); a[i] = a[i] === '0' ? '1' : '0'; return a.join(''); };
    const comp = flip(flip(flip(flip(c.code, 0), 1), 2), 3);
    const mirror = flip(c.code, 0);
    const mate = (code, why) => {
      const t = D.TYPES[code];
      return '<div class="mate"><b>' + U.esc(t.name) + '</b><span>TYPE-' + code + '<br>' + why + '</span></div>';
    };

    const r = U.rarity(c.pc);
    const parts = U.bugParts(c);
    const partTxt = parts.filter((p) => p.v !== 0).map((p) => (p.v > 0 ? '+' : '') + p.v + '（' + p.t + '）').join(' ');
    const g = grid1024(c);

    return '<div class="card1024">'
      + resBar(c)
      + heroCard(c)
      + passCard(c)
      + '<div class="bars">' + bars + '</div>'

      + '<div class="sect"><div class="sect__h">技能雷达 · 六轴</div>' + radar(c.radar) + '</div>'

      + '<div class="sect"><div class="sect__h">两项娱乐指数</div>'
      + '<div class="gauges">'
      + gauge(c.bug, 'bug 体质', U.bugBand(c.bug), 'var(--coral-ink)')
      + gauge(c.hair, '掉发指数', U.hairBand(c.hair), 'var(--cyan-ink)')
      + '</div>'
      + '<div class="note" style="margin-top:6px">bug 体质 = ' + partTxt + ' = <b>' + c.bug + '</b>；掉发指数综合 bug 体质、评审火力和咖啡依赖。'
      + '两项均为娱乐性估算，不具任何医学或评价意义。</div></div>'

      + '<div class="sect"><div class="sect__h">优势</div>'
      + c.type.s.map((s) => '<div class="li">' + U.esc(s) + '</div>').join('')
      + '</div>'

      + '<div class="sect"><div class="sect__h">避坑</div>'
      + c.type.p.map((s) => '<div class="li li--bad">' + U.esc(s) + '</div>').join('')
      + '</div>'

      + '<div class="sect"><div class="sect__h">适配搭档</div><div class="mates">'
      + mate(comp, '互补型 · 四维逐位取反，短板正好被补上')
      + mate(mirror, '镜像邻型 · 只在上线胆量上互相拉扯')
      + '</div></div>'

      + '<div class="sect"><div class="sect__h">你在 1024 里的位置</div>' + g.html
      + gridLegend(c, g)
      + '<div class="note" style="text-align:center;margin-top:7px">你的 10 位里有 ' + c.pc + ' 个 1 —— 1024 个编号里只有 '
      + r.count + ' 个和你同密度（' + r.pct + '%），同型 64 个位置里还剩 ' + g.sameType + ' 个没人认领。</div></div>'

      + '<details class="how"><summary>这机器怎么算的</summary>'
      + '<div class="note">位序：Q1 是最高位，Q10 是最低位，编号 = 二进制转十进制。<br>'
      + '平票：某维两题和为 1 时，由该维定调题（Q1/Q3/Q5/Q7）裁定，所以每维在固定极性下恰好 2 种两位组合。<br>'
      + '推导：每型 2⁴（四维程度）× 2²（装备彩蛋）= 64 个编号，16 × 64 = 1024。<br>'
      + '稀有度：只数编号空间，不数人。置位 k 个的组合数 C(10,k)。<br>'
      + '合规：本页是娱乐向行为偏好自测，不构成任何预测或评价。</div></details>'

      + '<div class="row" style="margin-top:10px">'
      + '<button class="btn btn--main" data-act="export-pass">生成工牌图片</button>'
      + '<button class="btn" data-act="copy">复制我的编号</button>'
      + '<button class="btn btn--ghost" data-act="edit">改答案重算</button>'
      + '<button class="btn btn--ghost" data-act="restart">再测一次</button>'
      + '</div></div>';
  }

  function render() {
    const box = body();
    if (!box) return;
    const c = U.compute();
    const st = APP.state.stage;
    if (st === 'result' && c) box.innerHTML = result(c);
    else if (st === 'quiz') box.innerHTML = quiz();
    else box.innerHTML = intro();

    if (!box.dataset.bound) {
      box.dataset.bound = '1';
      box.addEventListener('click', onClick);
      document.addEventListener('keydown', onKey);
    }
  }

  function onClick(e) {
    const t = e.target.closest('[data-act],[data-opt],[data-i]');
    if (!t || !body().contains(t)) return;
    const act = t.dataset.act;

    if (t.dataset.i !== undefined) {
      // 跳题只改题号，不动阶段
      APP.state.idx = Number(t.dataset.i);
      U.save(); render(); return;
    }
    if (t.dataset.opt !== undefined) {
      const i = APP.state.idx;
      APP.state.answers[i] = Number(t.dataset.opt);
      if (i < 9) APP.state.idx = i + 1;
      U.save();
      if (i === 9 && !APP.state.answers.some((a) => a === null)) {
        finish();
      } else render();
      return;
    }
    if (act === 'start') {
      APP.state.answers = Array(10).fill(null); APP.state.idx = 0;
      U.setStage('quiz'); U.save(); render(); return;
    }
    if (act === 'resume') {
      const i = APP.state.answers.findIndex((a) => a === null);
      APP.state.idx = i < 0 ? 9 : i;
      U.setStage('quiz'); render(); return;
    }
    if (act === 'prev') { APP.state.idx = Math.max(0, APP.state.idx - 1); U.save(); render(); return; }
    if (act === 'finish') { finish(); return; }
    if (act === 'result') { U.setStage('result'); render(); return; }
    if (act === 'restart') {
      // 只清答案，不动工号和证书：新号在 finish() 里整体覆盖
      APP.state.answers = Array(10).fill(null); APP.state.idx = 0;
      U.setStage('quiz'); U.save(); render(); return;
    }
    if (act === 'edit') { APP.state.idx = 0; U.setStage('quiz'); U.save(); render(); return; }
    if (act === 'copy') { copyResult(); return; }
    if (act === 'export-pass') { exportPass(t); return; }
  }

  function finish() {
    const c = U.compute();
    if (!c) { U.toast('还有题没答完', 'warn'); return; }
    APP.state.num = c.num;
    // 无条件覆盖：重测后顶栏工号与证书必须跟着变
    APP.state.cert.num = c.cardId;
    U.setStage('result');
    U.save();
    render();
    APP.chrome();
    U.toast('工号已发放：#' + c.cardId);
    if (APP.assets) APP.assets.preload(c.code);
    if (APP.scenes.board) APP.scenes.board.refresh();
    if (APP.scenes.cert) APP.scenes.cert.refresh();
  }

  function onKey(e) {
    const panel = $('#panel-profile');
    if (!panel || !panel.classList.contains('is-open')) return;
    if (APP.state.stage !== 'quiz') return;
    const el = e.target;
    if (el && el.tagName && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
    if (e.key === '1' || e.key.toLowerCase() === 'a') { pick(0); }
    else if (e.key === '2' || e.key.toLowerCase() === 'b') { pick(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'Backspace') { e.preventDefault(); APP.state.idx = Math.max(0, APP.state.idx - 1); render(); }
  }

  function pick(v) {
    if (!body() || APP.state.stage !== 'quiz') return;
    const i = APP.state.idx;
    if (APP.state.answers[i] !== null && i === 9) { APP.state.answers[i] = v; render(); return; }
    APP.state.answers[i] = v;
    if (i < 9) APP.state.idx = i + 1;
    U.save();
    if (i === 9 && !APP.state.answers.some((a) => a === null)) finish(); else render();
  }

  function copyResult() {
    const c = U.compute();
    if (!c) return;
    const txt = '我的 1024 工号 #' + c.cardId + ' · TYPE-' + c.code + ' ' + c.type.name
      + ' · ' + c.egg + '\n「' + c.type.tag + '」\nbug 体质 ' + c.bug + ' / 掉发指数 ' + c.hair
      + '\n#WorkBuddy #1024程序员节';
    const done = () => U.toast('已复制，去发出去');
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done).catch(() => fallbackCopy(txt, done));
    else fallbackCopy(txt, done);
  }

  function fallbackCopy(t, cb) {
    const ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); cb(); } catch (e) { U.toast('复制失败，请手动选中', 'warn'); }
    ta.remove();
  }

  // 绘制逻辑已迁到 export.js 的 drawPass，这里只负责取图 + 防连点
  async function exportPass(btn) {
    const c = U.compute();
    if (!c) return;
    if (btn) { btn.disabled = true; btn.dataset.busy = '1'; }
    try {
      const img = APP.assets ? await APP.assets.ensure(c.code, 1400) : null;
      const t = APP.exporter.drawPass(c, U.heroOf(c.code), img);
      if (t) APP.exporter.save(t.c, '1024-pass-' + c.cardId + '-' + APP.exporter.slug(c.type.name) + '.png');
    } catch (e) {
      U.toast('图片生成失败，稍后再试', 'warn');
    } finally {
      if (btn) { btn.disabled = false; delete btn.dataset.busy; }
    }
  }

  APP.scenes.profile = {
    render,
    refresh: render,
    onOpen() {
      // 演示模式保持结果页；真实用户每次打开都回「主页」，绝不自动跳结果
      if (APP.demo) {
        U.setStage('result');
      } else {
        const done = APP.state.answers.filter((a) => a !== null).length;
        if (done === 10) {
          U.setStage('intro');
        } else if (done > 0) {
          const i = APP.state.answers.findIndex((a) => a === null);
          APP.state.idx = i < 0 ? 9 : i;
          U.setStage('quiz');
        } else {
          APP.state.idx = 0;
          U.setStage('intro');
        }
      }
      render();
    },
    onClose() {}
  };
  window.__profileFinish = finish;
})();
