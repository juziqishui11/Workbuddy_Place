const app = getApp();
const source = require('../../utils/source.js');
const store = require('../../utils/store.js');

Page({
  data: {
    ip: '', meta: {}, series: [], showMissing: false
  },

  onShow: function () { this.refresh(); },

  refresh: function () {
    const ip = app.getIp();
    const meta = source.getMeta(ip);
    const src = source.getSource(ip);
    const coll = store.getCollection();
    const prog = source.progressFor(ip, coll);

    const series = src.series.map(function (ser, i) {
      const p = prog[i];
      const figures = ser.figures.map(function (f) {
        const rec = coll.find(function (c) {
          return c.ip === ip && c.seriesId === ser.id && c.figureId === f.id;
        });
        const rm = source.rarityMeta(f.rarity);
        return {
          figureId: f.id, code: f.code, name: f.name, emoji: f.emoji, color: f.color,
          rarity: f.rarity, rarityLabel: rm.label, rarityColor: rm.color, rarityBg: rm.bg,
          owned: !!(rec && rec.own), wish: !!(rec && rec.wish)
        };
      });
      return {
        seriesId: ser.id, name: ser.name, desc: ser.desc,
        total: p.total, owned: p.owned, wish: p.wish, percent: p.percent,
        open: i === 0, figures: figures
      };
    });

    wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: meta.accent });
    wx.setNavigationBarTitle({ title: meta.brand + ' · 图鉴' });
    this.setData({ ip: ip, meta: meta, series: series });
  },

  toggle: function (e) {
    const i = e.currentTarget.dataset.i;
    const key = 'series[' + i + '].open';
    this.setData({ [key]: !this.data.series[i].open });
  },

  toggleMissing: function () {
    this.setData({ showMissing: !this.data.showMissing });
  },

  goFigure: function (e) {
    const d = e.currentTarget.dataset;
    const base = '/pages/' + (d.owned === 'true' ? 'detail/detail' : 'add/add');
    wx.navigateTo({ url: base + '?ip=' + this.data.ip + '&seriesId=' + d.series + '&figureId=' + d.figure });
  }
});
