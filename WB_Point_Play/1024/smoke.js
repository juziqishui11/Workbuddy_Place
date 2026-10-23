/* 无头冒烟测试：用 jsdom 跑真实页面，验证五个面板的交互不抛错 */
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(
  'C:/Users/EDY/.workbuddy/binaries/node/workspace/node_modules/jsdom'));

// 用 file:// 加载，避免 jsdom 对 http 并发取脚本的连接限制
const URL = process.env.URL || ('file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/'));

function fakeCtx() {
  const grad = { addColorStop() {} };
  const ctx = {
    canvas: null,
    setTransform() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    clearRect() {}, fillRect() {}, strokeRect() {}, beginPath() {}, closePath() {},
    moveTo() {}, lineTo() {}, arc() {}, arcTo() {}, rect() {}, roundRect() {},
    fill() {}, stroke() {}, clip() {}, drawImage() {},
    setLineDash() {}, getLineDash: () => [],
    createLinearGradient: () => grad, createRadialGradient: () => grad,
    createPattern: () => ({}), measureText: (s) => ({ width: String(s).length * 8 }),
    fillText() {}, strokeText() {}, putImageData() {}, getImageData: () => ({ data: [] }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    set font(v) {}, get font() { return ''; },
    set fillStyle(v) {}, get fillStyle() { return ''; },
    set strokeStyle(v) {}, get strokeStyle() { return ''; },
    set lineWidth(v) {}, get lineWidth() { return 1; },
    set globalAlpha(v) {}, get globalAlpha() { return 1; },
    set textAlign(v) {}, get textAlign() { return 'left'; },
    set textBaseline(v) {}, get textBaseline() { return 'top'; },
    set letterSpacing(v) {}, get letterSpacing() { return '0'; },
    set globalCompositeOperation(v) {}, get globalCompositeOperation() { return 'source-over'; },
    set shadowColor(v) {}, set shadowBlur(v) {}, set lineCap(v) {}, set lineJoin(v) {},
    set strokeDasharray(v) {}, set fillStyleRaw(v) {}
  };
  return ctx;
}

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push('jsdomError: ' + e.message));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
vc.on('warn', (...a) => { const s = a.join(' '); if (s.indexOf('[1024]') === 0) errors.push(s); });

(async () => {
  const dom = await JSDOM.fromURL(URL, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      window.HTMLCanvasElement.prototype.getContext = function () { return fakeCtx(); };
      window.HTMLCanvasElement.prototype.toBlob = function (cb) { cb(null); };
      window.HTMLCanvasElement.prototype.toDataURL = function () { return 'data:image/png;base64,'; };
      window.performance = window.performance || { now: () => Date.now() };
    }
  });

  const w = dom.window, d = w.document;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await new Promise((r) => { if (d.readyState === 'complete') r(); else w.addEventListener('load', r); });
  await wait(300);

  const out = [];
  const t = (name, cond, extra) => out.push((cond ? '  PASS  ' : '  FAIL  ') + name + (cond ? '' : '  ← ' + (extra || '')));

  const APP = w.APP;
  t('APP 已加载', !!APP);
  t('六个场景模块齐备', APP && ['profile', 'board', 'cert', 'time', 'wish', 'translate'].every((k) => APP.scenes[k]));
  t('六个面板 body 都有内容', ['board', 'cert', 'profile', 'time', 'wish', 'translate']
    .every((k) => (d.getElementById('body-' + k) || {}).innerHTML.length > 40));
  t('页面有 6 个 panel', d.querySelectorAll('.panel').length === 6);

  // ---- P1：点折叠态正文本身就该展开（不必去找放大按钮） ----
  t('放大按钮已移除', d.querySelectorAll('.panel__expand').length === 0);
  const bodyBoard = d.querySelector('#body-board .feed, #body-board .metric, #body-board *');
  if (bodyBoard) {
    APP.close();
    bodyBoard.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await wait(80);
  }
  t('点折叠态正文能直接展开面板', d.getElementById('panel-board').classList.contains('is-open'));
  t('展开态不误伤其它面板', d.querySelectorAll('.panel.is-open').length === 1);
  APP.close();
  await wait(40);
  t('顶栏工号初始为 ----', d.getElementById('chipNo').textContent.indexOf('----') !== -1);

  // ---- 领工号：直接喂 10 个答案，走真实 finish ----
  APP.open('profile');
  const startBtn = d.querySelector('[data-act="start"]');
  if (startBtn) startBtn.click();
  await wait(60);
  const pattern = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1]; // → 0110 ... 计算见下
  pattern.forEach((v, i) => {
    APP.state.idx = i;
    APP.state.answers[i] = v;
  });
  APP.state.idx = 9;
  w.__profileFinish();
  await wait(80);

  const c = APP.util.compute();
  const expectNum = parseInt(pattern.join(''), 2);
  t('编号计算正确（' + expectNum + '）', c && c.num === expectNum, c && c.num);
  t('工号已同步到顶栏', d.getElementById('chipNo').textContent.indexOf(APP.util.pad(expectNum, 4)) !== -1);
  const passNo = d.querySelector('.pass__no');
  t('工牌渲染出编号', !!passNo && passNo.textContent.indexOf(APP.util.pad(expectNum, 4)) !== -1);
  t('雷达 SVG 存在', !!d.querySelector('#body-profile .radar'));
  t('两个仪表盘存在', d.querySelectorAll('#body-profile .gauge').length === 2);
  t('1024 格阵生成 1024 格', d.querySelectorAll('#body-profile .grid1024 i').length === 1024,
    d.querySelectorAll('#body-profile .grid1024 i').length);
  // ---- P4：我的那一格高亮 + 图例 ----
  const meCell = d.querySelector('#body-profile .grid1024 i.is-me');
  t('格阵中标出「我」的那一格', !!meCell);
  t('同型格有 is-type 描边', d.querySelectorAll('#body-profile .grid1024 i.is-type').length > 0);
  const gleg = d.querySelector('#body-profile .glegend');
  t('格阵图例存在', !!gleg);
  t('图例含「你 · #编号」', !!gleg && gleg.textContent.indexOf('你 · #') !== -1);
  t('图例含同型数量', !!gleg && /同型其余 \d+ 个/.test(gleg.textContent));
  t('图例含亮度刻度', !!gleg && gleg.querySelectorAll('.glegend__sc i').length === 4);
  t('克制：无敏感词', APP.audit().length === 0, APP.audit().join(','));

  // ---- 形象与状态机 ----
  const heroImg = d.querySelector('#body-profile .hero__art img');
  t('形象图路径指向类型码', !!heroImg && heroImg.getAttribute('src') === 'assets/avatar/' + c.code + '.webp',
    heroImg && heroImg.getAttribute('src'));
  const passImg = d.querySelector('#body-profile .pass__ava img');
  t('工牌缩略图同源', !!passImg && passImg.getAttribute('src') === 'assets/avatar/' + c.code + '.webp');

  // jsdom 的 file:// 是不透明源，localStorage 会抛异常；
  // 「stage 不落盘」改为 check.js 里的静态断言，这里只验内存态行为。
  t('stage 是内存态且可显式推进', typeof APP.state.stage === 'string' && typeof APP.util.setStage === 'function');

  APP.close();
  APP.open('profile');
  await wait(80);
  t('答满后重开停在「已领工号」而不是结果页', !!d.querySelector('#body-profile .prof-id')
    && !d.querySelector('#body-profile .pass'));
  const toResult = d.querySelector('[data-act="result"]');
  t('「查看我的工牌」入口存在', !!toResult);
  if (toResult) toResult.click();
  await wait(80);
  t('点开后进入结果页', !!d.querySelector('#body-profile .pass'));

  APP.close();
  APP.util.setStage('intro');
  APP.state.answers = Array(10).fill(null);
  APP.open('profile');
  await wait(80);
  t('答案被清空后不再跳结果页', !d.querySelector('#body-profile .pass'));

  // ---- 好事看板：打卡 + 票码往返 ----
  APP.open('board');
  const good = d.querySelector('#body-board [data-add="cr"]');
  t('好事按钮存在', !!good);
  if (good) good.click();
  await wait(60);
  t('打卡后今日列表有 1 条', (APP.state.board.days[APP.util.today()] || []).length === 1);

  // ---- P3：KPI 四项全正向，且都渲染出来了 ----
  const mks = [...d.querySelectorAll('#body-board .metric')].map((el) => ({
    k: (el.querySelector('.metric__k') || {}).textContent || '',
    v: (el.querySelector('.metric__v') || {}).textContent || ''
  }));
  t('KPI 是四张卡', mks.length === 4, mks.length);
  t('KPI① 距下班', /距下班/.test(mks[0] && mks[0].k), mks[0] && mks[0].k);
  t('KPI② 今日奖金池（¥）', /奖金/.test(mks[1] && mks[1].k) && /¥/.test(mks[1] && mks[1].v),
    mks[1] && mks[1].k + '=' + mks[1].v);
  t('KPI③ 今日好事', /好事/.test(mks[2] && mks[2].k), mks[2] && mks[2].k);
  t('KPI④ 连续打卡', /连续/.test(mks[3] && mks[3].k), mks[3] && mks[3].k);
  t('KPI 无负向指标残留', !/冻结|告警数|等待/.test(mks.map((m) => m.k).join('')));
  t('看板折线画布存在', !!d.querySelector('#body-board canvas'));
  const ticket = APP.util.myTicket();
  t('票码可生成', /^G\d{3,4}\./.test(ticket), ticket && ticket.slice(0, 12));
  APP.state.team = {};
  const before = Object.keys(APP.state.team).length;
  const merged = APP.util.mergeTicket(ticket);
  t('票码可被合并（' + merged.msg + '）', merged.ok && Object.keys(APP.state.team).length === before + 1);

  // ---- 证书：改名字后重绘 ----
  APP.open('cert');
  await wait(60);
  const fName = d.getElementById('fName');
  t('证书表单存在', !!fName);
  if (fName) {
    fName.value = '张三丰';
    fName.dispatchEvent(new w.Event('input', { bubbles: true }));
    await wait(200);
  }
  t('改名写入状态', APP.state.cert.name === '张三丰');
  t('证书画布已挂载', !!d.querySelector('#certStage canvas'));

  // ---- 时光机：跑一次对照 ----
  APP.open('time');
  await wait(60);
  const sample = d.querySelector('#body-time [data-samp]');
  t('时光机示例卡存在', !!sample);
  if (sample) sample.click();
  await wait(200);
  const hitCount = d.querySelectorAll('#body-time .hit').length;
  t('老代码命中 ≥8 条规则（' + hitCount + '）', hitCount >= 8);
  t('代际坐标已渲染', !!d.querySelector('#body-time .timeline__now'));
  t('diff 已渲染', !!d.querySelector('#body-time .diff'));
  t('diff 是行级（每个 div 一整行）', (() => {
    const rows = d.querySelectorAll('#body-time .diff > div');
    return rows.length > 0 && rows.length < 120;
  })());
  // ---- P6：多年代样例，年份跨得开 ----
  const samps = [...d.querySelectorAll('#body-time [data-samp]')];
  t('时光机样例 ≥5 张卡', samps.length >= 5, samps.length);
  const eraNote = () => {
    const el = [...d.querySelectorAll('#body-time .note')]
      .filter((n) => n.textContent.indexOf('代际坐标') !== -1)[0];
    return el ? el.textContent : '';
  };
  const yearTxt1 = eraNote();
  if (samps.length > 1) { samps[samps.length - 1].click(); await wait(200); }
  const yearTxt2 = eraNote();
  t('切换样例后年份会变', !!yearTxt1 && yearTxt1 !== yearTxt2,
    (yearTxt1 || '(空)') + ' → ' + (yearTxt2 || '(空)'));
  t('年份文案分出「标注」与「估算」两支', /标注在 \d{4} 年/.test(yearTxt2) || /估算，这段代码停留在 \d{4} 年/.test(yearTxt2), yearTxt2);
  t('样例有标注年份', samps.length > 0 && samps.every((b) => /^20\d\d$/.test(b.textContent.trim()) || /20\d\d/.test(b.textContent)));

  // ---- 许愿机：摇一条 ----
  APP.open('wish');
  await wait(60);
  const lotBtn = d.querySelector('#body-wish [data-act="lot"]');
  t('摇愿望按钮存在', !!lotBtn);
  const wishTa = d.getElementById('wishText');
  const beforeWish = wishTa ? wishTa.value : '';
  if (lotBtn) { lotBtn.click(); await wait(1500); }
  t('摇出来的愿望写进了输入框', !!wishTa && wishTa.value.length > 0 && wishTa.value !== beforeWish,
    wishTa && wishTa.value);
  t('摇出的愿望来自愿望池', !!wishTa && APP.DATA.WISH_POOL.indexOf(wishTa.value) !== -1, wishTa && wishTa.value);

  // ---- 许愿机：封存 ----
  APP.open('wish');
  await wait(60);
  const ta = d.getElementById('wishText');
  if (ta) {
    ta.value = '希望明年的今天，我还在写代码。';
    d.querySelector('#body-wish [data-act="seal"]').click();
    await wait(60);
  }
  t('愿望已封存', APP.state.wishes.length >= 1);
  t('祝福语确定性', APP.util.blessFor(752, '希望明年的今天，我还在写代码。') === APP.util.blessFor(752, '希望明年的今天，我还在写代码。'));
  t('愿望卡已渲染', !!d.querySelector('#wishCard .wish-card__txt'));

  // ---- 需求翻译机：命中 + 兜底 ----
  APP.open('translate');
  await wait(80);
  t('翻译机有折叠态小样', !!d.querySelector('#body-translate .tr-mini'));
  const trTa = d.getElementById('trText');
  const goBtn = d.querySelector('#body-translate [data-act="go"]');
  t('翻译输入框与按钮存在', !!trTa && !!goBtn);
  const chip = d.querySelector('#body-translate [data-chip]');
  t('示例黑话 chip 存在', !!chip);
  if (chip) { chip.click(); await wait(60); }
  const cards = d.querySelectorAll('#body-translate #trOut .tr-card');
  t('命中后给出四栏（隐含需求/工作量/风险/排坑）', cards.length === 4, cards.length);
  t('四栏标题齐全', (() => {
    const heads = [...cards].map((c) => (c.querySelector('.tr-card__h') || {}).textContent || '').join('|');
    return ['隐含需求', '隐藏工作量', '风险点', '排坑提醒'].every((k) => heads.indexOf(k) !== -1);
  })(), [...cards].map((c) => (c.querySelector('.tr-card__h') || {}).textContent || '').join('|'));
  t('命中后显示黑话标签与危险等级', !!d.querySelector('#body-translate .tr-term')
    && !!d.querySelector('#body-translate .tr-lvl'));
  if (trTa && goBtn) {
    trTa.value = '这个页面再丝滑一点，你看着办吧';
    goBtn.click();
    await wait(60);
    t('手输也能命中（多句合并）', d.querySelectorAll('#body-translate #trOut .tr-card').length === 4);
    trTa.value = 'qwertyuiop 蓝色星期一';
    goBtn.click();
    await wait(60);
    t('翻不出来时给兜底提示', !!d.querySelector('#body-translate .tr-fb'));
  }
  t('翻译规则库够用', APP.DATA.TRANSLATIONS.length >= 20, APP.DATA.TRANSLATIONS.length);

  // ---- 路由与收起 ----
  APP.open('cert');
  t('路由写入 hash', w.location.hash === '#/cert');
  APP.close();
  t('关闭后 hash 复位', w.location.hash === '#/' || w.location.hash === '');
  t('关闭后无展开面板', d.querySelectorAll('.panel.is-open').length === 0);

  // ---- 结论 ----
  const realErrors = errors.filter((e) => !/Not implemented|Could not parse CSS/i.test(e));
  t('无未捕获 JS 错误', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

  console.log(out.join('\n'));
  const fails = out.filter((l) => l.indexOf('FAIL') !== -1).length;
  console.log('\n' + (fails ? '✗ ' + fails + ' 项失败' : '✓ 全部通过（' + out.length + ' 项）'));
  if (realErrors.length) console.log('错误详情：\n' + realErrors.join('\n'));
  w.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('冒烟测试异常：', e); process.exit(2); });
