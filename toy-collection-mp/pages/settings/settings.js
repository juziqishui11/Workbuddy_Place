const app = getApp();
const source = require('../../utils/source.js');
const store = require('../../utils/store.js');

Page({
  data: { ip: '', meta: {}, ips: [] },

  onShow: function () {
    const ip = app.getIp();
    const meta = source.getMeta(ip);
    const ips = source.listIPs();
    wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: meta.accent });
    wx.setNavigationBarTitle({ title: '设置' });
    this.setData({ ip: ip, meta: meta, ips: ips });
  },

  switchIp: function (e) {
    const ip = e.currentTarget.dataset.ip;
    if (ip === this.data.ip) return;
    app.setIp(ip);
    const meta = source.getMeta(ip);
    wx.showToast({ title: '已切换到 ' + meta.brand, icon: 'none' });
    // 重新启动到首页，让所有 tab 用新 IP 刷新
    setTimeout(function () { wx.reLaunch({ url: '/pages/index/index' }); }, 400);
  },

  clearData: function () {
    const self = this;
    wx.showModal({
      title: '清空全部收藏',
      content: '将删除本地所有收藏与心愿记录，且不可恢复。确定吗？',
      confirmColor: '#FF5C8A',
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
