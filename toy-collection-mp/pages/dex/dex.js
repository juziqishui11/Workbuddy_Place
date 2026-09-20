const source = require('../../utils/source.js');
const store = require('../../utils/store.js');

Page({
  data: {
    meta: {}, seriesList: [], active: 'kanto',
    total: 0, owned: 0, percent: 0,
    figures: [], showMissing: false, accent: '#3B7DDD', accent2: '#FFCB05'
  },

  onLoad: function () {
    const meta = source.getMeta();
    const list = meta.series.map(function (s) { return { id: s.id, name: s.name }; });
    this.setData({ meta: meta, seriesList: list, accent: meta.accent, accent2: meta.accent2 });
  },

  onShow: function () { this.refresh(); },

  switchSeries: function (e) {
    this.setData({ active: e.currentTarget.dataset.id });
    this.refresh();
  },

  refresh: function () {
    const meta = source.getMeta();
    const src = source.getSource();
    const coll = store.getCollection();
    const ser = src.series.find(function (s) { return s.id === this.data.active; }.bind(this)) || src.series[0];
    const figures = ser.figures.map(function (f) {
      const rec = coll.find(function (c) { return c.seriesId === ser.id && c.figureId === f.id; });
      const rm = source.rarityMeta(f.rarity);
      return {
        seriesId: ser.id, figureId: f.id, code: f.code, name: f.name, sub: f.sub,
        tcgArt: source.figureImage(f), sprite: f.sprite, art: f.art, color: f.color,
        rarity: f.rarity, rarityLabel: rm.label, rarityColor: rm.color, rarityBg: rm.bg,
        owned: !!(rec && rec.own), wish: !!(rec && rec.wish),
        img: source.figureImage(f)
      };
    });
    const owned = figures.filter(function (f) { return f.owned; }).length;
    const total = figures.length;
    this.setData({
      total: total, owned: owned,
      percent: total ? Math.round((owned / total) * 100) : 0,
      figures: figures, accent: meta.accent, accent2: meta.accent2
    });
    wx.setNavigationBarTitle({ title: '卡册 · ' + ser.name.split(' ')[0] });
  },

  toggleMissing: function () { this.setData({ showMissing: !this.data.showMissing }); },

  goFigure: function (e) {
    const d = e.currentTarget.dataset;
    const base = '/pages/' + (d.owned === 'true' ? 'detail/detail' : 'add/add');
    wx.navigateTo({ url: base + '?seriesId=' + d.series + '&figureId=' + d.figure });
  },

  onImgErr: function (e) {
    const i = e.currentTarget.dataset.i;
    const key = 'figures[' + i + '].img';
    this.setData({ [key]: this.data.figures[i].sprite });
  }
});
