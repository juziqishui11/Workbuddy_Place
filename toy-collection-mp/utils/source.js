/**
 * utils/source.js —— 双 IP 数据抽象层
 * 把泡泡玛特 / 宝可梦两套 schema 统一暴露给页面，页面无需关心当前是哪一 IP。
 */
const popmart = require('../data/popmart.js');
const pokemon = require('../data/pokemon.js');

const MAP = { popmart, pokemon };

/** 全部可选 IP（设置页与录入页用） */
function listIPs() {
  return [
    { key: 'popmart', brand: popmart.brand },
    { key: 'pokemon', brand: pokemon.brand }
  ];
}

/** 取某个 IP 的完整数据源 */
function getSource(ip) {
  return MAP[ip] || popmart;
}

/** 取某个 IP 的展示元信息（品牌、主色、量词） */
function getMeta(ip) {
  const s = getSource(ip);
  return { ip: s.ip, brand: s.brand, accent: s.accent, accent2: s.accent2, unit: s.unit };
}

/**
 * 在指定 IP 下查找某系列 / 某藏品
 * @returns { series, figure } 或 null
 */
function findFigure(ip, seriesId, figureId) {
  const s = getSource(ip);
  if (!s) return null;
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
    case '隐藏': return { color: '#7A5CFF', bg: '#EFE9FF', label: '隐藏款' };
    case '大娃': return { color: '#FF5C8A', bg: '#FFE6EE', label: '大娃' };
    case 'MEGA': return { color: '#C99B1E', bg: '#FFF3D1', label: 'MEGA' };
    case '传说': return { color: '#2E7DD1', bg: '#E2EEFB', label: '传说' };
    case '幻之': return { color: '#B23BD6', bg: '#F4E2FB', label: '幻之' };
    default: return { color: '#5B6472', bg: '#EEF1F5', label: '常规' };
  }
}

/**
 * 计算某 IP 下每个系列的拥有进度
 * @param collection 本地收藏数组（含 own/wish 标记）
 * @returns [{ seriesId, name, total, owned, wish, percent }]
 */
function progressFor(ip, collection) {
  const s = getSource(ip);
  return s.series.map(function (ser) {
    const total = ser.figures.length;
    let owned = 0, wish = 0;
    ser.figures.forEach(function (f) {
      const rec = collection.find(function (c) {
        return c.ip === ip && c.seriesId === ser.id && c.figureId === f.id;
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

/** 该 IP 总藏品数（图鉴规模） */
function totalFigures(ip) {
  const s = getSource(ip);
  return s.series.reduce(function (sum, ser) { return sum + ser.figures.length; }, 0);
}

/**
 * 把一条本地记录（store 返回）合并上图鉴元数据，得到展示对象。
 * 找不到对应图鉴项时返回 null（多半是换了 IP 后的脏数据）。
 */
function enrich(ip, rec) {
  const found = findFigure(ip, rec.seriesId, rec.figureId);
  if (!found) return null;
  return Object.assign({}, rec, {
    seriesName: found.series.name,
    name: found.figure.name,
    sub: found.figure.sub || '',
    emoji: found.figure.emoji || '🧸',
    color: found.figure.color || '#EEE',
    rarity: found.figure.rarity || '常规',
    type: found.figure.type || ''
  });
}

module.exports = {
  listIPs: listIPs,
  getSource: getSource,
  getMeta: getMeta,
  findFigure: findFigure,
  rarityMeta: rarityMeta,
  progressFor: progressFor,
  totalFigures: totalFigures,
  enrich: enrich
};
