/**
 * utils/source.js —— 宝可梦单 IP 数据抽象层
 * 现在只服务宝可梦一套 schema，页面无需再关心 IP 切换。
 */
const pokemon = require('../data/pokemon.js');

/** 取展示元信息（品牌、主色、量词、系列清单——仅元信息，不含 figures） */
function getMeta() {
  return {
    ip: pokemon.ip,
    brand: pokemon.brand,
    accent: pokemon.accent,
    accent2: pokemon.accent2,
    unit: pokemon.unit,
    series: pokemon.series.map(function (s) {
      return { id: s.id, name: s.name, desc: s.desc, total: s.figures.length };
    })
  };
}

/** 取完整数据源 */
function getSource() {
  return pokemon;
}

/**
 * 查找某系列 / 某藏品
 * @returns { series, figure } 或 null
 */
function findFigure(seriesId, figureId) {
  if (!seriesId || !figureId) return null;
  const s = pokemon;
  for (let i = 0; i < s.series.length; i++) {
    const ser = s.series[i];
    if (ser.id !== seriesId) continue;
    for (let j = 0; j < ser.figures.length; j++) {
      if (ser.figures[j].id === figureId) {
        return { series: ser, figure: ser.figures[j] };
      }
    }
  }
  return null;
}

/** 稀有度 → 标签配色（用于卡片 tag） */
function rarityMeta(rarity) {
  switch (rarity) {
    case '传说': return { color: '#2E7DD1', bg: '#E2EEFB', label: '传说' };
    case '幻之': return { color: '#B23BD6', bg: '#F4E2FB', label: '幻之' };
    default: return { color: '#5B6472', bg: '#EEF1F5', label: '普通' };
  }
}

/**
 * 计算每个系列的拥有进度
 * @param collection 本地收藏数组（含 own/wish 标记）
 * @returns [{ seriesId, name, total, owned, wish, percent }]
 */
function progressFor(collection) {
  return pokemon.series.map(function (ser) {
    const total = ser.figures.length;
    let owned = 0, wish = 0;
    ser.figures.forEach(function (f) {
      const rec = collection.find(function (c) {
        return c.seriesId === ser.id && c.figureId === f.id;
      });
      if (rec && rec.own) owned++;
      else if (rec && rec.wish) wish++;
    });
    return {
      seriesId: ser.id,
      name: ser.name,
      total: total,
      owned: owned,
      wish: wish,
      percent: total ? Math.round((owned / total) * 100) : 0
    };
  });
}

/** 总藏品数（图鉴规模） */
function totalFigures() {
  return pokemon.series.reduce(function (sum, ser) { return sum + ser.figures.length; }, 0);
}

/**
 * 把一条本地记录（store 返回）合并上图鉴元数据，得到展示对象。
 * 找不到对应图鉴项时返回 null（多半是脏数据）。
 */
function enrich(rec) {
  const found = findFigure(rec.seriesId, rec.figureId);
  if (!found) return null;
  return Object.assign({}, rec, {
    seriesName: found.series.name,
    name: found.figure.name,
    sub: found.figure.sub || '',
    code: found.figure.code || '',
    types: found.figure.types || '',
    color: found.figure.color || '#EEE',
    sprite: found.figure.sprite || '',
    art: found.figure.art || '',
    tcgArt: figureImage(found.figure),
    cn: found.figure.cn || null,
    rarity: found.figure.rarity || '普通',
    category: found.figure.category || '',
    desc: found.figure.desc || '',
    weak: found.figure.weak || [],
    resist: found.figure.resist || []
  });
}

/** 全部系列（录入 / 选择用） */
function listSeries() {
  return pokemon.series.map(function (s) {
    return { id: s.id, name: s.name, desc: s.desc };
  });
}

/* ============================================================
 *  官方简体中文版 TCG 卡面（duanxr/PTCG-CHS-Datasets，非商业 / 研究用途）
 *  数据来源：宝可梦简体中文版集换式卡牌游戏
 * ============================================================ */

var CHS_IMG_BASE = 'https://raw.githubusercontent.com/duanxr/PTCG-CHS-Datasets/main/';

// TCG 能量 / 属性（与数据集 dict.attribute 一致）
var ATTR_NAME = { 1: '草', 2: '火', 3: '水', 4: '雷', 5: '超', 6: '斗', 7: '恶', 8: '钢', 9: '妖', 10: '龙', 11: '无色' };
var ATTR_COLOR = {
  '草': '#43A047', '火': '#EF6C00', '水': '#1E88E5', '雷': '#F9A825', '超': '#D81B60',
  '斗': '#B9492F', '恶': '#5D4037', '钢': '#9AA4B2', '妖': '#EC7FA9', '龙': '#7038F8', '无色': '#B7BFCC'
};

function cnImg(p) { return p ? CHS_IMG_BASE + p : ''; }
function cnSetName(code) { var m = pokemon.cnSets || {}; return m[code] || code || ''; }

// "2,2,2,2" → [{n:'火',c:'#EF6C00'}, ...]
function energyCost(s) {
  var out = [];
  String(s || '').split(',').forEach(function (code) {
    var n = ATTR_NAME[code];
    if (n) out.push({ n: n, c: ATTR_COLOR[n] || '#B7BFCC' });
  });
  return out;
}

/** 列表 / 卡墙用：这只宝可梦的卡面主图 */
function figureImage(figure) {
  return cnImg(figure.cn && figure.cn.img) || figure.enArt || figure.art || figure.sprite || '';
}

/** 详情页「主卡」：中文卡名 · 招式（中文名 + 中文说明 + 能量 + 伤害）· 特性 */
function mainCard(figure) {
  var c = figure.cn;
  if (!c) {
    if (!figure.enArt) return null;
    return {
      img: figure.enArt, name: figure.name, no: '', setCode: '', setName: '国际版卡面',
      hp: 0, attr: '', rarity: '', atk: [], ft: [], intl: true
    };
  }
  return {
    img: cnImg(c.img), name: c.n, no: c.no, setCode: c.s, setName: cnSetName(c.s),
    hp: c.hp, attr: c.a, rarity: c.r, intl: false,
    atk: (c.atk || []).map(function (a) {
      return { name: a.n, text: a.d, dmg: a.p, cost: energyCost(a.c) };
    }),
    ft: (c.ft || []).map(function (f) { return { name: f.n, text: f.d }; })
  };
}

/** 全部卡面版本（主卡 + 其他中文卡面，同一只宝可梦的不同系列 / 不同样子） */
function cardVersions(figure) {
  var out = [];
  var c = figure.cn;
  if (c) out.push({ img: cnImg(c.img), no: c.no, setId: c.s, setName: cnSetName(c.s), rarity: c.r, main: true });
  (figure.cvs || []).forEach(function (v) {
    out.push({ img: cnImg(v[0]), no: v[1], setId: v[2], setName: cnSetName(v[2]), rarity: v[3], main: false });
  });
  if (!out.length && figure.enArt) {
    out.push({ img: figure.enArt, no: '', setId: '', setName: '国际版卡面', rarity: '', main: true });
  }
  return out;
}

// 全国图鉴号 → 图鉴项（懒建索引）
var _dexIndex = null;
function figureByDex(dex) {
  if (!_dexIndex) {
    _dexIndex = {};
    pokemon.series.forEach(function (ser) {
      ser.figures.forEach(function (f) { _dexIndex[Number(f.code)] = { series: ser, figure: f }; });
    });
  }
  return _dexIndex[dex] || null;
}

// 组装一张「关联宝可梦」小卡（供进化链渲染 / 点击跳转）
function miniOf(dex, mark) {
  var hit = figureByDex(dex);
  if (!hit) return null;
  var f = hit.figure;
  return {
    id: f.id,
    dex: Number(f.code),
    code: f.code,
    name: f.name,
    seriesId: hit.series.id,
    thumb: figureImage(f),
    typeColor: f.color || '#3B7DDD',
    types: f.types || '',
    mark: mark || ''
  };
}

/** 某只宝可梦的进化关系：进化前（直接）/ 进化后（直接）/ 同族全链 */
function evolutionOf(figure) {
  var dex = Number(figure.code);
  var from = (figure.ef || []).map(function (d) { return miniOf(d, 'from'); }).filter(Boolean);
  var to = (figure.et || []).map(function (d) { return miniOf(d, 'to'); }).filter(Boolean);
  var chain = (figure.ec || [dex]).map(function (d) {
    return miniOf(d, d === dex ? 'cur' : 'kin');
  }).filter(Boolean);
  // 分叉判定：同族中任一节点有多个子代（如伊布）→ 不能画成线性箭头
  var branch = false;
  (figure.ec || []).forEach(function (d) {
    var hit = figureByDex(d);
    if (hit && (hit.figure.et || []).length > 1) branch = true;
  });
  return {
    from: from, to: to, chain: chain, branch: branch,
    has: from.length > 0 || to.length > 0 || chain.length > 1
  };
}

module.exports = {
  getSource: getSource,
  getMeta: getMeta,
  findFigure: findFigure,
  rarityMeta: rarityMeta,
  progressFor: progressFor,
  totalFigures: totalFigures,
  enrich: enrich,
  listSeries: listSeries,
  figureImage: figureImage,
  mainCard: mainCard,
  cardVersions: cardVersions,
  cnSetName: cnSetName,
  figureByDex: figureByDex,
  evolutionOf: evolutionOf
};
