// scripts/fetch_tcg_sets.mjs —— 下载覆盖全国图鉴 1-649 的 TCG 系列 JSON 到 cache
import fs from 'fs';
import https from 'https';
import path from 'path';

const CACHE = 'D:/workBuddy_place/.tmp/toy-collection-cache';
fs.mkdirSync(CACHE, { recursive: true });

// 覆盖 关都/城都/丰缘/神奥/合众 (1-649) 的英文系列 + 关键 promo
const SERIES = [
  'base1','base2','base3','base4','base5','base6',
  'gym1','gym2',
  'neo1','neo2','neo3','neo4',
  'ecard1','ecard2','ecard3','si1',
  'basep','np',
  'ex1','ex2','ex3','ex4','ex5','ex6','ex7','ex8','ex9','ex10','ex11','ex12','ex13','ex14','ex15','ex16',
  'dp1','dp2','dp3','dp4','dp5','dp6','dp7',
  'pl1','pl2','pl3','pl4',
  'hgss1','hgss2','hgss3','hgss4','col1','ru1','hsp',
  'bw1','bw2','bw3','bw4','bw5','bw6','bw7','bw8','bw9','bw10','bw11','xy0','dv1',
  'bwp','xyp','dpp',
  // XY / 后续世代英文系列（同样含 1-649 老宝可梦的卡面，用于「不同版本卡图」）
  'xy1','xy2','xy3','xy4','xy5','xy6','xy7','xy8','xy9','xy10','xy11',
  'g1','dc1','bp',
  // POP / McDonald's 促销系列（复古卡面）
  'pop1','pop2','pop3','pop4','pop5','pop6','pop7','pop8','pop9',
  'mcd11','mcd12','mcd14','mcd15'
];

function get(url) {
  return new Promise((res) => {
    let tries = 0;
    function attempt() {
      tries++;
      const t = setTimeout(() => { if (tries < 5) attempt(); else res(null); }, 45000);
      let d = '';
      https.get(url, (r) => {
        r.on('data', (c) => (d += c));
        r.on('end', () => { clearTimeout(t); res(d && d.length > 10 ? d : null); });
      }).on('error', () => { clearTimeout(t); if (tries < 5) attempt(); else res(null); });
    }
    attempt();
  });
}

async function main() {
  let ok = 0, fail = 0;
  for (const code of SERIES) {
    const file = path.join(CACHE, 'tcg_' + code + '.json');
    if (fs.existsSync(file) && fs.statSync(file).size > 1000) { ok++; continue; } // 已存在跳过
    const url = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/cards/en/' + code + '.json';
    const d = await get(url);
    if (d) {
      fs.writeFileSync(file, d);
      ok++;
      console.log('OK', code, (d.length / 1024 | 0) + 'KB');
    } else {
      fail++;
      console.log('FAIL', code);
    }
  }
  console.log('DONE ok=' + ok + ' fail=' + fail + ' / ' + SERIES.length);
}
main();
