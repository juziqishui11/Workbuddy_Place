/**
 * pages/login/login.js —— 微信登录 + 完善头像昵称
 *
 * 说明：本页所做的「登录」是**本机档案**，不产生服务端身份（没有后端去消费 wx.login 的 code）。
 * 头像昵称走微信官方「头像昵称填写能力」，属于隐私类型「收集你的昵称、头像」，
 * 需先在 mp 后台《用户隐私保护指引》里声明，否则 chooseAvatar 会报 scope 未声明。
 * 未登录不阻断任何功能：本页永远可「暂不登录」返回。
 */
const profile = require('../../utils/profile.js');
const source = require('../../utils/source.js');

Page({
  data: {
    step: 1,                 // 1=微信登录  2=完善资料
    logging: false,
    form: { nickName: '', avatarUrl: '' },
    avatarChar: '?',
    err: '',
    nickMax: 20,
    accent: '#3B7DDD', accent2: '#FFCB05'
  },

  onLoad: function () {
    const meta = source.getMeta() || {};
    const cur = profile.get();
    const form = {
      nickName: cur ? cur.nickName : '',
      avatarUrl: (cur && cur.avatarUrl) || ''
    };
    wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: meta.accent || '#3B7DDD' });
    wx.setNavigationBarTitle({ title: cur ? '编辑资料' : '微信登录' });
    this.setData({
      accent: meta.accent || '#3B7DDD',
      accent2: meta.accent2 || '#FFCB05',
      form: form,
      avatarChar: profile.avatarCharOf(form.nickName),
      step: cur ? 2 : 1
    });
  },

  /* 第一步：走一次微信登录链路（拿 code；当前不消费，失败也不阻断） */
  doWxLogin: function () {
    const self = this;
    if (this.data.logging) return;
    this.setData({ logging: true, err: '' });
    profile.wxLogin(function (code, error) {
      self.setData({ logging: false, step: 2 });
      if (error || !code) {
        wx.showToast({ title: '微信登录未完成，可继续设置资料', icon: 'none' });
      }
    });
  },

  /* 头像：chooseAvatar 给的是临时路径，需转持久路径，否则退出后可能被清理 */
  onChooseAvatar: function (e) {
    const raw = (e && e.detail && e.detail.avatarUrl) || '';
    if (!raw) return;
    const self = this;
    profile.persistAvatar(raw, function (persisted) {
      self.setData({ 'form.avatarUrl': persisted || '', err: '' });
    });
  },

  onNickInput: function (e) {
    const v = (e && e.detail && e.detail.value) || '';
    this.setData({ 'form.nickName': v, avatarChar: profile.avatarCharOf(v), err: '' });
  },

  /* iOS 上 nickname 输入的 bindinput 偶发延迟，失焦再兜底读一次 */
  onNickBlur: function (e) {
    const v = (e && e.detail && e.detail.value) || this.data.form.nickName;
    this.setData({ 'form.nickName': v, avatarChar: profile.avatarCharOf(v) });
  },

  doSave: function () {
    const nick = profile.cleanNick(this.data.form.nickName);
    if (!nick) {
      this.setData({ err: '请先填写一个昵称（1~20 个字）' });
      return;
    }
    const ok = profile.save({
      nickName: nick,
      avatarUrl: this.data.form.avatarUrl || ''
    });
    if (!ok) {
      this.setData({ err: '保存失败，请重试' });
      return;
    }
    wx.showToast({ title: '已保存', icon: 'success' });
    setTimeout(function () {
      wx.navigateBack({
        fail: function () { wx.switchTab({ url: '/pages/settings/settings' }); }
      });
    }, 400);
  },

  /* 未登录/跳过：永远保留这条出路（微信规定不得硬阻断核心功能） */
  skip: function () {
    profile.markSkipped();
    wx.navigateBack({
      fail: function () { wx.switchTab({ url: '/pages/index/index' }); }
    });
  }
});
