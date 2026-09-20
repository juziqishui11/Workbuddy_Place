const app = getApp();
const source = require('../../utils/source.js');
const store = require('../../utils/store.js');

// 抽卡权重：隐藏款难抽，常规款常见；未拥有会额外加权，帮助推进图鉴
const RARITY_WEIGHT = {
  '隐藏': 0.6, '大娃': 2, 'MEGA': 2, '传说': 2, '幻之': 2, '常规': 10
};

function todayStr() {
  const d = new Date();
  const m = ('0' + (d.getMonth() + 1)).slice(-2);
  const day = ('0' + d.getDate()).slice(-2);
  return d.getFullYear() + '-' + m + '-' + day;
}

Page({
  data: {
    ip: 'popmart',
    brand: '',
    unit: '娃',
    accent: '#FF7BAC',
    accent2: '#9B6BFF',
    seriesList: [],
    selectedSeries: '',
    results: [],
    flipping: false,
    pulling: false,
    drawCount: 0,
    lastNew: 0
  },

  onLoad: function (q) {
    this._initSeries = (q && q.series) ? q.series : '';
    this.refresh();
  },

  onShow: function () {
    if (this.data.ip !== app.getIp()) this.refresh();
  },

  refresh: function () {
    const ip = app.getIp();
    const src = source.getSource(ip);
    const meta = source.getMeta(ip);
    const seriesList = src.series.map(function (s) { return { id: s.id, name: s.name }; });
    const cur = this._initSeries || this.data.selectedSeries;
    const selValid = seriesList.some(function (x) { return x.id === cur; });
    const selectedSeries = selValid ? cur : (seriesList[0] ? seriesList[0].id : '');
    this._initSeries = '';
    this.setData({
      ip: ip, brand: meta.brand, unit: meta.unit, accent: meta.accent, accent2: meta.accent2,
      seriesList: seriesList, selectedSeries: selectedSeries, results: []
    });
  },

  selectSeries: function (e) {
    this.setData({ selectedSeries: e.currentTarget.dataset.id });
  },

  buildPool: function () {
    const ip = this.data.ip;
    const src = source.getSource(ip);
    const sel = this.data.selectedSeries;
    const pool = [];
    src.series.forEach(function (ser) {
      if (sel && ser.id !== sel) return;
      ser.figures.forEach(function (f) {
        pool.push({ seriesId: ser.id, seriesName: ser.name, figure: f });
      });
    });
    return pool;
  },

  // 加权随机抽 n 张（一包内尽量不重复）
  draw: function (n) {
    const self = this;
    const pool = this.buildPool();
    if (!pool.length) return [];
    const ownedSet = {};
    store.getCollection().forEach(function (c) {
      if (c.own && c.ip === self.data.ip) ownedSet[c.seriesId + '/' + c.figureId] = true;
    });
    const weighted = pool.map(function (p) {
      let w = RARITY_WEIGHT[p.figure.rarity] || 10;
      if (!ownedSet[p.seriesId + '/' + p.figure.id]) w *= 4; // 未拥有加权，推进图鉴
      return { p: p, w: w };
    });
    const out = [];
    const used = {};
    let guard = 0;
    while (out.length < n && guard < 300) {
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
    const self = this;
    const f = pick.figure;
    const rm = source.rarityMeta(f.rarity);
    const existing = store.findRecord(self.data.ip, pick.seriesId, f.id);
    const isNew = !(existing && existing.own);
    store.upsert({
      ip: self.data.ip,
      seriesId: pick.seriesId,
      figureId: f.id,
      own: true,
      wish: existing ? existing.wish : false,
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
      name: f.name, sub: f.sub || '', emoji: f.emoji || '🧸', color: f.color || '#EEE',
      rarity: f.rarity, rarityLabel: rm.label, rarityColor: rm.color, rarityBg: rm.bg,
      isNew: isNew, owned: true
    };
  },

  doDraw: function (e) {
    const self = this;
    if (this.data.pulling) return;
    const n = Number(e.currentTarget.dataset.n) || 1;
    this.setData({ pulling: true, flipping: true, results: [] });
    const picks = this.draw(n);
    const results = picks.map(function (p) { return self.lightUp(p); });
    const newCount = results.filter(function (r) { return r.isNew; }).length;
    setTimeout(function () {
      self.setData({
        results: results, flipping: false, pulling: false,
        drawCount: self.data.drawCount + n, lastNew: newCount
      });
    }, 650);
  },

  addWish: function (e) {
    const self = this;
    const idx = e.currentTarget.dataset.idx;
    const r = this.data.results[idx];
    const existing = store.findRecord(this.data.ip, r.seriesId, r.figureId);
    store.upsert({
      ip: this.data.ip, seriesId: r.seriesId, figureId: r.figureId,
      own: existing ? existing.own : false, wish: true,
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
    wx.navigateTo({ url: '/pages/detail/detail?ip=' + this.data.ip + '&seriesId=' + r.seriesId + '&figureId=' + r.figureId });
  }
});
