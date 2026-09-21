const source = require('../../utils/source.js');
const store = require('../../utils/store.js');

// ---- 国际版（英文）卡面技能数据 -------------------------------------------
// 简中版数据集尚未收录 EX / GX / V / MEGA 等形态卡，这些卡只能显示国际版英文卡面，
// 卡面文字为英文。中文对照数据放在分包 packageSkill 里（约 450KB），
// 用到时才异步拉取，不占用主包体积；基础库过低时回落显示英文原文。
var skillMod = null;
var skillLoading = false;

function loadSkillData(cb) {
  if (skillMod) { cb(skillMod); return; }
  if (typeof require.async !== 'function') { cb(null); return; }
  if (skillLoading) { setTimeout(function () { loadSkillData(cb); }, 120); return; }
  skillLoading = true;
  require.async('../../packageSkill/en-skills.js').then(function (m) {
    skillMod = m; skillLoading = false; cb(m);
  }).catch(function () { skillLoading = false; cb(null); });
}

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
    card: null, img: '', versions: [], verUrls: [], forms: [],
    evo: { from: [], to: [], chain: [], has: false, branch: false },
    currentVerIdx: 0, tab: 'card', rarityIcon: ''
  },

  onLoad: function (q) {
    this.q = { seriesId: q.seriesId, figureId: q.figureId };
    this._firstShow = true;
    this.load();
  },

  onShow: function () {
    if (!this.q) return;
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
    const img = (card && card.img) || found.figure.enArt || found.figure.art || found.figure.sprite;

    // 进化关系（进化前 / 进化后 / 同族全链）
    const evo = source.evolutionOf(found.figure);

    // 特殊形态（EX / MEGA / V / 极巨化 / 光辉 等）
    const forms = source.figureForms(found.figure);

    // 主卡面本身就是国际版（该宝可梦没有简中版卡）→ 首屏也要异步取中文技能
    if (card && card.intl) card.skillsLoading = true;

    this.setData({
      meta: meta, seriesId: q.seriesId, figureId: q.figureId,
      figure: fig, hasRec: !!rec, rec: rec,
      accent: meta.accent, accent2: meta.accent2,
      baseBars: baseBars,
      card: card, img: img, versions: versions, verUrls: verUrls, forms: forms, evo: evo,
      currentVerIdx: 0, tab: 'card', rarityIcon: source.rarityIcon(card && card.rarity)
    });

    if (card && card.intl) this.loadIntlSkills(0, img);
  },

  // 切换当前展示的主卡面版本（点击版本缩略图）
  switchVersion: function (e) {
    const i = Number(e.currentTarget.dataset.i);
    const v = this.data.versions[i];
    if (!v || !v.img) return;
    const baseCard = this.data.card || {};
    const newCard = Object.assign({}, baseCard, {
      img: v.img, no: v.no, setCode: v.setId,
      setName: v.setName || source.cnSetName(v.setId), rarity: v.rarity,
      main: v.main, form: v.form, intl: !!v.intl
    });
    if (v.intl) {
      // 国际版卡面：技能区换成「这一张卡」自己的技能（有中文对照则显示中文）
      newCard.atk = []; newCard.ft = []; newCard.skillsLoading = true;
      this.setData({
        currentVerIdx: i, img: v.img, card: newCard,
        rarityIcon: source.rarityIcon(v.rarity)
      });
      this.loadIntlSkills(i, v.img);
      return;
    }
    this.setData({
      currentVerIdx: i, img: v.img, card: newCard,
      rarityIcon: source.rarityIcon(v.rarity)
    });
  },

  // 异步取国际版卡面的技能（分包数据）并回填到当前卡面
  loadIntlSkills: function (idx, img) {
    const self = this;
    loadSkillData(function (mod) {
      if (self.data.currentVerIdx !== idx) return;      // 用户已切走，丢弃这次结果
      const entry = mod && mod.C ? mod.C[source.intlCardKey(img)] : null;
      const atk = []; const ft = [];
      if (entry) {
        const txt = function (t) { return (t >= 0 && mod.Z[t]) ? mod.Z[t] : (t >= 0 ? mod.T[t] : ''); };
        const nam = function (t) { return (t >= 0 && mod.ZN[t]) ? mod.ZN[t] : (t >= 0 ? mod.N[t] : ''); };
        (entry[6] || []).forEach(function (a) {
          ft.push({ name: nam(a[0]), type: a[1], text: txt(a[2]) });
        });
        (entry[7] || []).forEach(function (a) {
          atk.push({
            name: nam(a[0]), dmg: a[1],
            cost: (a[2] || []).map(function (ei) {
              const e = (mod.E && mod.E[ei]) || ['', '#888'];
              return { n: e[0], c: e[1] };
            }),
            text: txt(a[3])
          });
        });
      }
      const card = Object.assign({}, self.data.card, {
        atk: atk, ft: ft, skillsLoading: false, skillsLoaded: true
      });
      // 国际版卡面的 HP / 属性来自分包（主包数据里没有）
      if (entry) {
        if (!card.hp && entry[3]) card.hp = entry[3];
        if (!card.attr && entry[4]) card.attr = entry[4];
        if (!card.name && entry[0]) card.name = entry[0];
      }
      self.setData({ card: card });
    });
  },

  // 点击特殊形态标签 → 切换到该形态的第一张卡
  switchForm: function (e) {
    const form = e.currentTarget.dataset.form;
    const idx = this.data.versions.findIndex(function (v) { return v.form === form; });
    if (idx >= 0) this.switchVersion({ currentTarget: { dataset: { i: idx } } });
  },

  // 点击大卡面 → 全屏预览当前卡面（及所有版本）
  previewCurrent: function () {
    const urls = this.data.verUrls;
    if (!urls.length) return;
    wx.previewImage({ urls: urls, current: this.data.img });
  },

  // 点击卡面版本 → 放大浏览（保留原交互，长按/点击放大图标用）
  previewVer: function (e) {
    const i = Number(e.currentTarget.dataset.i) || 0;
    const urls = this.data.verUrls;
    if (!urls.length) return;
    wx.previewImage({ urls: urls, current: urls[i] });
  },

  // 打开卡牌术语表（分包页面）
  goGlossary: function () {
    wx.navigateTo({ url: '/packageSkill/pages/glossary/glossary' });
  },

  switchTab: function (e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
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
    if (f.enArt && this.data.img !== f.enArt) { this.setData({ img: f.enArt }); }
    else if (f.art && this.data.img !== f.art) { this.setData({ img: f.art }); }
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
