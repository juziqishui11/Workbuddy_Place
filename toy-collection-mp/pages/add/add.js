const app = getApp();
const source = require('../../utils/source.js');
const store = require('../../utils/store.js');

const CONDITIONS = ['全新', '拆封', '二手'];

Page({
  data: {
    ip: '', meta: {}, mode: 'add',
    seriesList: [], figuresList: [], conditionList: CONDITIONS,
    seriesIndex: 0, figureIndex: 0,
    buyPrice: '', curValue: '', acquiredAt: '', conditionIndex: 0, note: '', photo: '', today: ''
  },

  onLoad: function (q) {
    const ip = q.ip || app.getIp();
    const meta = source.getMeta(ip);
    const src = source.getSource(ip);
    this.seriesArr = src.series;
    this.q = q;
    const seriesList = src.series.map(function (s) { return s.name; });
    const today = this.fmtDate(new Date());

    this.setData({ ip: ip, meta: meta, seriesList: seriesList, conditionList: CONDITIONS, today: today, acquiredAt: today });
    wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: meta.accent });
    wx.setNavigationBarTitle({ title: (q.mode === 'edit' ? '编辑藏品' : '录入藏品') });

    let si = 0, fi = 0;
    if (q.seriesId) {
      const idx = src.series.findIndex(function (s) { return s.id === q.seriesId; });
      if (idx >= 0) si = idx;
    }
    this.applySeries(si);
    if (q.figureId) {
      const figs = this.seriesArr[si].figures;
      const fidx = figs.findIndex(function (f) { return f.id === q.figureId; });
      if (fidx >= 0) fi = fidx;
    }
    this.setData({ seriesIndex: si, figureIndex: fi });

    const rec = store.findRecord(ip, q.seriesId, q.figureId);
    if (rec) {
      this.setData({
        buyPrice: rec.buyPrice || '', curValue: rec.curValue || '',
        acquiredAt: rec.acquiredAt || today,
        conditionIndex: Math.max(0, CONDITIONS.indexOf(rec.condition || '全新')),
        note: rec.note || '', photo: rec.photo || ''
      });
    }
  },

  applySeries: function (si) {
    const ser = this.seriesArr[si];
    const figuresList = ser.figures.map(function (f) {
      return f.name + '（' + source.rarityMeta(f.rarity).label + '）';
    });
    this.setData({ figuresList: figuresList, figureIndex: 0 });
  },

  onSeriesChange: function (e) {
    const si = Number(e.detail.value);
    this.setData({ seriesIndex: si });
    this.applySeries(si);
  },
  onFigureChange: function (e) { this.setData({ figureIndex: Number(e.detail.value) }); },
  onDateChange: function (e) { this.setData({ acquiredAt: e.detail.value }); },
  onConditionChange: function (e) { this.setData({ conditionIndex: Number(e.detail.value) }); },
  onPriceInput: function (e) { this.setData({ buyPrice: e.detail.value }); },
  onValueInput: function (e) { this.setData({ curValue: e.detail.value }); },
  onNoteInput: function (e) { this.setData({ note: e.detail.value }); },

  choosePhoto: function () {
    const self = this;
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 1, mediaType: ['image'], sourceType: ['album', 'camera'],
        success: function (res) { self.setData({ photo: res.tempFiles[0].tempFilePath }); },
        fail: function () { self.fallbackPhoto(); }
      });
    } else { this.fallbackPhoto(); }
  },
  fallbackPhoto: function () {
    const self = this;
    wx.chooseImage({ count: 1, success: function (r) { self.setData({ photo: r.tempFilePaths[0] }); } });
  },

  fmtDate: function (d) {
    const p = function (n) { return ('' + n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  },

  save: function () {
    const ip = this.data.ip;
    const ser = this.seriesArr[this.data.seriesIndex];
    const fig = ser.figures[this.data.figureIndex];
    if (!ser || !fig) { wx.showToast({ title: '请选择藏品', icon: 'none' }); return; }
    const rec = {
      ip: ip, seriesId: ser.id, figureId: fig.id, own: true, wish: false,
      rarity: fig.rarity,
      buyPrice: Number(this.data.buyPrice) || 0,
      curValue: Number(this.data.curValue) || 0,
      acquiredAt: this.data.acquiredAt,
      condition: CONDITIONS[this.data.conditionIndex],
      note: this.data.note, photo: this.data.photo
    };
    store.upsert(rec);
    wx.showToast({ title: '已保存', icon: 'success' });
    setTimeout(function () { wx.navigateBack(); }, 500);
  }
});
