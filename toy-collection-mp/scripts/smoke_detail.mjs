// scripts/smoke_detail.mjs —— 详情页数据链路冒烟测试
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const source = require('D:/workBuddy_place/toy-collection-mp/utils/source.js');
// 分包：国际版卡面的技能数据（详情页在运行时用 require.async 加载，此处直接 require 以便回归）
const pkg = require('D:/workBuddy_place/toy-collection-mp/packageSkill/en-skills.js');

let bad = 0;
function check(ok, msg) { if (!ok) { bad++; console.log('  ✗ ' + msg); } }

/** 取国际版卡面的技能（来自分包），返回 [{kind:'atk'|'ft', name, cost, dmg, text}] */
function pkgSkills(img) {
  const e = pkg.C[source.intlCardKey(img)];
  if (!e) return null;
  const T = (i) => (i >= 0 ? (pkg.Z[i] || pkg.T[i]) : '');
  const Nm = (i) => (i >= 0 ? (pkg.ZN[i] || pkg.N[i]) : '');
  const out = [];
  (e[7] || []).forEach((a) => out.push({
    kind: 'atk', name: Nm(a[0]), dz: a[1],
    cost: (a[2] || []).map((i) => pkg.E[i][0]).join(''), text: T(a[3])
  }));
  (e[6] || []).forEach((a) => out.push({ kind: 'ft', name: Nm(a[0]), text: T(a[2]) }));
  return out;
}

function probe(seriesId, figureId, label) {
  const found = source.findFigure(seriesId, figureId);
  if (!found) { bad++; console.log('✗ 找不到 ' + label); return; }
  const f = found.figure;
  const card = source.mainCard(f);
  const vers = source.cardVersions(f);
  const evo = source.evolutionOf(f);
  console.log('=== ' + label + ' ' + f.name + ' ===');
  console.log('  主卡图:', card ? card.img.slice(0, 78) : '无');
  console.log('  卡名:', card ? card.name + ' | 卡号 ' + card.no + ' | 系列 ' + card.setName + ' | ' + card.hp + 'HP | ' + card.attr + ' | ' + (card.intl ? '国际版' : '中文版') : '—');
  (card ? card.atk : []).forEach((a) => {
    console.log('  招式:', a.name, '| 能量', a.cost.map((c) => c.n).join('') || '无', '| 伤害', a.dmg || '—');
    console.log('        ', a.text || '(无说明)');
    check(/[\u4e00-\u9fa5]/.test(a.name), '招式名应为中文: ' + a.name);
    if (a.text) check(!/^[A-Za-z0-9 ,.'’\-]+$/.test(a.text), '招式说明应为中文: ' + a.text.slice(0, 20));
    a.cost.forEach((c) => check(!!c.c, '能量色缺失 ' + c.n));
  });
  (card ? card.ft : []).forEach((t) => {
    console.log('  特性:', t.name, '|', t.text || '(无说明)');
    check(/[\u4e00-\u9fa5]/.test(t.name), '特性名应为中文: ' + t.name);
  });
  // 国际版卡面：技能由分包提供，必须命中且为中文（这是「点开国际版卡面只有英文」的回归）
  if (card && card.intl) {
    const sk = pkgSkills(card.img);
    if (!sk) {
      bad++; console.log('  ✗ 国际版主卡面在分包中无技能数据: ' + card.img);
    } else {
      sk.forEach((a) => {
        if (a.kind === 'atk') console.log('  [分包招式]', a.name, '| 能量', a.cost || '无', '| 伤害', a.dz || '—', '\n        ', a.text || '(无说明)');
        else console.log('  [分包特性]', a.name, '|', a.text || '(无说明)');
        check(/[\u4e00-\u9fa5]/.test(a.name), '分包技能名应为中文: ' + a.name);
        if (a.text) check(!/^[A-Za-z0-9 ,.'’\-]+$/.test(a.text), '分包技能说明应为中文: ' + a.text.slice(0, 24));
      });
      check(sk.length > 0, '国际版卡面分包技能为空: ' + card.img);
    }
  }
  console.log('  卡面版本:', vers.length, '->', vers.map((v) => v.setName + '#' + v.no).join(', '));
  vers.forEach((v) => { check(/^https:\/\//.test(v.img), '版本图 URL 异常 ' + v.img); check(!!v.setName, '版本系列名为空'); });
  console.log('  进化: 前', evo.from.map((x) => x.name).join('/') || '—', '| 后', evo.to.map((x) => x.name).join('/') || '—', '| 链', evo.chain.length, '| 分叉', evo.branch);
  console.log('  列表主图:', source.figureImage(f).slice(0, 70));
  console.log('');
}

probe('kanto', 'pk-006', '喷火龙');
probe('kanto', 'pk-025', '皮卡丘');
probe('kanto', 'pk-133', '伊布');
probe('johto', 'pk-152', '菊草叶');
probe('unova', 'pk-494', '比克提尼');
probe('unova', 'pk-496', '青藤蛇(无中文卡)');

// 全量体检
const all = source.getSource().series.flatMap((s) => s.figures);
let noCard = 0, noTcg = 0, noAtk = 0, enName = 0, badUrl = 0, versSum = 0;
let intlMain = 0, intlMissPkg = 0;
all.forEach((f) => {
  // 真正无展示图（极端）：连精灵图兜底都没有才计
  if (!source.figureImage(f)) noCard++;
  // 无中文卡面 且 无国际版卡面：详情页会用 official artwork / 精灵图兜底（650+ 数据来源限制，可接受）
  if (!f.cn && !f.enArt) noTcg++;
  const c = source.mainCard(f);
  if (c) {
    if (c.intl) {
      // 国际版主卡面（含「无中文卡」的宝可梦）：技能必须由分包提供
      intlMain++;
      const sk = pkgSkills(c.img);
      if (!sk || !sk.length) intlMissPkg++;
    } else {
      if (!c.atk.length && !c.ft.length) noAtk++;
      c.atk.concat(c.ft).forEach((x) => { if (!/[\u4e00-\u9fa5]/.test(x.name)) enName++; });
    }
    if (!/^https:\/\//.test(c.img)) badUrl++;
  }
  versSum += source.cardVersions(f).length;
});

// 分包全量体检：所有技能名 / 说明都必须是中文（缺失译文会回落英文 → 计为未译）
let pkgCards = 0, pkgNameEn = 0, pkgTextEn = 0;
for (const k in pkg.C) {
  pkgCards++;
  const e = pkg.C[k];
  const isEn = (s) => s && !/[\u4e00-\u9fa5]/.test(s);
  (e[6] || []).forEach((a) => {
    if (a[0] >= 0) { if (isEn(pkg.ZN[a[0]] || pkg.N[a[0]])) pkgNameEn++; if (isEn(pkg.Z[a[2]] || pkg.T[a[2]])) pkgTextEn++; }
  });
  (e[7] || []).forEach((a) => {
    if (a[0] >= 0) { if (isEn(pkg.ZN[a[0]] || pkg.N[a[0]])) pkgNameEn++; if (isEn(pkg.Z[a[3]] || pkg.T[a[3]])) pkgTextEn++; }
  });
  (e[8] || []).forEach((i) => { if (i >= 0 && isEn(pkg.Z[i] || pkg.T[i])) pkgTextEn++; });
}

console.log('全量: 真实无图 ' + noCard + ' | 无TCG卡面(art兜底) ' + noTcg + ' | 有卡面无技能 ' + noAtk + ' | 非中文技能名 ' + enName + ' | 图 URL 异常 ' + badUrl + ' | 版本均 ' + (versSum / all.length).toFixed(1));
console.log('分包: 卡 ' + pkgCards + ' | 国际版主卡面 ' + intlMain + ' 缺分包 ' + intlMissPkg + ' | 未中文化 名称 ' + pkgNameEn + ' / 说明 ' + pkgTextEn);
check(noCard === 0, '存在真实无图的宝可梦 ' + noCard);
check(pkgCards > 0, '分包为空（提取脚本索引可能键不匹配）');
check(intlMain > 0, '没有任何国际版主卡面的宝可梦（数据异常）');
check(enName === 0, '存在非中文技能名 ' + enName);
check(badUrl === 0, '存在异常卡图 URL');
check(intlMissPkg === 0, '国际版主卡面缺少分包技能 ' + intlMissPkg);
check(pkgNameEn === 0, '分包存在未中文化的技能名 ' + pkgNameEn);
check(pkgTextEn === 0, '分包存在未中文化的技能说明 ' + pkgTextEn);
console.log(bad ? 'FAILED (' + bad + ')' : 'ALL OK');
