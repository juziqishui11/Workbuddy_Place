import fs from 'fs';
const R = 'D:/workBuddy_place/toy-collection-mp/';

// 自动枚举：app.wxss + app.json 里每个页面的同名 wxss
// （硬编码名单曾漏检新增的 login 页 —— 新页面务必靠自动发现覆盖）
const wxss = (() => {
  const app = JSON.parse(fs.readFileSync(R + 'app.json', 'utf8'));
  const pages = (app.pages || []).slice();
  (app.subPackages || app.subpackages || []).forEach((sp) => {
    (sp.pages || []).forEach((p) => pages.push(sp.root + '/' + p));
  });
  return ['app.wxss'].concat(pages.map((p) => p + '.wxss')).filter((f) => fs.existsSync(R + f));
})();
let bad = 0;
for (const f of wxss) {
  const s = fs.readFileSync(R + f, 'utf8');
  const o = (s.match(/\{/g) || []).length, c = (s.match(/\}/g) || []).length;
  const ok = o === c;
  if (!ok) bad++;
  console.log(f.padEnd(26), o + '/' + c, ok ? 'OK' : 'MISMATCH');
}

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const app = strip(fs.readFileSync(R + 'app.wxss', 'utf8'));
const dex = strip(fs.readFileSync(R + 'pages/dex/dex.wxss', 'utf8'));
const gacha = strip(fs.readFileSync(R + 'pages/gacha/gacha.wxss', 'utf8'));
console.log('app.wxss 仍含 display:grid ?', /display:\s*grid/.test(app));
console.log('app.wxss .pk-card display:block ?', /\.pk-card\s*\{[^}]*display:\s*block/.test(app));
console.log('app.wxss .pk-card .img padding-top:140% ?', /\.pk-card \.img\s*\{[^}]*padding-top:\s*140%/.test(app));
console.log('app.wxss .cell width:33.33% ?', /\.cell\s*\{[^}]*width:\s*33\.33%/.test(app));
console.log('app.wxss .name nowrap ?', /\.pk-card \.name\s*\{[^}]*white-space:\s*nowrap/.test(app));
console.log('dex.wxss 仍含 display:grid ?', /display:\s*grid/.test(dex));
console.log('dex.wxss 仍覆盖 .cell 宽度 ?', /\.cell\s*\{[^}]*width/.test(dex));
console.log('gacha.wxss .r-img padding-top:140% ?', /\.r-img\s*\{[^}]*padding-top:\s*140%/.test(gacha));
console.log(bad ? 'HAS WXSS ERRORS' : 'ALL WXSS OK');
