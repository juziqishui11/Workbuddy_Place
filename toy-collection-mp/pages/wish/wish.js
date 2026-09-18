const app = getApp();
const source = require('../../utils/source.js');
const store = require('../../utils/store.js');

Page({
  data: { ip: '', meta: {}, list: [] },

  onShow: function () {
    const ip = app.getIp();
    const meta = source.getMeta(ip);
    const list = store.wishList(ip).map(function (r) { return source.enrich(ip, r); }).filter(Boolean);
    wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: meta.accent });
    wx.setNavigationBarTitle({ title: meta.brand + ' · 心愿单' });
    this.setData({ ip: ip, meta: meta, list: list });
  },

  markOwned: function (e) {
    const d = e.currentTarget.dataset;
    store.upsert({ ip: this.data.ip, seriesId: d.series, figureId: d.figure, own: true, wish: false, rarity: d.rarity });
    wx.showToast({ title: '已入手 🎉', icon: 'success' });
    this.onShow();
  },

  remove: function (e) {
    const d = e.currentTarget.dataset;
    const self = this;
    wx.showModal({
      title: '移除心愿', content: '确定从心愿单移除？',
      success: function (r) {
        if (r.confirm) { store.remove(self.data.ip, d.series, d.figure); self.onShow(); }
      }
    });
  }
});
