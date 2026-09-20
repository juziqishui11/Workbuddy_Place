/**
 * utils/store.js —— 本地收藏 / 心愿存储
 * 用 wx 本地存储持久化，无需后端、无需账号，纯个人卡牌收藏册。
 * 单条记录结构：
 *   { id, seriesId, figureId, own(bool), wish(bool),
 *     buyPrice(number), curValue(number), acquiredAt('YYYY-MM-DD'),
 *     condition('全新'|'拆封'|'二手'), note(string), photo(string), createdAt }
 */
const KEY = 'toycol_collection_v1';

function getCollection() {
  try {
    return wx.getStorageSync(KEY) || [];
  } catch (e) {
    return [];
  }
}

function save(list) {
  try {
    wx.setStorageSync(KEY, list);
    return true;
  } catch (e) {
    return false;
  }
}

/** 是否有某藏品的记录（不论 own/wish） */
function findRecord(seriesId, figureId) {
  return getCollection().find(function (c) {
    return c.seriesId === seriesId && c.figureId === figureId;
  }) || null;
}

/** 新增或更新（按 seriesId+figureId 唯一） */
function upsert(rec) {
  const list = getCollection();
  const idx = list.findIndex(function (c) {
    return c.seriesId === rec.seriesId && c.figureId === rec.figureId;
  });
  if (idx >= 0) {
    list[idx] = Object.assign(list[idx], rec);
  } else {
    rec.id = 'tc_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    rec.createdAt = new Date().toISOString();
    list.push(rec);
  }
  save(list);
  return rec;
}

function remove(seriesId, figureId) {
  const list = getCollection().filter(function (c) {
    return !(c.seriesId === seriesId && c.figureId === figureId);
  });
  save(list);
}

/** 已拥有清单（own=true） */
function ownedList() {
  return getCollection().filter(function (c) { return c.own; });
}

/** 心愿清单（wish=true） */
function wishList() {
  return getCollection().filter(function (c) { return c.wish; });
}

/** 统计：总价值、总数量、按稀有度计数 */
function stats() {
  const owned = ownedList();
  const wish = wishList();
  let totalValue = 0, totalBuy = 0;
  const byRarity = {};
  owned.forEach(function (c) {
    totalValue += Number(c.curValue) || 0;
    totalBuy += Number(c.buyPrice) || 0;
    const r = c.rarity || '普通';
    byRarity[r] = (byRarity[r] || 0) + 1;
  });
  return {
    ownedCount: owned.length,
    wishCount: wish.length,
    totalValue: totalValue,
    totalBuy: totalBuy,
    profit: totalValue - totalBuy,
    byRarity: byRarity
  };
}

function clearAll() {
  save([]);
}

module.exports = {
  getCollection: getCollection,
  findRecord: findRecord,
  upsert: upsert,
  remove: remove,
  ownedList: ownedList,
  wishList: wishList,
  stats: stats,
  clearAll: clearAll
};
