const source = require('../../utils/source.js');
const store = require('../../utils/store.js');

Page({
  data: {
    meta: {}, ownedCount: 0, wishCount: 0, completion: 0, total: 0,
    accent: '#3B7DDD', accent2: '#FFCB05'
  },

  onShow: function () {
    const meta = source.getMeta();
    const total = source.totalFigures();
    const stat = store.stats();
    const completion = total ? Math.round(stat.ownedCount / total * 100) : 0;

    wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: meta.accent });
    wx.setNavigationBarTitle({ title: '我的' });

    this.setData({
      meta: meta, ownedCount: stat.ownedCount, wishCount: stat.wishCount,
      completion: completion, total: total,
      accent: meta.accent, accent2: meta.accent2
    });
  },

  clearData: function () {
    const self = this;
    wx.showModal({
      title: '清空全部收藏',
      content: '将删除本地所有收藏与心愿记录，且不可恢复。确定吗？',
      confirmColor: '#EF4444',
      success: function (r) {
        if (r.confirm) {
          store.clearAll();
          wx.showToast({ title: '已清空', icon: 'none' });
          self.onShow();
        }
      }
    });
  },

  copyRepo: function () {
    wx.setClipboardData({ data: 'https://github.com/juziqishui11/Workbuddy_Place/tree/main/toy-collection-mp' });
  }
});
