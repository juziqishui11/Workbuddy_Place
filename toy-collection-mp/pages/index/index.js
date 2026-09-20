const app = getApp();
const source = require('../../utils/source.js');
const store = require('../../utils/store.js');

Page({
  data: {
    ip: '', meta: {}, owned: [], total: 0,
    ownedCount: 0, wishCount: 0, totalValue: 0, completion: 0
  },

  onShow: function () { this.refresh(); },

  refresh: function () {
    const ip = app.getIp();
    const meta = source.getMeta(ip);
    const ownedRaw = store.ownedList(ip);
    const owned = ownedRaw.map(function (r) { return source.enrich(ip, r); }).filter(Boolean);
    const total = source.totalFigures(ip);
    const stat = store.stats(ip);
    const completion = total ? Math.round((owned.length / total) * 100) : 0;

    wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: meta.accent });
    wx.setNavigationBarTitle({ title: meta.brand + ' · 娃柜' });

    this.setData({
      ip: ip, meta: meta, owned: owned, total: total,
      ownedCount: stat.ownedCount, wishCount: stat.wishCount,
      totalValue: stat.totalValue, completion: completion
    });
  },

  goDetail: function (e) {
    const d = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/detail/detail?ip=' + d.ip + '&seriesId=' + d.series + '&figureId=' + d.figure });
  },

  goAdd: function () { wx.navigateTo({ url: '/pages/add/add' }); },

  goGacha: function () { wx.navigateTo({ url: '/pages/gacha/gacha' }); }
});
