/**
 * app.js —— 全局：维护当前激活的 IP（泡泡玛特 / 宝可梦）
 */
const source = require('./utils/source.js');

App({
  globalData: {
    activeIp: 'popmart'
  },
  onLaunch: function () {
    try {
      const saved = wx.getStorageSync('toycol_active_ip');
      if (saved && source.getSource(saved)) this.globalData.activeIp = saved;
    } catch (e) {}
  },
  setIp: function (ip) {
    this.globalData.activeIp = ip;
    try { wx.setStorageSync('toycol_active_ip', ip); } catch (e) {}
  },
  getIp: function () { return this.globalData.activeIp; }
});
