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
  // 支持 'form.nickName' / 'list[0].x' 这类路径键（真机 setData 本就支持，桩要对齐）
  inst.setData = function (o) {
    Object.keys(o).forEach((k) => {
      if (k.indexOf('.') < 0 && k.indexOf('[') < 0) { this.data[k] = o[k]; return; }
      const parts = k.replace(/\[(\d+)\]/g, '.$1').split('.');
      let cur = this.data;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (cur[p] == null) cur[p] = /^\d+$/.test(parts[i + 1]) ? [] : {};
        cur = cur[p];
      }
      cur[parts[parts.length - 1]] = o[k];
    });
  };
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

// ---- ④ 系列 / 卡包筛选 ----
console.log('=== 系列/卡包筛选 ===');
const sets = src.listSets();
check(sets.length > 0, 'listSets 为空');
const cnSets = sets.filter((s) => s.lang === 'cn');
const enSets = sets.filter((s) => s.lang === 'en');
console.log('  卡包总数 ' + sets.length + '（中文 ' + cnSets.length + ' / 国际版 ' + enSets.length + '）');
check(cnSets.length > 0 && enSets.length > 0, '中文/国际版分组应都非空');
sets.forEach((s) => {
  check(/^(cn|en):/.test(s.key), 'key 前缀异常 ' + s.key);
  check(s.count > 0, 'count 应为正 ' + s.key);
  check(!!s.name, 'name 为空 ' + s.key);
});

// 打开面板 → 列表有内容
const dex2 = loadPage('pages/dex/dex.js');
dex2.onLoad();
dex2.openSetPanel();
check(dex2.data.setPanelOpen === true, '面板未打开');
check(dex2.data.setCn.length > 0, '面板中文列表为空');
check(dex2.data.setEn.length > 0, '面板国际版列表为空');
console.log('  面板：中文 ' + dex2.data.setCn.length + ' 项 / 国际版 ' + dex2.data.setEn.length + ' 项');

// 选一个含喷火龙的卡包（对战派对组合 火），关都应命中但少于全量
dex2.toggleSet({ currentTarget: { dataset: { key: 'cn:CSMPbC' } } });
check(dex2.data.setFilterCnt === 1, '已选数量应为 1，实际 ' + dex2.data.setFilterCnt);
check(dex2.data.setNames.length === 1 && !!dex2.data.setNames[0].name, 'setNames 结构异常');
dex2.closeSetPanel();
dex2.refresh();
const hitNames = dex2.data.figures.map((f) => f.name);
check(hitNames.indexOf('喷火龙') >= 0, '筛选后应包含喷火龙');
check(dex2.data.figures.length > 0 && dex2.data.figures.length < 151, '筛选后应少于全量且非空，实际 ' + dex2.data.figures.length);
console.log('  选中「对战派对组合 火」→ 关都命中 ' + dex2.data.figures.length + ' 只: ' + hitNames.slice(0, 8).join('/'));

// 空态：选一个绝不含关都宝可梦的国际版卡包（Fates Collide 为 XY 期，关都有少量）
dex2.clearSets();
dex2.refresh();
check(dex2.data.figures.length === 151, '清空后应恢复 151 只，实际 ' + dex2.data.figures.length);
ok('清空筛选恢复全量');

// 搜索词过滤（中文 / 代码 / 英文名 都能命中）
dex2.onSetKw({ detail: { value: '喷火龙' } });
check(dex2.data.setCn.length > 0 && dex2.data.setCn.every((s) => s.name.indexOf('喷火龙') >= 0), '搜索词过滤失效（中文）');
dex2.onSetKw({ detail: { value: 'CSMPbC' } });
check(dex2.data.setCn.length === 1 && dex2.data.setCn[0].code === 'CSMPbC', '按商品代号搜索失效');
dex2.onSetKw({ detail: { value: 'generations' } });
check(dex2.data.setEn.length === 1, '按英文系列名搜索失效');
dex2.clearSetKw();
check(dex2.data.setKw === '' && dex2.data.setCn.length > 1, '清空搜索词后应恢复完整列表');
console.log('  搜索：中文名 / 商品代号 / 英文系列名 均命中');
ok('搜索与清空正常');

// removeSet（点顶部筛选条上的 chip 移除）
dex2.toggleSet({ currentTarget: { dataset: { key: 'cn:CSMPbC' } } });
dex2.removeSet({ currentTarget: { dataset: { key: 'cn:CSMPbC' } } });
check(dex2.data.setFilterCnt === 0, 'removeSet 后应为 0，实际 ' + dex2.data.setFilterCnt);
ok('removeSet 正常');

// 国际版筛选：挑一个 count 最大的英文卡包，应能筛出结果
const topEn = enSets.slice().sort((a, b) => b.count - a.count)[0];
dex2.toggleSet({ currentTarget: { dataset: { key: topEn.key } } });
dex2.switchSeries({ currentTarget: { dataset: { id: 'kanto' } } });
console.log('  国际版「' + topEn.name + '」→ 关都命中 ' + dex2.data.figures.length + ' 只');
check(dex2.data.figures.length > 0, '国际版筛选应能命中结果');
check(dex2.data.setNames[0].name === topEn.name, 'setNames 名称应与卡包名一致');
dex2.clearSets();
dex2.refresh();
check(dex2.data.figures.length === 151, '再次清空应恢复 151 只');
ok('国际版筛选 + 二次清空正常');

// ---- ⑤ 开包：形态权重 / 闪光特效映射 ----
console.log('=== 开包形态特效 ===');
const gacha = loadPage('pages/gacha/gacha.js');
gacha.onShow();
const pool = gacha.buildPool();
const byForm = {};
pool.forEach((p) => { const k = p.form || '(基础)'; byForm[k] = (byForm[k] || 0) + 1; });
console.log('  抽卡池 ' + pool.length + ' 条：' + Object.keys(byForm).map((k) => k + '×' + byForm[k]).join(' / '));
check(pool.length > 800, '池子应包含全部基础卡');
['EX', 'MEGA', 'GX', 'V', '极巨化', '光辉', 'δ', 'LV.X', '暗之'].forEach((fm) => {
  check(byForm[fm] > 0, '抽卡池缺少形态 ' + fm);
});
// lightUp 的特效映射：key 必须与 cardForm() 返回值一致
const litCases = [['极巨化', true, true], ['MEGA', true, true], ['GX', true, true], ['EX', false, true], ['V', false, true]];
litCases.forEach(([fm, wantPremium, wantGlow]) => {
  const e = pool.find((p) => p.form === fm);
  if (!e) { bad++; console.log('  ✗ 池中没有 ' + fm + ' 卡，无法验证特效'); return; }
  const lit = gacha.lightUp(e);
  check(lit.premium === wantPremium, fm + ' premium 应为 ' + wantPremium + '，实际 ' + lit.premium);
  check(lit.glow === wantGlow, fm + ' glow 应为 ' + wantGlow + '，实际 ' + lit.glow);
});
const plain = pool.find((p) => !p.form && p.figure.rarity === '普通');
if (plain) {
  const litP = gacha.lightUp(plain);
  check(litP.premium === false && litP.glow === false, '普通基础卡不应带闪光特效');
}
ok('形态权重与闪光特效映射正确');

// ---- ⑥ 撕卡包手势：方向必须是「左上 → 右上」的横撕 ----
console.log('=== 撕卡包手势 ===');
{
  const g = loadPage('pages/gacha/gacha.js');
  const start = (x, y) => g.packTouchStart({ touches: [{ clientX: x, clientY: y }] });
  const move = (x, y) => g.packTouchMove({ touches: [{ clientX: x, clientY: y }] });
  const reset = () => { g._tearStart = null; g.setData({ state: 'idle', tearProgress: 0, packSealStyle: '' }); };

  // 纯横向右撕（dy = 0）必须生效
  reset(); start(100, 300); move(300, 300);
  check(g.data.tearProgress > 0, '横向右撕（dy=0）应生效，实际 tearProgress=' + g.data.tearProgress);
  const st = String(g.data.packSealStyle || '');
  const m = st.match(/translate\((-?[\d.]+)rpx,\s*(-?[\d.]+)rpx\)/);
  check(!!m, 'packSealStyle 应含 translate(x, y)，实际 ' + st);
  if (m) {
    check(Number(m[1]) > 0, '封条应向右位移，实际 tx=' + m[1]);
    check(Number(m[2]) <= 0, '封条不应向下位移（应向上轻抬），实际 ty=' + m[2]);
  }

  // 斜向右下同样生效（旧版只认右下，新版以横向为主）
  reset(); start(100, 300); move(300, 420);
  check(g.data.tearProgress > 0, '斜向右下撕也应生效');

  // 向左拖拽不触发
  reset(); start(300, 300); move(100, 300);
  check(g.data.tearProgress === 0, '向左拖拽不应触发撕开');

  // 纵向下拉不触发（旧版正是靠 dy 判定，会导致横撕失败）
  reset(); start(200, 200); move(202, 420);
  check(g.data.tearProgress === 0, '纵向拉拽不应触发撕开');

  // 向右位移量需足以滑出卡包（卡包 380rpx）
  reset(); start(100, 300); move(400, 300);
  const st2 = String(g.data.packSealStyle || '');
  const m2 = st2.match(/translate\((-?[\d.]+)rpx/);
  check(!!m2 && Number(m2[1]) >= 380, '撕满时封条须滑出卡包右缘（≥380rpx），实际 ' + (m2 ? m2[1] : '?'));
  ok('撕卡包方向正确：左 → 右横撕（含斜向右下）生效，向左 / 纵向不生效');
}

// ---- ⑦ 开包翻牌：第 1 张卡必须也翻开（回归：曾因内层定时器读错 i 而永久停在卡背）----
console.log('=== 开包翻牌顺序 ===');
{
  const g = loadPage('pages/gacha/gacha.js');
  const n = 5;
  g.setData({
    state: 'opened',
    cards: Array.from({ length: n }, (_, k) => ({ uid: 'u' + k, img: 'x.png', name: 'n' + k })),
    appear: Array.from({ length: n }, () => false),
    flipped: Array.from({ length: n }, () => false)
  });
  g.startFlying();
  await new Promise((r) => setTimeout(r, 4300));
  check(g.data.appear.every(Boolean), n + ' 张卡应全部飞入，实际 ' + JSON.stringify(g.data.appear));
  check(g.data.flipped[0] === true, '第 1 张卡必须翻开（flipped[0] 应为 true，实际 ' + g.data.flipped[0] + '）');
  check(g.data.flipped.every(Boolean), n + ' 张卡应全部翻开，实际 ' + JSON.stringify(g.data.flipped));
  check(g.data.state === 'done', '动画结束后 state 应为 done，实际 ' + g.data.state);

  // uid 唯一性（WXML wx:key="uid" 依赖它）
  const g2 = loadPage('pages/gacha/gacha.js');
  g2.onShow();
  const lits = g2.draw(5).map((p) => g2.lightUp(p));
  const uids = lits.map((c) => c.uid);
  check(uids.every(Boolean), '每张卡都应有 uid，实际 ' + JSON.stringify(uids));
  check(new Set(uids).size === uids.length, 'uid 必须唯一，实际 ' + JSON.stringify(uids));
  ok('翻牌顺序正确：每张飞入后各自翻开，第 1 张不再停留在卡背；uid 唯一');
}

// ---- ⑧ 卡包皮肤：6 种可切换（越界回绕 / 动画中锁定 / 立绘失败兜底）----
console.log('=== 卡包皮肤 ===');
{
  const g = loadPage('pages/gacha/gacha.js');
  g.onShow();
  const skins = g.data.skins;
  check(Array.isArray(skins) && skins.length === 6, '应有 6 种卡包皮肤，实际 ' + (skins && skins.length));
  check(new Set(skins.map((s) => s.id)).size === 6, '皮肤 id 必须唯一');
  check(skins.every((s) => s.name && s.c1 && s.c2 && s.dex), '每种皮肤都要有 name / c1 / c2 / dex');

  g.applySkin(0);
  g.switchSkin({ currentTarget: { dataset: { i: 3 } } });
  check(g.data.skinIdx === 3, '切到第 4 种皮肤，实际 skinIdx=' + g.data.skinIdx);
  check(g.data.packColor1 === skins[3].c1 && g.data.packColor2 === skins[3].c2,
    '切换后卡包主色应跟随皮肤，实际 ' + g.data.packColor1 + '/' + g.data.packColor2);
  check(String(g.data.packArt).indexOf(String(skins[3].dex)) > -1,
    '切换后封面立绘应跟随皮肤，实际 ' + g.data.packArt);

  g.applySkin(9);
  check(g.data.skinIdx === 3, 'applySkin(9) 应对 6 取模回绕到 3，实际 ' + g.data.skinIdx);
  g.applySkin(-1);
  check(g.data.skinIdx === 5, 'applySkin(-1) 应回绕到 5，实际 ' + g.data.skinIdx);

  const before = g.data.skinIdx;
  g.setData({ state: 'flying' });
  g.switchSkin({ currentTarget: { dataset: { i: 1 } } });
  check(g.data.skinIdx === before, '开包动画中不应允许换皮肤');

  g.setData({ state: 'idle' });
  g.onPackArtErr();
  check(g.data.packArt === '', '封面立绘加载失败应清空 packArt（只留渐变底）');

  // WXML 事件绑定（静态断言）：色点必须 catchtap —— bindtap 会冒泡到外层触发 openPack
  const gachaWxml = require('fs').readFileSync(R + 'pages/gacha/gacha.wxml', 'utf8');
  check(/catchtap="switchSkin"/.test(gachaWxml), '皮肤色点必须用 catchtap，否则点击会冒泡触发开包');
  check(/class="pack-body[^>]*bindtouchstart="packTouchStart"/.test(gachaWxml),
    '撕开手势应绑在 pack-body 上，绑在 pack-wrap 会被色点拖动误触发');
  ok('6 种皮肤可切换 / 越界回绕 / 动画中锁定 / 立绘失败兜底 / 事件绑定正确');
}

// ---- ⑨ 登录 / 本机档案（头像昵称 / 退出登录不得动收藏）----
console.log('=== 登录与本机档案 ===');
{
  // 用「可读写内存 storage」替换全局 wx 桩：档案逻辑必须真实走存储才能验
  const mem = {};
  const navUrls = [];
  let loginCalls = 0, loginShouldFail = false;
  const baseWx = global.wx;
  const fsStub = {
    accessSync: (p) => { if (!mem.__files || !mem.__files[p]) throw new Error('ENOENT'); },
    unlinkSync: (p) => { if (mem.__files) delete mem.__files[p]; },
    saveFile: (o) => { mem.__files = mem.__files || {}; mem.__files[o.filePath] = 1; o.success && o.success({}); }
  };
  global.wx = Object.assign({}, baseWx, {
    getStorageSync: (k) => (k in mem ? mem[k] : null),
    setStorageSync: (k, v) => { mem[k] = v; },
    removeStorageSync: (k) => { delete mem[k]; },
    env: { USER_DATA_PATH: '/mock/userdata' },
    getFileSystemManager: () => fsStub,
    login: (o) => { loginCalls++; if (loginShouldFail) o.fail({ errMsg: 'mock fail' }); else o.success({ code: 'mock-code' }); },
    navigateTo: (o) => { navUrls.push(o.url); },
    navigateBack: () => {}, switchTab: () => {}, showToast: () => {},
    showModal: (o) => { o.success && o.success({ confirm: true }); }
  });

  const profile = require(R + 'utils/profile.js');
  const storeM = require(R + 'utils/store.js');
  const login = loadPage('pages/login/login.js');

  check(profile.isLogged() === false, '初始应未登录');
  check(profile.skipped() === false, '初始不应标记为已跳过');

  // 昵称清洗
  check(profile.cleanNick('  枫 城  ') === '枫 城', '昵称应去首尾空白并压缩连续空白');
  check(profile.cleanNick('   ') === '' && profile.cleanNick('') === '', '空 / 纯空白昵称应判非法');
  check(profile.cleanNick('a'.repeat(30)).length === 20, '昵称应截断到 20 字');
  check(profile.cleanNick('枫\u0000城') === '枫城', '昵称应滤掉控制字符');
  check(profile.avatarCharOf('皮卡丘') === '皮' && profile.avatarCharOf('') === '?', '头像占位应取首字、无昵称回落 ?');

  // 第一步
  login.onLoad();
  check(login.data.step === 1, '未登录时登录页应停在「微信登录」第一步');
  login.doWxLogin();
  check(loginCalls === 1, 'doWxLogin 应调用一次 wx.login');
  check(login.data.step === 2, '微信登录后应进入「完善资料」第二步');

  // wx.login 失败也不得阻断
  const login2 = loadPage('pages/login/login.js');
  login2.onLoad();
  loginShouldFail = true;
  login2.doWxLogin();
  check(login2.data.step === 2 && login2.data.logging === false, 'wx.login 失败也必须能继续填资料（不阻断）');
  loginShouldFail = false;

  // 空昵称必须被拦下
  login2.setData({ form: { nickName: '   ', avatarUrl: '' } });
  login2.doSave();
  check(!!login2.data.err, '空昵称保存应报错');
  check(profile.isLogged() === false, '空昵称不得写入档案');

  // 头像持久化：临时文件 → 本地用户文件（否则退出小程序后会变破图）
  let persisted = '', keptHttp = '';
  profile.persistAvatar('http://tmp/xxx.jpeg', (p) => { persisted = p; });
  check(persisted === '/mock/userdata/profile_avatar.png', 'chooseAvatar 的临时文件应转成持久路径');
  profile.persistAvatar('https://thirdwx.qlogo.cn/a.png', (p) => { keptHttp = p; });
  check(keptHttp === 'https://thirdwx.qlogo.cn/a.png', '已是 http 地址应原样保留');

  // 正常保存
  login2.setData({ form: { nickName: '枫城', avatarUrl: persisted } });
  login2.doSave();
  check(profile.isLogged() === true, '合法昵称应写入档案');
  const savedP = profile.get();
  check(savedP.nickName === '枫城', '档案昵称应正确');
  check(savedP.avatarUrl === '/mock/userdata/profile_avatar.png', '档案头像应存持久路径');
  check(!!savedP.loginAt, '档案应记录登录时间');

  // 已登录再进登录页 = 编辑资料
  const login3 = loadPage('pages/login/login.js');
  login3.onLoad();
  check(login3.data.step === 2 && login3.data.form.nickName === '枫城', '已登录再进登录页应直接回填资料');

  // 「我的」页展示
  const st = loadPage('pages/settings/settings.js');
  st.onShow();
  check(st.data.logged === true, '「我的」页登录后应显示已登录');
  check(st.data.profile && st.data.profile.nickName === '枫城', '「我的」页应带出昵称');
  check(st.data.avatarChar === '枫', '「我的」页应带出头像首字兜底');
  check(!!st.data.loginAtText, '「我的」页应显示登录日期');
  st.onAvatarErr();
  check(st.data.profile.avatarUrl === '', '头像文件失效应回落首字占位（不显示破图）');

  // 【关键】退出登录只清档案，绝不动收藏
  storeM.upsert({ seriesId: 'kanto', figureId: 'pk-006', own: true });
  check(storeM.ownedList().length === 1, '准备阶段：应有 1 条收藏');
  st.logout();
  check(profile.isLogged() === false, '退出登录应清掉档案');
  check(storeM.ownedList().length === 1, '退出登录不得清掉收藏（这条最容易写错）');

  // 首页首次引导：只在「未登录且没点过暂不登录」时引导一次
  navUrls.length = 0;
  const idx1 = loadPage('pages/index/index.js');
  idx1.onShow();
  check(navUrls.indexOf('/pages/login/login') >= 0, '未登录首次进首页应引导到登录页');
  navUrls.length = 0;
  idx1.onShow();
  check(navUrls.length === 0, '同一次会话内不应重复引导');
  profile.markSkipped();
  navUrls.length = 0;
  loadPage('pages/index/index.js').onShow();
  check(navUrls.length === 0, '点过「暂不登录」后不应再自动引导');
  profile.save({ nickName: '枫城' });
  navUrls.length = 0;
  loadPage('pages/index/index.js').onShow();
  check(navUrls.length === 0, '已登录后不应再引导');

  // WXML / JS 静态断言
  const lgWxml = require('fs').readFileSync(R + 'pages/login/login.wxml', 'utf8');
  const lgJs = require('fs').readFileSync(R + 'pages/login/login.js', 'utf8');
  const stWxml = require('fs').readFileSync(R + 'pages/settings/settings.wxml', 'utf8');
  check(/open-type="chooseAvatar"/.test(lgWxml) && /bindchooseavatar="onChooseAvatar"/.test(lgWxml),
    '登录页必须用官方 chooseAvatar 按钮并绑定 bindchooseavatar');
  check(/type="nickname"/.test(lgWxml), '昵称输入框必须 type="nickname"（才有微信昵称快捷填入）');
  check(/bindtap="skip"/.test(lgWxml), '登录页必须有「暂不登录」出口（微信禁止硬阻断核心功能）');
  check(!/getUserProfile|getUserInfo/.test(lgJs + lgWxml), '不得使用已被回收的 getUserProfile / getUserInfo');
  check(/bindtap="goLogin"/.test(stWxml) && /bindtap="logout"/.test(stWxml),
    '「我的」页需有 goLogin 入口与 logout 行');
  check(/class="card user-card"\s+bindtap="goLogin"/.test(stWxml), '用户行整行应可点击进登录/编辑');
  check(/class="uc-arrow"/.test(stWxml), '用户行右侧应有箭头（微信「我」页风的可点击提示）');
  ok('档案读写 / 昵称清洗 / 头像持久化 / 登录不阻断 / 退出不动收藏 / 首次引导仅一次');

  global.wx = baseWx;
}

// ---- 其余页面：能加载不报错 ----
console.log('=== 其余页面加载 ===');
[['pages/index/index.js', 'index'], ['pages/gacha/gacha.js', 'gacha'],
 ['pages/settings/settings.js', 'settings'], ['pages/add/add.js', 'add'],
 ['pages/login/login.js', 'login']].forEach(([f, n]) => {
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
