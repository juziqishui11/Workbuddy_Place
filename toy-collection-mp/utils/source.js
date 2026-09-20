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
    tcgArt: found.figure.tcgArt || '',
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

module.exports = {
  getSource: getSource,
  getMeta: getMeta,
  findFigure: findFigure,
  rarityMeta: rarityMeta,
  progressFor: progressFor,
  totalFigures: totalFigures,
  enrich: enrich,
  listSeries: listSeries
};
