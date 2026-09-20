const source = require('../../utils/source.js');
const store = require('../../utils/store.js');

// 属性中文 → 卡牌配色（卡框/能量色按属性变化，每张卡都不一样）
const TYPE_COLOR_CN = {
  '一般': '#A8A878', '格斗': '#C03028', '飞行': '#A890F0', '毒': '#A040A0',
  '地面': '#E0C068', '岩石': '#B8A038', '虫': '#A8B820', '幽灵': '#705898',
  '钢': '#B8B8D0', '火': '#F08030', '水': '#6890F0', '草': '#78C850',
  '电': '#F8D030', '超能力': '#F85888', '冰': '#98D8D8', '龙': '#7038F8',
  '恶': '#705848', '妖精': '#EE99AC'
};

Page({
  data: {
    meta: {}, seriesId: '', figureId: '', figure: {},
    hasRec: false, rec: null, accent: '#3B7DDD', accent2: '#FFCB05',
    card: null, img: '', versions: [], verUrls: [],
    evo: { from: [], to: [], chain: [], has: false, branch: false }
  },

  onLoad: function (q) {
    this.q = { seriesId: q.seriesId, figureId: q.figureId };
    this._firstShow = true;
    this.load();
  },

  onShow: function () {
    if (!this.q) return;
    // onLoad 里已经完整 load() 过一次（含 setData + 导航栏 API）。
    // 首屏的 onShow 直接跳过，避免重复请求（原来同一次打开会调两遍 load）；
    // 只有从「录入 / 编辑」页返回时才需要重新加载。
    if (this._firstShow) { this._firstShow = false; return; }
    this.load();
  },

  load: function () {
    const q = this.q;
    if (!q || !q.seriesId || !q.figureId) return;
    const found = source.findFigure(q.seriesId, q.figureId);
    if (!found) { wx.showToast({ title: '未找到该卡牌', icon: 'none' }); return; }
    const meta = source.getMeta();
    const rm = source.rarityMeta(found.figure.rarity);
    const rec = store.findRecord(q.seriesId, q.figureId);

    wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: meta.accent });
    wx.setNavigationBarTitle({ title: found.figure.name });

    const b = found.figure.base || {};
    const baseTotal = (b.hp || 0) + (b.atk || 0) + (b.def || 0) + (b.spa || 0) + (b.spd || 0) + (b.spe || 0);
    // 种族值条：宽度在这里算成字符串（如 "65%"）。
    // ⚠️ 不要改成 WXML 内联样式 `width:{{x}}%` —— 插值后紧跟 % 会让开发者工具 CSS 校验误报。
    const baseBars = [['hp', 'HP'], ['atk', '攻击'], ['def', '防御'], ['spa', '特攻'], ['spd', '特防'], ['spe', '速度']]
      .map(function (d) {
        const v = b[d[0]] || 0;
        return { k: d[0], label: d[1], val: v, w: Math.min(100, v / 2) + '%' };
      });
    const fig = Object.assign({}, found.figure, {
      seriesName: found.series.name,
      rarityLabel: rm.label, rarityColor: rm.color, rarityBg: rm.bg,
      baseTotal: baseTotal,
      typeColor: found.figure.color || '#3B7DDD',
      moves: (found.figure.moves || []).map(function (m) {
        return Object.assign({}, m, { color: TYPE_COLOR_CN[m.type] || '#888' });
      })
    });

    // 卡面（官方简体中文版 TCG）
    const card = source.mainCard(found.figure);
    const versions = source.cardVersions(found.figure);
    const verUrls = versions.map(function (v) { return v.img; });
    const img = (card && card.img) || found.figure.art || found.figure.sprite;

    // 进化关系（进化前 / 进化后 / 同族全链）
    const evo = source.evolutionOf(found.figure);

    this.setData({
      meta: meta, seriesId: q.seriesId, figureId: q.figureId,
      figure: fig, hasRec: !!rec, rec: rec,
      accent: meta.accent, accent2: meta.accent2,
      baseBars: baseBars,
      card: card, img: img, versions: versions, verUrls: verUrls, evo: evo
    });
  },

  // 点击卡面版本 → 全屏放大浏览（可左右滑动看其他版本）
  previewVer: function (e) {
    const i = Number(e.currentTarget.dataset.i) || 0;
    const urls = this.data.verUrls;
    if (!urls.length) return;
    wx.previewImage({ urls: urls, current: urls[i] });
  },

  // 跳到关联宝可梦（进化前 / 进化后 / 同族）
  goFigure: function (e) {
    const d = e.currentTarget.dataset;
    if (!d.series || !d.id) return;
    if (d.series === this.data.seriesId && d.id === this.data.figureId) return;
    wx.redirectTo({ url: '/pages/detail/detail?seriesId=' + d.series + '&figureId=' + d.id });
  },

  onImgErr: function () {
    const f = this.data.figure;
    if (f.art && this.data.img !== f.art) { this.setData({ img: f.art }); }
    else if (f.sprite) { this.setData({ img: f.sprite }); }
  },

  goEdit: function () {
    const q = this.q;
    wx.navigateTo({ url: '/pages/add/add?seriesId=' + q.seriesId + '&figureId=' + q.figureId + '&mode=edit' });
  },

  addWish: function () {
    const q = this.q;
    store.upsert({ seriesId: q.seriesId, figureId: q.figureId, wish: true, rarity: this.data.figure.rarity });
    wx.showToast({ title: '已加入心愿单', icon: 'success' });
    this.load();
  },

  markOwned: function () {
    const q = this.q;
    store.upsert({
      seriesId: q.seriesId, figureId: q.figureId,
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
      title: '确认移除', content: '将从收藏/心愿中移除该卡牌记录。',
      success: function (r) {
        if (r.confirm) {
          store.remove(q.seriesId, q.figureId);
          wx.showToast({ title: '已移除', icon: 'none' });
          setTimeout(function () { wx.navigateBack(); }, 500);
        }
      }
    });
  }
});
