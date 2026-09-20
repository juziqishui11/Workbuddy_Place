const source = require('../../utils/source.js');
const store = require('../../utils/store.js');

Page({
  data: {
    meta: {}, seriesList: [], active: 'kanto',
    total: 0, owned: 0, percent: 0, barW: '0%',
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
      // 只下发模板真正用到的字段：dex.wxml 用 owned/seriesId/figureId/img/name/code，
      // sprite 供图片加载失败时兜底（onImgErr）。原来 16 个字段 → 7 个，
      // setData 载荷 86.5KB → 约 20KB（151 条时），减少序列化与渲染压力。
      return {
        seriesId: ser.id, figureId: f.id, code: f.code, name: f.name,
        sprite: f.sprite, owned: !!(rec && rec.own),
        img: source.figureImage(f)
      };
    });
    const owned = figures.filter(function (f) { return f.owned; }).length;
    const total = figures.length;
    const percent = total ? Math.round((owned / total) * 100) : 0;
    this.setData({
      total: total, owned: owned, percent: percent,
      barW: percent + '%',
      figures: figures, accent: meta.accent, accent2: meta.accent2
    });
    this.setNavTitle('卡册 · ' + ser.name.split(' ')[0]);
  },

  // 切系列时 wx.setNavigationBarTitle 的异步回调可能乱序返回，
  // 导致标题停留在上一个系列名。用递增序号把标题收敛到最新一次调用。
  setNavTitle: function (title) {
    const self = this;
    this._navTitle = title;
    const seq = (this._navSeq = (this._navSeq || 0) + 1);
    wx.setNavigationBarTitle({
      title: title,
      complete: function () {
        if (seq !== self._navSeq) wx.setNavigationBarTitle({ title: self._navTitle });
      }
    });
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
