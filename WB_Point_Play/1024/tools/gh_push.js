/**
 * 把本目录推到 GitHub monorepo 的指定子目录。
 * 走 GitHub REST API + Git Data API（国内 git 直连不通，api.github.com 可用）。
 *
 * 用法：node tools/gh_push.js [--dry]
 * 常量按需改。
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const OWNER = 'juziqishui11';
const REPO = 'Workbuddy_Place';
const BRANCH = 'main';
const SRC = path.resolve(__dirname, '..');
const PREFIX = 'WB_Point_Play/1024';
const MSG = 'feat(1024): 新增「1024 码上好运」六面板互动看板\n\n'
  + '- 反向告警大盘：只记好事，四项正向 KPI + 累积阶梯曲线 + 奖金池\n'
  + '- 我的程序员设：10 道场景题 → 10 位二进制 → 0–1023 工号，16 型 × 64 编号全覆盖\n'
  + '- 持证上岗 / 代码时光机 / 许愿机 / 需求翻译机 四块面板\n'
  + '- 纯前端零依赖，localStorage 本地存储，可导出工牌与长图\n'
  + '- check.js 51 项静态校验、smoke.js 70 项无头交互用例';

const PAT = fs.readFileSync('C:/Users/EDY/.workbuddy/secrets/github_pat.txt', 'utf8').trim();

// 进仓库的内容：项目本体 + 工程脚本 + 文档；排除截图、本地记忆、发布标记
const EXCLUDE_DIRS = new Set(['.workbuddy', 'node_modules', '.git', 'tools']);
const EXCLUDE_FILE = /(^\.wbapp_.*\.genie$)|(\.png$)|(\.jpg$)|(\.bak$)|(^prep_img\.py$)/i;

function collect(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      if (EXCLUDE_DIRS.has(name)) continue;
      collect(abs, out);
    } else {
      if (EXCLUDE_FILE.test(name)) continue;
      out.push(abs);
    }
  }
  return out;
}

function req(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: 'api.github.com',
      path: apiPath,
      method,
      headers: {
        Authorization: 'Bearer ' + PAT,
        'User-Agent': 'wb-delivery',
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
      timeout: 180000,
    }, (res) => {
      let s = '';
      res.on('data', (d) => (s += d));
      res.on('end', () => {
        let j = null;
        try { j = s ? JSON.parse(s) : null; } catch (e) { j = { raw: s.slice(0, 400) }; }
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(j);
        else reject(new Error(method + ' ' + apiPath + ' -> ' + res.statusCode + ' ' + JSON.stringify(j).slice(0, 400)));
      });
    });
    r.on('timeout', () => r.destroy(new Error('timeout ' + apiPath)));
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  const dry = process.argv.includes('--dry');
  const files = collect(SRC);
  let bytes = 0;
  const items = files.map((abs) => {
    const rel = path.relative(SRC, abs).split(path.sep).join('/');
    const buf = fs.readFileSync(abs);
    bytes += buf.length;
    return { rel, abs, buf };
  });
  console.log('待推送 ' + items.length + ' 个文件，合计 ' + (bytes / 1024).toFixed(1) + ' KB → ' + PREFIX + '/');
  items.forEach((i) => console.log('  ' + String((i.buf.length / 1024).toFixed(1)).padStart(8) + ' KB  ' + PREFIX + '/' + i.rel));
  if (dry) return;

  const ref = await req('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
  const parentSha = ref.object.sha;
  console.log('\n父 commit: ' + parentSha.slice(0, 8));

  const base = await req('GET', `/repos/${OWNER}/${REPO}/git/commits/${parentSha}`);
  const baseTree = base.tree.sha;

  const tree = [];
  for (const it of items) {
    const blob = await req('POST', `/repos/${OWNER}/${REPO}/git/blobs`, {
      content: it.buf.toString('base64'),
      encoding: 'base64',
    });
    tree.push({ path: PREFIX + '/' + it.rel, mode: '100644', type: 'blob', sha: blob.sha });
  }
  console.log('blob 已上传 ' + tree.length + ' 个');

  const newTree = await req('POST', `/repos/${OWNER}/${REPO}/git/trees`, { base_tree: baseTree, tree });
  const commit = await req('POST', `/repos/${OWNER}/${REPO}/git/commits`, {
    message: MSG, tree: newTree.sha, parents: [parentSha],
  });
  await req('PATCH', `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, { sha: commit.sha, force: false });
  console.log('✓ 已提交 ' + commit.sha.slice(0, 8));
  console.log('https://github.com/' + OWNER + '/' + REPO + '/tree/' + BRANCH + '/' + PREFIX);
})().catch((e) => { console.error('✗ ' + e.message); process.exit(1); });
