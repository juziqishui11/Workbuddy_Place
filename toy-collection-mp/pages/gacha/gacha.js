const source = require('../../utils/source.js');
const store = require('../../utils/store.js');

// 抽卡权重：普通款常见，传说/幻之稀有；未拥有加权，帮助推进图鉴
const RARITY_WEIGHT = { '普通': 10, '传说': 1.4, '幻之': 0.5 };
// 特殊形态卡的权重（比基础卡稀有）
// ⚠️ key 必须与 utils/source.js `cardForm()` 的返回值逐字一致 ——
//    VMAX 卡的形态标签是「极巨化」（不是 "VMAX"），写错会让整类卡静默走默认权重、且拿不到闪光特效。
const FORM_WEIGHT = {
  'EX': 4, 'MEGA': 3, 'GX': 3, 'V': 3, '极巨化': 2, '光辉': 2,
  'LV.X': 2.5, 'δ': 2, '暗之': 2
};
// 这些形态卡触发高级闪光（彩虹旋转边框 + 内部闪光）
const PREMIUM_FORMS = { '极巨化': 1, 'MEGA': 1, '光辉': 1, 'GX': 1 };
// 触发光边特效：传说、幻之、PREMIUM 形态、EX、V
const GLOW_FORMS = { 'EX': 1, 'V': 1, '极巨化': 1, 'MEGA': 1, '光辉': 1, 'GX': 1, 'LV.X': 1 };
const PACK_SIZE = 5;

function todayStr() {
  const d = new Date();
  const m = ('0' + (d.getMonth() + 1)).slice(-2);
  const day = ('0' + d.getDate()).slice(-2);
  return d.getFullYear() + '-' + m + '-' + day;
}

Page({
  data: {
    meta: {}, seriesList: [], active: 'all',
    accent: '#3B7DDD', accent2: '#FFCB05', packSize: PACK_SIZE,
    // idle / tearing / opened / flying / done
    state: 'idle',
    packName: '全图鉴卡包',
    packColor1: '#3B7DDD', packColor2: '#FFCB05',
    // 撕卡包
    tearProgress: 0,
    packSealStyle: '',
    packInnerStyle: '',
    packGlow: 0,
    // 抽到的卡
    cards: [],
    appear: [], flipped: [],
    lastNew: 0,
    hasPremium: false,
    zoomCard: null
  },

  onShow: function () {
    const meta = source.getMeta();
    const list = [{ id: 'all', name: '全图鉴' }].concat(meta.series.map(function (s) { return { id: s.id, name: s.name.split(' ')[0] }; }));
    wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: meta.accent });
    wx.setNavigationBarTitle({ title: '开包模拟' });
    this.setData({ meta: meta, seriesList: list, accent: meta.accent, accent2: meta.accent2 });
    this.updatePackStyle();
  },

  onUnload: function () {
    if (this._flyTimer) clearTimeout(this._flyTimer);
  },

  switchSeries: function (e) {
    if (this.data.state !== 'idle') return;
    this.setData({ active: e.currentTarget.dataset.id });
    this.updatePackStyle();
  },

  updatePackStyle: function () {
    const active = this.data.active;
    const meta = this.data.meta;
    let name = '全图鉴卡包';
    if (active !== 'all' && meta.series) {
      const s = meta.series.find(function (x) { return x.id === active; });
      if (s) name = s.name.split(' ')[0] + '卡包';
    }
    this.setData({ packName: name });
  },

  // ===== 抽卡池：基础卡 + 特殊形态卡（EX/MEGA/V/VMAX/光辉 等）=====
  buildPool: function () {
    const src = source.getSource();
    const pool = [];
    src.series.forEach(function (ser) {
      if (this.data.active !== 'all' && ser.id !== this.data.active) return;
      ser.figures.forEach(function (f) {
        const main = source.mainCard(f);
        const baseImg = (main && main.img) || source.figureImage(f);
        pool.push({ seriesId: ser.id, seriesName: ser.name, figure: f, form: null, img: baseImg, rarity: f.rarity });
        source.cardVersions(f).forEach(function (v) {
          if (v.form) pool.push({ seriesId: ser.id, seriesName: ser.name, figure: f, form: v.form, img: v.img, rarity: v.rarity || f.rarity });
        });
      }.bind(this));
    }.bind(this));
    return pool;
  },

  // 加权随机抽 n 张（一包内尽量不重复），并保证至少 1 张特殊形态卡
  draw: function (n) {
    const raw = this.buildPool();
    if (!raw.length) return [];
    const ownedSet = {};
    store.getCollection().forEach(function (c) { if (c.own) ownedSet[c.seriesId + '/' + c.figureId] = true; });
    const items = raw.map(function (p) {
      let w = p.form ? (FORM_WEIGHT[p.form] || 2.5) : (RARITY_WEIGHT[p.figure.rarity] || 10);
      if (!ownedSet[p.seriesId + '/' + p.figure.id]) w *= 4; // 未拥有加权
      const key = p.seriesId + '/' + p.figure.id + '/' + (p.form || 'base');
      return Object.assign({}, p, { w: w, key: key });
    });
    const out = [];
    const used = {};
    let guard = 0;
    while (out.length < n && guard < 600) {
      guard++;
      let total = 0;
      items.forEach(function (x) { if (!used[x.key]) total += x.w; });
      if (total <= 0) break;
      let r = Math.random() * total;
      let pick = null;
      for (let i = 0; i < items.length; i++) {
        const x = items[i];
        if (used[x.key]) continue;
        r -= x.w;
        if (r <= 0) { pick = x; break; }
      }
      if (!pick) break;
      used[pick.key] = true;
      out.push(pick);
    }
    // 保底：本包至少出现 1 张特殊形态卡（若池子里有）
    if (!out.some(function (o) { return o.form; })) {
      const forms = items.filter(function (it) { return it.form && !used[it.key]; });
      if (forms.length) {
        const rep = forms[Math.floor(Math.random() * forms.length)];
        used[rep.key] = true;
        out[out.length - 1] = rep;
      }
    }
    return out;
  },

  lightUp: function (entry) {
    const f = entry.figure;
    const rm = source.rarityMeta(entry.rarity || f.rarity);
    const existing = store.findRecord(entry.seriesId, f.id);
    const isNew = !(existing && existing.own);
    store.upsert({
      seriesId: entry.seriesId, figureId: f.id,
      own: true, wish: existing ? existing.wish : false,
      rarity: f.rarity,
      buyPrice: existing ? existing.buyPrice : 0,
      curValue: existing ? existing.curValue : 0,
      acquiredAt: existing && existing.acquiredAt ? existing.acquiredAt : todayStr(),
      condition: existing && existing.condition ? existing.condition : '全新',
      note: existing && existing.note ? existing.note : '',
      photo: existing && existing.photo ? existing.photo : '',
      createdAt: existing && existing.createdAt ? existing.createdAt : new Date().toISOString()
    });
    // 显式转布尔：直接写 `a || (b && MAP[k])` 会返回 1 / undefined 这类非布尔值，
    // 虽能过 wx:if 的 truthy 判断，但会让 JSON 里出现 undefined、也难断言。
    const premium = !!(entry.rarity === '传说' || entry.rarity === '幻之' || (entry.form && PREMIUM_FORMS[entry.form]));
    const glow = !!(premium || (entry.form && GLOW_FORMS[entry.form]));
    return {
      seriesId: entry.seriesId, seriesName: entry.seriesName, figureId: f.id,
      name: f.name, code: f.code, sub: f.sub || '', color: f.color || '#EEE',
      // wx:key 用：与 draw() 的去重键一致（seriesId/figureId/form），列表内唯一
      uid: entry.seriesId + '/' + f.id + '/' + (entry.form || 'base'),
      img: entry.img, sprite: f.sprite, art: f.art,
      rarity: entry.rarity, rarityLabel: rm.label, rarityColor: rm.color, rarityBg: rm.bg,
      form: entry.form || '', formImg: entry.form ? entry.img : '',
      isNew: isNew, owned: true, premium: premium, glow: glow
    };
  },

  // ===== 撕卡包手势：按住顶部封条，从左往右横撕（左上 → 右上）=====
  packTouchStart: function (e) {
    if (this.data.state !== 'idle') return;
    const t = e.touches[0];
    this._tearStart = { x: t.clientX, y: t.clientY };
    this.setData({ tearProgress: 0, packSealStyle: '', packInnerStyle: '', packGlow: 0 });
  },
  packTouchMove: function (e) {
    if (!this._tearStart || this.data.state !== 'idle') return;
    const t = e.touches[0];
    const dx = t.clientX - this._tearStart.x;
    // 只认「向右」的横向撕拉；纵向位移不参与进度，避免横撕时封条上下乱跳
    if (dx < 6) return;
    const max = 240; // 横向撕拉阈值（px）
    const s = Math.min(1, Math.abs(dx) / max);
    const rot = -s * 6;   // 右端微微上翘，像把封条掀起来
    const tx = s * 440;   // 顺着滑向划出卡包右边缘
    const ty = -s * 24;   // 抬起一点点，形成「撕离」的层次感
    this.setData({
      tearProgress: s,
      packGlow: s,
      packSealStyle: 'transform: translate(' + tx + 'rpx, ' + ty + 'rpx) rotate(' + rot + 'deg); opacity:' + (1 - s * 0.85) + ';',
      packInnerStyle: 'transform: scale(' + (1 + s * 0.06) + '); opacity:' + (0.2 + s * 0.8) + ';'
    });
  },
  packTouchEnd: function () {
    if (!this._tearStart) return;
    const s = this.data.tearProgress;
    this._tearStart = null;
    if (s > 0.55) this.openPack();
    else this.setData({ tearProgress: 0, packSealStyle: '', packInnerStyle: '', packGlow: 0 });
  },

  // 点击卡包也作为兜底开包方式
  openPack: function () {
    if (this.data.state !== 'idle') return;
    const self = this;
    const picks = this.draw(PACK_SIZE);
    const cards = picks.map(function (p) { return self.lightUp(p); });
    const newCount = cards.filter(function (c) { return c.isNew; }).length;
    const hasPremium = cards.some(function (c) { return c.premium || c.glow; });
    this.setData({
      state: 'tearing',
      cards: cards,
      appear: cards.map(function () { return false; }),
      flipped: cards.map(function () { return false; }),
      lastNew: newCount,
      hasPremium: hasPremium,
      tearProgress: 1,
      packGlow: 1,
      packSealStyle: 'transform: translate(470rpx, -34rpx) rotate(-9deg); opacity:0;',
      packInnerStyle: 'transform: scale(1.12); opacity:1;'
    });
    setTimeout(function () { self.setData({ state: 'opened' }); self.startFlying(); }, 520);
  },

  // 竖排、一张张飞入并翻开（使用 opacity 切换，避免小程序 3D 翻转兼容问题）
  startFlying: function () {
    if (this.data.state === 'done') return;
    this.setData({ state: 'flying' });
    const self = this;
    const n = this.data.cards.length;
    let i = 0;
    function step() {
      if (i >= n) { setTimeout(function () { self.setData({ state: 'done' }); }, 720); return; }
      // ⚠️ 必须把序号捕获成 idx：内层 setTimeout 在 340ms 后才执行，
      //    那时 i 早已 i++ 自增 → flipped[i + 1]，导致 flipped[0] 永远为 false，
      //    第 1 张卡停在卡背（蓝青渐变 + 斜纹）翻不开，且整体翻牌错位一张。
      const idx = i;
      const appear = self.data.appear.slice();
      appear[idx] = true;
      self.setData({ appear: appear });
      setTimeout(function () {
        const flipped = self.data.flipped.slice();
        flipped[idx] = true;
        self.setData({ flipped: flipped });
      }, 340);
      i++;
      self._flyTimer = setTimeout(step, 520);
    }
    step();
  },

  onCardTap: function (e) {
    const idx = e.currentTarget.dataset.i;
    const cards = this.data.cards;
    if (!cards[idx]) return;
    this.setData({ zoomCard: cards[idx] });
  },

  closeZoom: function () { this.setData({ zoomCard: null }); },
  noop: function () {},

  goDetailFromZoom: function () {
    const z = this.data.zoomCard;
    if (!z) return;
    this.setData({ zoomCard: null });
    wx.navigateTo({ url: '/pages/detail/detail?seriesId=' + z.seriesId + '&figureId=' + z.figureId });
  },

  addWishFromZoom: function () {
    const z = this.data.zoomCard;
    if (!z) return;
    const existing = store.findRecord(z.seriesId, z.figureId);
    store.upsert({
      seriesId: z.seriesId, figureId: z.figureId,
      own: existing ? existing.own : false, wish: true, rarity: z.rarity,
      buyPrice: existing ? existing.buyPrice : 0, curValue: existing ? existing.curValue : 0,
      acquiredAt: existing && existing.acquiredAt ? existing.acquiredAt : todayStr(),
      condition: existing && existing.condition ? existing.condition : '全新',
      note: existing && existing.note ? existing.note : '',
      photo: existing && existing.photo ? existing.photo : '',
      createdAt: existing && existing.createdAt ? existing.createdAt : new Date().toISOString()
    });
    wx.showToast({ title: '已加入心愿 ♡', icon: 'success' });
  },

  openAnother: function () {
    if (this._flyTimer) clearTimeout(this._flyTimer);
    this.setData({
      state: 'idle', cards: [], appear: [], flipped: [],
      tearProgress: 0, packSealStyle: '', packInnerStyle: '', packGlow: 0,
      hasPremium: false, zoomCard: null
    });
  },

  onImgErr: function (e) {
    const i = e.currentTarget.dataset.i;
    const key = 'cards[' + i + '].img';
    const c = this.data.cards[i];
    if (c) this.setData({ [key]: c.sprite || c.art });
  }
});
