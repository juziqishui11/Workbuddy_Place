const source = require('../../utils/source.js');
const store = require('../../utils/store.js');

Page({
  data: {
    meta: {}, seriesList: [], active: 'kanto',
    total: 0, owned: 0, percent: 0, barW: '0%',
    figures: [], showMissing: false, accent: '#3B7DDD', accent2: '#FFCB05',

    // ===== 系列 / 卡包筛选 =====
    setPanelOpen: false,
    setKw: '',
    setCn: [],            // 简体中文版卡包（按搜索词过滤后的展示列表）
    setEn: [],            // 国际版卡面
    setFilter: [],        // 已选中的 key（'cn:CSM1DC' / 'en:Generations'）
    setFilterCnt: 0,      // 已选数量（面板按钮用）
    setNames: []          // 已选系列名（页面顶部筛选条展示）
  },

  onLoad: function () {
    const meta = source.getMeta();
    const list = meta.series.map(function (s) { return { id: s.id, name: s.name }; });
    this.setData({ meta: meta, seriesList: list, accent: meta.accent, accent2: meta.accent2 });
    this._allSets = source.listSets();   // 只取一次，面板打开 / 搜索都在内存里过滤
  },

  onShow: function () { this.refresh(); },

  switchSeries: function (e) {
    this.setData({ active: e.currentTarget.dataset.id });
    this.refresh();
  },

  // ---------- 系列 / 卡包筛选 ----------
  openSetPanel: function () {
    this.setData({ setPanelOpen: true, setKw: '' });
    this.applySetKw('');
  },

  closeSetPanel: function () {
    this.setData({ setPanelOpen: false });
  },

  noop: function () { /* 阻止遮罩点击穿透 */ },

  onSetKw: function (e) {
    const kw = e.detail.value || '';
    this.setData({ setKw: kw });
    this.applySetKw(kw);
  },

  clearSetKw: function () {
    this.setData({ setKw: '' });
    this.applySetKw('');
  },

  // 按搜索词切分「中文卡包 / 国际版」两份展示列表，并标出已选状态
  applySetKw: function (kw) {
    const all = this._allSets || [];
    const picked = this.data.setFilter || [];
    const k = String(kw || '').trim().toLowerCase();
    const cn = []; const en = [];
    for (let i = 0; i < all.length; i++) {
      const s = all[i];
      if (k) {
        const hay = (s.name + ' ' + s.code).toLowerCase();
        if (hay.indexOf(k) < 0) continue;
      }
      const item = { key: s.key, name: s.name, code: s.code, count: s.count, on: picked.indexOf(s.key) >= 0 };
      if (s.lang === 'cn') cn.push(item); else en.push(item);
    }
    this.setData({ setCn: cn, setEn: en });
  },

  toggleSet: function (e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    const cur = (this.data.setFilter || []).slice();
    const i = cur.indexOf(key);
    if (i >= 0) cur.splice(i, 1); else cur.push(key);
    const names = cur.map(function (k) {
      const s = (this._allSets || []).find(function (x) { return x.key === k; });
      return { key: k, name: s ? s.name : k };
    }.bind(this));
    this.setData({ setFilter: cur, setFilterCnt: cur.length, setNames: names });
    this.applySetKw(this.data.setKw);
  },

  clearSets: function () {
    this.setData({ setFilter: [], setFilterCnt: 0, setNames: [] });
  },

  confirmSets: function () {
    this.setData({ setPanelOpen: false });
    this.refresh();
  },

  // 从顶部筛选条上点某个已选系列 → 直接去掉
  removeSet: function (e) {
    const key = e.currentTarget.dataset.key;
    this.toggleSet({ currentTarget: { dataset: { key: key } } });
    this.refresh();
  },

  // ---------- 列表 ----------
  refresh: function () {
    const meta = source.getMeta();
    const src = source.getSource();
    const coll = store.getCollection();
    const active = this.data.active;
    const ser = src.series.find(function (s) { return s.id === active; }) || src.series[0];
    const setFilter = this.data.setFilter || [];

    // 系列筛选：一只宝可梦只要有任一卡面版本属于选中系列即命中
    const srcFigures = setFilter.length
      ? ser.figures.filter(function (f) {
        const hit = source.setsOf(f);
        for (let i = 0; i < setFilter.length; i++) { if (hit[setFilter[i]]) return true; }
        return false;
      })
      : ser.figures;

    const figures = srcFigures.map(function (f) {
      const rec = coll.find(function (c) { return c.seriesId === ser.id && c.figureId === f.id; });
      // 只下发模板真正用到的字段：dex.wxml 用 owned/seriesId/figureId/img/name/code，
      // sprite 供图片加载失败时兜底（onImgErr）。原来 16 个字段 → 7 个，
      // setData 载荷 86.5KB → 约 20KB（151 条时），减少序列化与渲染压力。
      return {
        seriesId: ser.id, figureId: f.id, code: f.code, name: f.name,
        sprite: f.sprite, owned: !!(rec && rec.own),
        img: source.figureImage(f)
      };
    });
    const owned = figures.filter(function (f) { return f.owned; }).length;
    const total = figures.length;
    const percent = total ? Math.round((owned / total) * 100) : 0;
    this.setData({
      total: total, owned: owned, percent: percent,
      barW: percent + '%',
      figures: figures, accent: meta.accent, accent2: meta.accent2
    });
    this.setNavTitle('卡册 · ' + ser.name.split(' ')[0]);
  },

  // 切系列时 wx.setNavigationBarTitle 的异步回调可能乱序返回，
  // 导致标题停留在上一个系列名。用递增序号把标题收敛到最新一次调用。
  setNavTitle: function (title) {
    const self = this;
    this._navTitle = title;
    const seq = (this._navSeq = (this._navSeq || 0) + 1);
    wx.setNavigationBarTitle({
      title: title,
      complete: function () {
        if (seq !== self._navSeq) wx.setNavigationBarTitle({ title: self._navTitle });
      }
    });
  },

  toggleMissing: function () { this.setData({ showMissing: !this.data.showMissing }); },

  // 点击卡册卡片：无论是否已收集，都进入详情页（顶部即大卡图 + 标记入手按钮）。
  // 原先未收集跳「录入表单」，用户反馈未收集卡也希望直接看到放大卡面。
  goFigure: function (e) {
    const d = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/detail/detail?seriesId=' + d.series + '&figureId=' + d.figure });
  },

  // 长按卡册卡片 → 直接放大预览卡面大图（不跳转）
  previewCard: function (e) {
    const d = e.currentTarget.dataset;
    const urls = [d.img];
    wx.previewImage({ urls: urls, current: d.img });
  },

  onImgErr: function (e) {
    const i = e.currentTarget.dataset.i;
    const key = 'figures[' + i + '].img';
    this.setData({ [key]: this.data.figures[i].sprite });
  }
});
