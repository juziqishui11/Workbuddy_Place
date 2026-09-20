// scripts/fetch_chs_tcg.mjs —— 下载宝可梦简体中文版 TCG 数据集（duanxr/PTCG-CHS-Datasets）
// 用途：为「卡面技能」提供官方中文卡名 / 招式 / 招式说明文本。
import fs from 'fs';
import https from 'https';

const CACHE = 'D:/workBuddy_place/.tmp/toy-collection-cache';
const OUT = CACHE + '/ptcg_chs_infos.json';
if (fs.existsSync(OUT) && fs.statSync(OUT).size > 1000000) {
  console.log('已存在', (fs.statSync(OUT).size / 1048576).toFixed(1) + 'MB，跳过');
  process.exit(0);
}

const RAW = 'https://raw.githubusercontent.com/duanxr/PTCG-CHS-Datasets/main/ptcg_chs_infos.json';
const MIRRORS = [
  'https://gh-proxy.com/' + RAW,
  'https://ghproxy.net/' + RAW,
  RAW
];

function download(url) {
  return new Promise((res) => {
    const t = setTimeout(() => res(null), 300000);
    let d = '';
    https.get(url, { headers: { 'User-Agent': 'node' } }, (r) => {
      if (r.statusCode !== 200) { r.destroy(); clearTimeout(t); res(null); return; }
      r.on('data', (c) => (d += c));
      r.on('end', () => {
        clearTimeout(t);
        if (d.length > 1000000) { fs.writeFileSync(OUT, d); res(d.length); }
        else res(null);
      });
    }).on('error', () => { clearTimeout(t); res(null); });
  });
}

(async () => {
  for (const u of MIRRORS) {
    const n = await download(u);
    if (n) { console.log('OK', (n / 1048576).toFixed(1) + 'MB  源=', u.slice(0, 44)); return; }
    console.log('失败', u.slice(0, 44));
  }
  console.log('ALL FAILED');
})();
