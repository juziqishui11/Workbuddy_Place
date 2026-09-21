const source = require('../../utils/source.js');
const store = require('../../utils/store.js');
const profile = require('../../utils/profile.js');

function pkNum(id) { return Number(String(id).replace('pk-', '')) || 0; }

Page({
  data: {
    meta: {}, owned: [], total: 0, ownedCount: 0,
    completion: 0, totalValue: 0, accent: '#3B7DDD', accent2: '#FFCB05'
  },

  onShow: function () {
    this.refresh();
    this.maybeGuideLogin();
  },

  /**
   * 首次进入且未登录、也没点过「暂不登录」→ 引导一次。
   * 注意：**不阻断任何功能**（微信规定不得硬阻断核心功能），
   * 登录页永远有「暂不登录，先逛逛」，且可物理返回。
   */
  maybeGuideLogin: function () {
    if (this._guided) return;
    this._guided = true;
    if (profile.isLogged() || profile.skipped()) return;
    wx.navigateTo({ url: '/pages/login/login', fail: function () {} });
  },

  refresh: function () {
    const meta = source.getMeta();
    const ownedRaw = store.ownedList();
    let owned = ownedRaw.map(function (r) { return source.enrich(r); }).filter(Boolean);
    owned.sort(function (a, b) { return pkNum(a.figureId) - pkNum(b.figureId); });
    owned = owned.map(function (o) {
      return Object.assign({}, o, { img: o.tcgArt || o.sprite });
    });
    const total = source.totalFigures();
    const stat = store.stats();
    const completion = total ? Math.round((owned.length / total) * 100) : 0;

    wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: meta.accent });
    wx.setNavigationBarTitle({ title: '我的卡牌' });

    this.setData({
      meta: meta, owned: owned, total: total,
      ownedCount: stat.ownedCount, completion: completion, totalValue: stat.totalValue,
      accent: meta.accent, accent2: meta.accent2
    });
  },

  goDetail: function (e) {
    const d = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/detail/detail?seriesId=' + d.series + '&figureId=' + d.figure });
  },

  goGacha: function () { wx.switchTab({ url: '/pages/gacha/gacha' }); },
  goDex: function () { wx.switchTab({ url: '/pages/dex/dex' }); },

  onImgErr: function (e) {
    const i = e.currentTarget.dataset.i;
    const key = 'owned[' + i + '].img';
    this.setData({ [key]: this.data.owned[i].art });
  }
});
