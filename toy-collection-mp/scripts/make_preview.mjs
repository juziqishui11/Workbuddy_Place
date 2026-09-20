// scripts/make_preview.mjs —— 用真实数据渲染「详情页」离线预览（浏览器直接打开）
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const source = require('D:/workBuddy_place/toy-collection-mp/utils/source.js');

const PICKS = [
  ['kanto', 'pk-006', '喷火龙'],
  ['kanto', 'pk-133', '伊布'],
  ['johto', 'pk-152', '菊草叶'],
  ['unova', 'pk-496', '青藤蛇（无中文卡）']
];

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function energyDots(list) {
  if (!list || !list.length) return '';
  return '<span class="cost">' + list.map((e) => '<i style="background:' + e.c + '">' + esc(e.n) + '</i>').join('') + '</span>';
}

function render(found, title) {
  const f = found.figure;
  const card = source.mainCard(f);
  const vers = source.cardVersions(f);
  const evo = source.evolutionOf(f);
  const img = (card && card.img) || f.art || f.sprite;

  let skills = '';
  if (card && (card.atk.length || card.ft.length)) {
    skills += '<div class="card"><div class="stitle">卡面技能<span class="ssub">取自该卡面 · 中文</span></div>';
    card.ft.forEach((t) => {
      skills += '<div class="ft"><div class="fth"><span class="fttag">特性</span><b>' + esc(t.name) + '</b></div>' +
        (t.text ? '<div class="sktext">' + esc(t.text) + '</div>' : '') + '</div>';
    });
    card.atk.forEach((a) => {
      skills += '<div class="atk"><div class="atkh">' + energyDots(a.cost) + '<b>' + esc(a.name) + '</b><span class="dmg">' + esc(a.dmg || '—') + '</span></div>' +
        (a.text ? '<div class="sktext">' + esc(a.text) + '</div>' : '') + '</div>';
    });
    if (card.intl) skills += '<div class="intl">该宝可梦暂无简体中文版卡面，以上为国际版卡面。</div>';
    skills += '</div>';
  }

  let versHtml = '';
  if (vers.length > 1) {
    versHtml = '<div class="card"><div class="stitle">卡面版本<span class="ssub">共 ' + vers.length + ' 张 · 点击放大</span></div>' +
      '<div class="verrow">' + vers.map((v) =>
        '<div class="ver ' + (v.main ? 'on' : '') + '"><div class="verimg"><img src="' + v.img + '" loading="lazy"></div>' +
        '<div class="verset">' + esc(v.setName) + '</div><div class="verno">#' + esc(v.no) +
        (v.rarity && v.rarity !== '无标记' ? '<em>' + esc(v.rarity) + '</em>' : '') + '</div></div>').join('') +
      '</div></div>';
  }

  const evoItem = (x) => '<div class="evoitem" data-go="' + x.seriesId + '/' + x.id + '">' +
    '<div class="evoimg"><img src="' + x.thumb + '" loading="lazy"></div>' +
    '<div class="evoname">' + esc(x.name) + '</div><div class="evocode">No.' + esc(x.code) + '</div></div>';

  let evoHtml = '';
  if (evo.has) {
    evoHtml = '<div class="card"><div class="stitle">进化关系</div>';
    if (evo.from.length) evoHtml += '<div class="evorow"><span class="evok">进化前</span><div class="evolist">' + evo.from.map(evoItem).join('') + '</div></div>';
    if (evo.to.length) evoHtml += '<div class="evorow"><span class="evok">进化后</span><div class="evolist">' + evo.to.map(evoItem).join('') + '</div></div>';
    if (evo.chain.length > 1) {
      evoHtml += '<div class="chainwrap"><div class="chaink">同族全链（' + evo.chain.length + '）' + (evo.branch ? ' · 含分支进化' : '') + '</div><div class="chainrow">' +
        evo.chain.map((x, i) => (i ? '<span class="sep">' + (evo.branch ? '·' : '›') + '</span>' : '') +
          '<div class="chip ' + (x.mark === 'cur' ? 'cur' : '') + '"><div class="chipimg"><img src="' + x.thumb + '" loading="lazy"></div><div class="chipname">' + esc(x.name) + '</div></div>').join('') +
        '</div></div>';
    }
    evoHtml += '</div>';
  }

  const statLbl = { hp: 'HP', atk: '攻击', def: '防御', spa: '特攻', spd: '特防', spe: '速度' };
  const stats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].map((k) =>
    '<div class="strow"><span>' + statLbl[k] + '</span><div class="stbar"><i style="width:' + Math.min(100, f.base[k] / 2) + '%;background:' + f.color + '"></i></div><b>' + f.base[k] + '</b></div>').join('');

  return '<div class="phone">' +
    '<div class="nav">' + esc(f.name) + '</div>' +
    '<div class="body">' +
      '<div class="tcgwrap"><img src="' + img + '" onerror="this.src=\'' + f.art + '\'"></div>' +
      (card ? '<div class="cap">' + esc(card.name) + (card.no ? ' · ' + esc(card.no) : '') + ' · ' + esc(card.setName) +
        (card.hp ? ' · ' + card.hp + 'HP' : '') + (card.attr ? ' · ' + esc(card.attr) : '') + '</div>' : '') +
      '<div class="headrow"><div class="hname">' + esc(f.name) + '</div><span class="rtag">' + esc(f.rarity) + '</span></div>' +
      '<div class="sub">' + esc(f.sub) + ' · No.' + esc(f.code) + ' · ' + esc(found.series.name) + '</div>' +
      '<div class="types"><span class="ttag" style="background:' + f.color + '">' + esc(f.types) + '</span></div>' +
      skills + versHtml +
      (f.desc ? '<div class="card desccard"><div class="stitle">图鉴描述</div><div class="desc">' + esc(f.desc) + '</div></div>' : '') +
      '<div class="card"><div class="stitle">图鉴信息</div>' +
        '<div class="hw"><div><span>身高</span><b>' + f.height_m + ' m</b></div><div><span>体重</span><b>' + f.weight_kg + ' kg</b></div></div>' +
        '<div class="divider"></div><div class="stitle">种族值（合计 ' + Object.keys(f.base).reduce((s, k) => s + f.base[k], 0) + '）</div>' + stats + '</div>' +
      evoHtml +
      '<div class="card"><div class="stitle">游戏数据 · 招式特性<span class="ssub">主线游戏数据，非卡面技能</span></div>' +
        '<div class="ab"><span>特性</span>' + f.abilities.map((a) => esc(a.name) + (a.hidden ? '(隐)' : '')).join(' / ') + '</div>' +
        f.moves.map((m) => '<div class="move"><div><b>' + esc(m.name) + '</b><div class="mmeta"><span class="mchip">' + esc(m.type) + '</span>' + esc(m.cls) + '</div></div><div class="mdmg">' + (m.power || '—') + '</div></div>').join('') +
      '</div>' +
    '</div></div>';
}

const cards = PICKS.map(([sid, fid, label]) => {
  const found = source.findFigure(sid, fid);
  return render(found, label);
}).join('');

const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>口袋卡牌助手 · 详情页预览（中文卡面）</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #EEF3FB; font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; color: #1F2733; }
  header { padding: 28px 32px 12px; }
  h1 { margin: 0 0 6px; font-size: 22px; }
  .lead { color: #5B6472; font-size: 14px; line-height: 1.7; max-width: 1100px; }
  .lead b { color: #3B7DDD; }
  .frame { display: flex; gap: 24px; overflow-x: auto; padding: 20px 32px 48px; align-items: flex-start; }
  .phone { flex: 0 0 400px; width: 400px; background: #EEF3FB; border-radius: 22px; overflow: hidden; box-shadow: 0 14px 40px rgba(30,60,120,.16); border: 1px solid #DCE5F2; }
  .nav { background: #3B7DDD; color: #fff; font-weight: 700; font-size: 16px; padding: 13px 18px; text-align: center; }
  .body { padding: 12px 14px 28px; max-height: 82vh; overflow-y: auto; }
  .tcgwrap { background: #F4F7FB; border-radius: 12px; padding: 8px; text-align: center; box-shadow: 0 8px 22px rgba(30,60,120,.18); }
  .tcgwrap img { width: 100%; max-height: 430px; object-fit: contain; display: block; }
  .cap { text-align: center; font-size: 12px; color: #8A93A3; margin-top: 8px; }
  .headrow { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
  .hname { font-size: 21px; font-weight: 800; }
  .rtag { font-size: 12px; font-weight: 700; color: #5B6472; background: #EEF1F5; border-radius: 999px; padding: 3px 12px; }
  .sub { font-size: 12px; color: #8A93A3; margin-top: 3px; }
  .types { margin-top: 7px; }
  .ttag { display: inline-block; color: #fff; font-size: 11px; font-weight: 700; border-radius: 999px; padding: 3px 13px; }
  .card { background: #fff; border-radius: 12px; padding: 12px 14px; margin-top: 11px; box-shadow: 0 6px 16px rgba(30,60,120,.07); }
  .stitle { font-size: 14px; font-weight: 800; margin-bottom: 9px; }
  .ssub { font-size: 11px; font-weight: 500; color: #9AA0AC; margin-left: 8px; }
  .ft { background: #FFFBF0; border-left: 3px solid #E8A33D; border-radius: 8px; padding: 9px 11px; margin-bottom: 8px; }
  .fth { display: flex; align-items: center; gap: 7px; }
  .fttag { background: #E8A33D; color: #fff; font-size: 10px; font-weight: 800; border-radius: 999px; padding: 1px 8px; }
  .fth b { font-size: 14px; }
  .atk { background: #F6F8FC; border-left: 3px solid #3B7DDD; border-radius: 8px; padding: 9px 11px; margin-bottom: 7px; }
  .atkh { display: flex; align-items: center; gap: 8px; }
  .atkh b { flex: 1; font-size: 14px; }
  .cost { display: inline-flex; gap: 3px; }
  .cost i { width: 17px; height: 17px; border-radius: 50%; color: #fff; font-size: 10px; font-style: normal; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .dmg { font-size: 18px; font-weight: 800; }
  .sktext { font-size: 12.5px; line-height: 1.62; color: #4A5568; margin-top: 5px; }
  .intl { font-size: 11px; color: #9AA0AC; }
  .verrow { display: flex; gap: 9px; overflow-x: auto; padding-bottom: 4px; }
  .ver { flex: 0 0 88px; width: 88px; border: 2px solid transparent; border-radius: 9px; padding: 4px; }
  .ver.on { border-color: #3B7DDD; background: #F4F8FF; }
  .verimg { width: 100%; height: 122px; border-radius: 6px; overflow: hidden; background: #F1F5FB; }
  .verimg img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .verset { font-size: 10.5px; font-weight: 700; margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .verno { font-size: 9.5px; color: #8A93A3; white-space: nowrap; }
  .verno em { color: #B7791F; font-style: normal; font-weight: 700; margin-left: 4px; }
  .desccard { border-left: 4px solid #3B7DDD; }
  .desc { font-size: 13px; line-height: 1.75; color: #3C4656; }
  .hw { display: flex; gap: 9px; }
  .hw > div { flex: 1; background: #F4F7FB; border-radius: 9px; padding: 10px; text-align: center; }
  .hw span { display: block; font-size: 11px; color: #8A93A3; }
  .hw b { display: block; font-size: 15px; margin-top: 2px; }
  .divider { height: 1px; background: #EDEFF4; margin: 12px 0; }
  .strow { display: flex; align-items: center; gap: 9px; margin: 6px 0; font-size: 12px; }
  .strow > span { width: 34px; color: #5B6472; font-weight: 600; }
  .stbar { flex: 1; height: 9px; background: #EDF1F7; border-radius: 999px; overflow: hidden; }
  .stbar i { display: block; height: 100%; border-radius: 999px; }
  .strow b { width: 30px; text-align: right; font-size: 12px; }
  .evorow { display: flex; align-items: flex-start; margin-bottom: 8px; }
  .evok { width: 44px; flex-shrink: 0; font-size: 12px; font-weight: 700; color: #8A93A3; line-height: 20px; }
  .evolist { flex: 1; display: flex; flex-wrap: wrap; }
  .evoitem { width: 66px; margin: 0 8px 8px 0; }
  .evoimg { width: 100%; height: 90px; border-radius: 7px; overflow: hidden; background: #F1F5FB; border: 1px solid #EDF1F7; }
  .evoimg img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .evoname { font-size: 11.5px; font-weight: 700; text-align: center; margin-top: 3px; }
  .evocode { font-size: 10px; color: #9AA0AC; text-align: center; }
  .chainwrap { border-top: 1px solid #F0F2F6; padding-top: 9px; margin-top: 3px; }
  .chaink { font-size: 11.5px; color: #8A93A3; font-weight: 600; }
  .chainrow { display: flex; align-items: center; overflow-x: auto; padding-top: 7px; }
  .chainrow .sep { color: #C2CAD6; font-size: 15px; margin: 0 5px; flex-shrink: 0; }
  .chip { flex: 0 0 52px; width: 52px; text-align: center; background: #F6F8FC; border-radius: 8px; padding: 5px 2px; }
  .chip.cur { background: #F4F8FF; box-shadow: inset 0 0 0 2px #3B7DDD; }
  .chipimg { width: 34px; height: 34px; border-radius: 50%; overflow: hidden; margin: 0 auto; background: #EDF1F7; }
  .chipimg img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .chipname { font-size: 10px; color: #5B6472; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chip.cur .chipname { color: #1F2733; font-weight: 800; }
  .ab { font-size: 12.5px; padding-bottom: 8px; }
  .ab span { color: #5B6472; font-weight: 700; margin-right: 7px; }
  .move { display: flex; align-items: center; justify-content: space-between; background: #F6F8FC; border-radius: 8px; padding: 8px 11px; margin-bottom: 7px; border-left: 3px solid #3B7DDD; }
  .move b { font-size: 13.5px; }
  .mmeta { font-size: 11px; color: #8A93A3; margin-top: 3px; }
  .mchip { background: #888; color: #fff; border-radius: 999px; padding: 1px 8px; font-weight: 700; margin-right: 5px; }
  .mdmg { font-size: 18px; font-weight: 800; }
</style></head>
<body>
<header>
  <h1>口袋卡牌助手 · 详情页预览（官方简体中文版卡面）</h1>
  <p class="lead">
    下面 4 个手机框由 <b>data/pokemon.js 真实数据</b> 渲染，可直接对照。
    <b>卡面技能</b> 取自该卡面自身的中文招式 / 特性（能量需求 · 伤害 · 规则说明），与卡图一一对应；
    <b>卡面版本</b> 是同一只宝可梦在不同商品 / 系列里的其他中文卡面；
    <b>进化关系</b> 含进化前 / 进化后 / 同族全链（伊布那种分支进化也支持）。
    最下面「游戏数据 · 招式特性」是主线游戏数据，和卡面技能是两回事。
  </p>
</header>
<div class="frame">
${cards}
</div>
</body></html>`;

fs.writeFileSync('D:/workBuddy_place/.tmp/toy-detail-preview.html', html);
console.log('WROTE D:/workBuddy_place/.tmp/toy-detail-preview.html', (html.length / 1024).toFixed(0) + 'KB');
