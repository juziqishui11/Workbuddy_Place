const app = getApp();
const source = require('../../utils/source.js');
const store = require('../../utils/store.js');

Page({
  data: {
    ip: '', meta: {}, seriesId: '', figureId: '',
    figure: {}, hasRec: false, rec: null
  },

  onLoad: function (q) {
    this.q = {
      ip: q.ip || app.getIp(),
      seriesId: q.seriesId, figureId: q.figureId
    };
    this.load();
  },

  onShow: function () { if (this.q) this.load(); },

  load: function () {
    const q = this.q;
    if (!q || !q.seriesId || !q.figureId) return;
    const found = source.findFigure(q.ip, q.seriesId, q.figureId);
    if (!found) { wx.showToast({ title: '未找到该藏品', icon: 'none' }); return; }
    const meta = source.getMeta(q.ip);
    const rm = source.rarityMeta(found.figure.rarity);
    const rec = store.findRecord(q.ip, q.seriesId, q.figureId);

    wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: meta.accent });
    wx.setNavigationBarTitle({ title: found.figure.name });

    this.setData({
      ip: q.ip, meta: meta, seriesId: q.seriesId, figureId: q.figureId,
      figure: Object.assign({}, found.figure, {
        seriesName: found.series.name,
        rarityLabel: rm.label, rarityColor: rm.color, rarityBg: rm.bg
      }),
      hasRec: !!rec, rec: rec
    });
  },

  goEdit: function () {
    const q = this.q;
    wx.navigateTo({ url: '/pages/add/add?ip=' + q.ip + '&seriesId=' + q.seriesId + '&figureId=' + q.figureId + '&mode=edit' });
  },

  addWish: function () {
    const q = this.q;
    store.upsert({
      ip: q.ip, seriesId: q.seriesId, figureId: q.figureId,
      wish: true, rarity: this.data.figure.rarity
    });
    wx.showToast({ title: '已加入心愿单', icon: 'success' });
    this.load();
  },

  markOwned: function () {
    const q = this.q;
    store.upsert({
      ip: q.ip, seriesId: q.seriesId, figureId: q.figureId,
      own: true, wish: false, rarity: this.data.figure.rarity,
      acquiredAt: this.data.rec && this.data.rec.acquiredAt || '',
      buyPrice: this.data.rec && this.data.rec.buyPrice || 0,
      curValue: this.data.rec && this.data.rec.curValue || 0,
      condition: this.data.rec && this.data.rec.condition || '全新',
      note: this.data.rec && this.data.rec.note || ''
    });
    wx.showToast({ title: '已入手 🎉', icon: 'success' });
    setTimeout(function () { wx.navigateBack(); }, 600);
  },

  remove: function () {
    const q = this.q;
    const self = this;
    wx.showModal({
      title: '确认移除', content: '将从收藏/心愿中移除该藏品记录。',
      success: function (r) {
        if (r.confirm) {
          store.remove(q.ip, q.seriesId, q.figureId);
          wx.showToast({ title: '已移除', icon: 'none' });
          setTimeout(function () { wx.navigateBack(); }, 500);
        }
      }
    });
  }
});
