const app = getApp();
const source = require('../../utils/source.js');
const store = require('../../utils/store.js');

Page({
  data: { ip: '', meta: {}, stat: {}, progress: [], total: 0, completion: 0 },

  onShow: function () {
    const ip = app.getIp();
    const meta = source.getMeta(ip);
    const stat = store.stats(ip);
    const coll = store.getCollection();
    const progress = source.progressFor(ip, coll);
    const total = source.totalFigures(ip);
    const completion = total ? Math.round((stat.ownedCount / total) * 100) : 0;

    const byRarity = Object.keys(stat.byRarity).map(function (k) {
      const rm = source.rarityMeta(k);
      return { name: rm.label, count: stat.byRarity[k], color: rm.color, bg: rm.bg };
    });

    wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: meta.accent });
    wx.setNavigationBarTitle({ title: meta.brand + ' · 统计' });
    this.setData({ ip: ip, meta: meta, stat: stat, progress: progress, total: total, completion: completion, byRarity: byRarity });
  }
});
