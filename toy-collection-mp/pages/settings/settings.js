const source = require('../../utils/source.js');
const store = require('../../utils/store.js');
const profile = require('../../utils/profile.js');

function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const p = function (n) { return ('0' + n).slice(-2); };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

Page({
  data: {
    meta: {}, ownedCount: 0, wishCount: 0, completion: 0, total: 0,
    accent: '#3B7DDD', accent2: '#FFCB05',
    logged: false, profile: null, avatarChar: '?', loginAtText: ''
  },

  onShow: function () {
    const meta = source.getMeta();
    const total = source.totalFigures();
    const stat = store.stats();
    const completion = total ? Math.round(stat.ownedCount / total * 100) : 0;
    const p = profile.get();

    wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: meta.accent });
    wx.setNavigationBarTitle({ title: '我的' });

    this.setData({
      meta: meta, ownedCount: stat.ownedCount, wishCount: stat.wishCount,
      completion: completion, total: total,
      accent: meta.accent, accent2: meta.accent2,
      logged: !!p,
      profile: p,
      avatarChar: p ? profile.avatarCharOf(p.nickName) : '?',
      loginAtText: p ? fmtDate(p.loginAt) : ''
    });
  },

  /* 去登录 / 编辑资料 */
  goLogin: function () {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  onAvatarErr: function () {
    // 头像文件可能被系统清理 → 回落首字占位，不显示破图
    this.setData({ 'profile.avatarUrl': '' });
  },

  /* 退出登录：只清本机档案，绝不动收藏与心愿 */
  logout: function () {
    const self = this;
    wx.showModal({
      title: '退出登录',
      content: '只清除本机的头像和昵称，你的收藏与心愿不会受影响。确定退出吗？',
      success: function (r) {
        if (!r.confirm) return;
        profile.clear();
        wx.showToast({ title: '已退出', icon: 'none' });
        self.onShow();
      }
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
  }
});
