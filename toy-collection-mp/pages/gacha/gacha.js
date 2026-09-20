const source = require('../../utils/source.js');
const store = require('../../utils/store.js');

// 抽卡权重：普通款常见，传说/幻之稀有；未拥有加权，帮助推进图鉴
const RARITY_WEIGHT = { '普通': 10, '传说': 1.4, '幻之': 0.5 };

function todayStr() {
  const d = new Date();
  const m = ('0' + (d.getMonth() + 1)).slice(-2);
  const day = ('0' + d.getDate()).slice(-2);
  return d.getFullYear() + '-' + m + '-' + day;
}

Page({
  data: {
    meta: {}, accent: '#3B7DDD', accent2: '#FFCB05',
    results: [], flipping: false, pulling: false,
    drawCount: 0, lastNew: 0, packSize: 5
  },

  onShow: function () {
    const meta = source.getMeta();
    wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: meta.accent });
    wx.setNavigationBarTitle({ title: '开包模拟' });
    this.setData({ meta: meta, accent: meta.accent, accent2: meta.accent2 });
  },

  buildPool: function () {
    const src = source.getSource();
    const pool = [];
    src.series.forEach(function (ser) {
      ser.figures.forEach(function (f) {
        pool.push({ seriesId: ser.id, seriesName: ser.name, figure: f });
      });
    });
    return pool;
  },

  // 加权随机抽 n 张（一包内尽量不重复）
  draw: function (n) {
    const pool = this.buildPool();
    if (!pool.length) return [];
    const ownedSet = {};
    store.getCollection().forEach(function (c) {
      if (c.own) ownedSet[c.seriesId + '/' + c.figureId] = true;
    });
    const weighted = pool.map(function (p) {
      let w = RARITY_WEIGHT[p.figure.rarity] || 10;
      if (!ownedSet[p.seriesId + '/' + p.figure.id]) w *= 4; // 未拥有加权，推进图鉴
      return { p: p, w: w };
    });
    const out = [];
    const used = {};
    let guard = 0;
    while (out.length < n && guard < 400) {
      guard++;
      let total = 0;
      weighted.forEach(function (x) {
        const key = x.p.seriesId + '/' + x.p.figure.id;
        if (!used[key]) total += x.w;
      });
      if (total <= 0) break;
      let r = Math.random() * total;
      let pick = null;
      for (let i = 0; i < weighted.length; i++) {
        const x = weighted[i];
        const key = x.p.seriesId + '/' + x.p.figure.id;
        if (used[key]) continue;
        r -= x.w;
        if (r <= 0) { pick = x.p; break; }
      }
      if (!pick) break;
      if (n > 1) used[pick.seriesId + '/' + pick.figure.id] = true;
      out.push(pick);
    }
    return out;
  },

  // 把抽到的 figure 转成展示结果并点亮收藏
  lightUp: function (pick) {
    const f = pick.figure;
    const rm = source.rarityMeta(f.rarity);
    const existing = store.findRecord(pick.seriesId, f.id);
    const isNew = !(existing && existing.own);
    store.upsert({
      seriesId: pick.seriesId, figureId: f.id,
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
    return {
      seriesId: pick.seriesId, seriesName: pick.seriesName, figureId: f.id,
      name: f.name, code: f.code, sub: f.sub || '', color: f.color || '#EEE',
      sprite: f.sprite, art: f.art, img: f.sprite,
      rarity: f.rarity, rarityLabel: rm.label, rarityColor: rm.color, rarityBg: rm.bg,
      isNew: isNew, owned: true
    };
  },

  doDraw: function () {
    const self = this;
    if (this.data.pulling) return;
    const n = this.data.packSize;
    this.setData({ pulling: true, flipping: true, results: [] });
    const picks = this.draw(n);
    const results = picks.map(function (p) { return self.lightUp(p); });
    const newCount = results.filter(function (r) { return r.isNew; }).length;
    setTimeout(function () {
      self.setData({
        results: results, flipping: false, pulling: false,
        drawCount: self.data.drawCount + n, lastNew: newCount
      });
    }, 750);
  },

  addWish: function (e) {
    const idx = e.currentTarget.dataset.idx;
    const r = this.data.results[idx];
    const existing = store.findRecord(r.seriesId, r.figureId);
    store.upsert({
      seriesId: r.seriesId, figureId: r.figureId,
      own: existing ? existing.own : false, wish: true, rarity: r.rarity,
      buyPrice: existing ? existing.buyPrice : 0, curValue: existing ? existing.curValue : 0,
      acquiredAt: existing && existing.acquiredAt ? existing.acquiredAt : todayStr(),
      condition: existing && existing.condition ? existing.condition : '全新',
      note: existing && existing.note ? existing.note : '',
      photo: existing && existing.photo ? existing.photo : '',
      createdAt: existing && existing.createdAt ? existing.createdAt : new Date().toISOString()
    });
    wx.showToast({ title: '已加入心愿 ♡', icon: 'success' });
  },

  goDetail: function (e) {
    const idx = e.currentTarget.dataset.idx;
    const r = this.data.results[idx];
    wx.navigateTo({ url: '/pages/detail/detail?seriesId=' + r.seriesId + '&figureId=' + r.figureId });
  },

  onImgErr: function (e) {
    const i = e.currentTarget.dataset.i;
    const key = 'results[' + i + '].img';
    this.setData({ [key]: this.data.results[i].art });
  }
});
