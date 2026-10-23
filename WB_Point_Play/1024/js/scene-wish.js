/* S4 许愿机：写下 → 封存 → 明年回看。不预测任何结果 */
(function () {
  const U = APP.util, D = APP.DATA, $ = U.$;
  const body = () => $('#body-wish');
  let draft = null;

  function currentWish() {
    if (draft) return draft;
    const arr = APP.state.wishes;
    return arr.length ? arr[arr.length - 1] : null;
  }

  const reduceMotion = () => {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  };
  const pickOne = () => D.WISH_POOL[(Math.random() * D.WISH_POOL.length) | 0];

  let lotTimer = 0;

  function card(w) {
    if (!w) {
      return '<div class="wish-card"><div class="wish-card__no">[ 未封存 ]</div>'
        + '<div class="wish-card__txt" style="color:#6F6152;font-weight:400">还没有写下的话。'
        + '今年想对自己说什么？也可以点上面的「摇一条愿望」，随机来一条再改。</div>'
        + '<div class="wish-card__bless">这里不预测任何结果，只是把话存下来。</div></div>';
    }
    const no = w.num != null ? U.pad(w.num, 4) : '----';
    const d = new Date(w.ts || Date.now());
    const date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    return '<div class="wish-card">'
      + '<div class="wish-card__no">#' + no + ' · ' + date + ' · SEALED</div>'
      + '<div class="wish-card__txt">' + U.esc(w.text) + '</div>'
      + '<div class="wish-card__bless">' + U.esc(w.blessing) + '</div>'
      + '<div class="wish-card__seal">已封存<br>1024</div>'
      + '</div>';
  }

  function list() {
    const arr = APP.state.wishes.slice().reverse();
    if (!arr.length) return '<div class="feed__empty">封存之后会列在这里。来年 1024 再打开看。</div>';
    const rows = arr.slice(0, 12).map((w) => {
      const d = new Date(w.ts || Date.now());
      const y = d.getFullYear();
      const from = w.fromTeam ? ' · 来自 #' + U.pad(w.num, 4) : '';
      return '<div class="wish-row"><span>' + y + ' · ' + (w.fromTeam ? '别人的愿望' : '我写的') + from + '</span>'
        + U.esc(w.text) + '</div>';
    });
    // 补几个空位，让「愿望墙」看起来是块墙而不是一条
    for (let i = rows.length; i < 4; i++) rows.push('<div class="wish-row is-empty">空位 · 还没写下</div>');
    return '<div class="wish-list">' + rows.join('') + '</div>';
  }

  function render() {
    const box = body();
    if (!box) return;
    const w = currentWish();
    box.innerHTML = ''
      + '<div class="wish-in">'
      + '<div class="wish-lot">'
      + '<button class="btn btn--sm btn--lemon" type="button" data-act="lot">摇一条愿望</button>'
      + '<div class="wish-lot__slot" id="wishSlot"><span>今天想许什么？先摇一条，再改成自己的话。</span></div>'
      + '</div>'
      + '<div class="wish__l">'
      + '<textarea class="textarea" id="wishText" maxlength="60" style="min-height:64px" placeholder="写给一年后的自己，60 字以内。比如：希望明年的今天，我还在写代码。"></textarea>'
      + '<div class="row">'
      + '<button class="btn btn--main" data-act="seal">封存这句话</button>'
      + '<button class="btn" data-act="export">生成愿望卡</button>'
      + '<span style="flex:1"></span>'
      + '<span class="note" id="wishCount">0 / 60</span>'
      + '</div>'
      + '</div>'
      + '<div class="wish__r">'
      + '<div id="wishCard">' + card(w) + '</div>'
      + '</div>'
      + '<div class="wish-hist">'
      + '<div class="sect__h">封存记录</div>'
      + '<div id="wishList">' + list() + '</div>'
      + '<div class="note" style="margin-top:6px">这里不预测任何结果，只是把话存下来，明年再来看。祝福语按「工号 + 愿望」确定性生成，同一句话永远是同一句祝福。</div>'
      + '</div>'
      + '</div>';

    const ta = $('#wishText');
    if (ta) {
      ta.addEventListener('input', () => {
        const n = $('#wishCount');
        if (n) n.textContent = ta.value.length + ' / 60';
      });
    }
    if (!box.dataset.bound) {
      box.dataset.bound = '1';
      box.addEventListener('click', onClick);
    }
  }

  function onClick(e) {
    const act = e.target.closest('[data-act]');
    if (!act) return;

    // 摇一条：滚动 10 帧后落定，写进输入框，用户可以改
    if (act.dataset.act === 'lot') {
      const slot = $('#wishSlot');
      const ta = $('#wishText');
      const land = (text) => {
        if (slot) { slot.classList.remove('is-rolling'); slot.innerHTML = '<span>' + U.esc(text) + '</span>'; }
        if (ta) { ta.value = text; ta.dispatchEvent(new Event('input')); }
        U.toast('换一条试试，或者自己改几个字');
      };
      if (!slot || reduceMotion()) { land(pickOne()); return; }
      let n = 0;
      slot.classList.add('is-rolling');
      clearInterval(lotTimer);
      lotTimer = setInterval(function () {
        slot.innerHTML = '<span>' + U.esc(pickOne()) + '</span>';
        if (++n > 10) { clearInterval(lotTimer); lotTimer = 0; land(pickOne()); }
      }, 60);
      return;
    }

    if (act.dataset.act === 'seal') {
      const ta = $('#wishText');
      const text = (ta && ta.value || '').trim();
      if (!text) { U.toast('先写一句话', 'warn'); return; }
      if (APP.state.num == null) { U.toast('先去「我的程序员设」领个工号，愿望才好封存', 'warn'); return; }
      draft = { text: text.slice(0, 60), blessing: U.blessFor(APP.state.num, text), num: APP.state.num, ts: Date.now() };
      APP.state.wishes.push(draft);
      U.save();
      const c = $('#wishCard'); if (c) c.innerHTML = card(draft);
      const l = $('#wishList'); if (l) l.innerHTML = list();
      if (ta) ta.value = '';
      const n = $('#wishCount'); if (n) n.textContent = '0 / 60';
      U.toast('已封存。明年今天再来看。');
      return;
    }
    if (act.dataset.act === 'export') {
      const w = currentWish();
      if (!w) { U.toast('先封存一句话', 'warn'); return; }
      const d = new Date(w.ts || Date.now());
      const cv = APP.exporter.drawWish({
        no: w.num != null ? U.pad(w.num, 4) : '----',
        date: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
        text: w.text, blessing: w.blessing
      });
      APP.exporter.save(cv, '1024-wish-' + (w.num != null ? U.pad(w.num, 4) : '0000') + '.png');
    }
  }

  APP.scenes.wish = {
    render,
    refresh() { const c = $('#wishCard'); if (c) c.innerHTML = card(currentWish()); const l = $('#wishList'); if (l) l.innerHTML = list(); },
    onOpen() { render(); },
    onClose() { clearInterval(lotTimer); lotTimer = 0; }
  };
})();
