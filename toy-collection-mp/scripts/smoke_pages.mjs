// scripts/smoke_pages.mjs —— 页面逻辑冒烟测试（打桩 Page / wx 后真实调用页面方法）
// 覆盖：
//   ① dex.refresh() 产出的 barW 是 "N%" 字符串（配合 WXML style="width:{{barW}}"）
//   ② detail.load() 产出的 baseBars（种族值条）是带单位的字符串
//   ③ dex 切系列时导航栏标题乱序的收敛逻辑
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const R = 'D:/workBuddy_place/toy-collection-mp/';

// ---- wx 桩 ----
const nav = [];          // 依次记录 setNavigationBarTitle 的调用
let deferComplete = false;
const pending = [];      // 延迟的 complete 回调（用于模拟乱序返回）
global.wx = {
  getStorageSync: () => null,
  setStorageSync: () => {},
  setNavigationBarTitle: (o) => {
    nav.push(o.title);
    if (o.complete) { if (deferComplete) pending.push(o); else o.complete(); }
  },
  setNavigationBarColor: () => {},
  showToast: () => {}, showModal: () => {},
  navigateTo: () => {}, redirectTo: () => {}, navigateBack: () => {},
  previewImage: () => {}
};
let captured = null;
global.Page = (cfg) => { captured = cfg; };

function loadPage(rel) {
  captured = null;
  const abs = R + rel;
  delete require.cache[require.resolve(abs)];
  require(abs);
  if (!captured) throw new Error('页面未调用 Page(): ' + rel);
  const inst = Object.assign({}, captured);
  inst.data = JSON.parse(JSON.stringify(captured.data || {}));
  inst.setData = function (o) { Object.assign(this.data, o); };
  return inst;
}

let bad = 0;
const check = (ok, msg) => { if (!ok) { bad++; console.log('  ✗ ' + msg); } };
const ok = (msg) => console.log('  ✓ ' + msg);

// ---- ① dex 页 ----
console.log('=== dex 页面 ===');
const dex = loadPage('pages/dex/dex.js');
dex.onLoad();
dex.refresh();
console.log('  barW=' + dex.data.barW + ' percent=' + dex.data.percent + ' 标题=' + nav[nav.length - 1]);
check(/^\d+%$/.test(dex.data.barW), 'barW 应为 "N%" 字符串，实际 ' + JSON.stringify(dex.data.barW));
check(dex.data.barW === dex.data.percent + '%', 'barW 与 percent 不一致');
ok('barW 形态正确（WXML 只需 style="width:{{barW}}"）');

// 每个系列都跑一遍，确保 percent/barW 恒为合法
const src = require(R + 'utils/source.js');
src.listSeries().forEach((s) => {
  dex.switchSeries({ currentTarget: { dataset: { id: s.id } } });
  check(/^\d+%$/.test(dex.data.barW), s.id + ' barW 非法: ' + dex.data.barW);
});
ok('全部系列 barW 合法');

// ---- ③ 标题乱序收敛 ----
console.log('=== 导航栏标题乱序收敛 ===');
const johtoName = src.listSeries().find((s) => s.id === 'johto').name;
nav.length = 0;
deferComplete = true;
dex.switchSeries({ currentTarget: { dataset: { id: 'kanto' } } });
dex.switchSeries({ currentTarget: { dataset: { id: 'johto' } } });
// 回调按「后进先出」返回（模拟原生异步乱序）
pending.splice(0).reverse().forEach((o) => o.complete());
const last = nav[nav.length - 1];
const want = '卡册 · ' + johtoName.split(' ')[0];
console.log('  标题调用序列:', nav.join(' → '));
check(last === want, '最终标题应为 ' + want + '，实际 ' + last);
ok('乱序回调后标题收敛到最新系列（' + last + '）');
deferComplete = false;

// ---- ② detail 页 ----
console.log('=== detail 页面 ===');
const detail = loadPage('pages/detail/detail.js');
nav.length = 0;
detail.onLoad({ seriesId: 'kanto', figureId: 'pk-006' });
const afterLoad = nav.length;
detail.onShow();   // 首屏 onShow：应跳过重复加载
check(nav.length === afterLoad, '首屏 onShow 不应重复调用导航栏 API（多调 ' + (nav.length - afterLoad) + ' 次）');
detail.onShow();   // 再次 onShow（模拟从录入/编辑页返回）：应重新加载
check(nav.length > afterLoad, '从子页返回时应重新加载');
ok('详情页打开一次只 load 一次（无重复 setData / 导航栏调用）');
const bb = detail.data.baseBars || [];
console.log('  baseBars:', bb.map((x) => x.label + ':' + x.val + '(' + x.w + ')').join(' '));
check(bb.length === 6, 'baseBars 应为 6 项，实际 ' + bb.length);
bb.forEach((x) => {
  check(/^\d+(\.\d+)?%$/.test(x.w), 'w 应为 "N%" 字符串: ' + JSON.stringify(x.w));
  check(!!x.label && x.val !== undefined, 'baseBars 项缺 label/val: ' + JSON.stringify(x));
});
const order = bb.map((x) => x.k).join(',');
check(order === 'hp,atk,def,spa,spd,spe', '顺序错误: ' + order);
ok('baseBars 结构与顺序正确');

// 满值边界（幸福蛋 #242 属城都，HP 255 → 应封顶 100%）
const fat = loadPage('pages/detail/detail.js');
fat.onLoad({ seriesId: 'johto', figureId: 'pk-242' });
const hpBar = (fat.data.baseBars || []).find((x) => x.k === 'hp');
console.log('  幸福蛋 HP bar:', hpBar && (hpBar.val + ' -> ' + hpBar.w));
check(hpBar && hpBar.w === '100%', 'HP 255 应封顶 100%，实际 ' + (hpBar && hpBar.w));
ok('极端值封顶正常');

// ---- 其余页面：能加载不报错 ----
console.log('=== 其余页面加载 ===');
[['pages/index/index.js', 'index'], ['pages/gacha/gacha.js', 'gacha'],
 ['pages/settings/settings.js', 'settings'], ['pages/add/add.js', 'add']].forEach(([f, n]) => {
  try {
    const p = loadPage(f);
    if (p.onLoad) p.onLoad(n === 'add' ? { seriesId: 'kanto', figureId: 'pk-006' } : {});
    if (p.onShow) p.onShow();
    console.log('  ✓ ' + n + ' 加载并初始化成功');
  } catch (e) {
    bad++;
    console.log('  ✗ ' + n + ' 初始化异常: ' + e.message);
  }
});

console.log(bad ? '\nFAILED (' + bad + ')' : '\nALL PAGES OK');
process.exit(bad ? 1 : 0);
