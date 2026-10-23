/**
 * 把「1024 码上好运」发布到 GitHub Pages（gh-pages 分支的 1024/ 目录）。
 *
 * 背景：本仓库的 GitHub Pages 站点源 = gh-pages 分支 / 根目录，
 *       站点地址 https://juziqishui11.github.io/Workbuddy_Place/
 *       约定「一个子目录 = 一个独立应用」，与 HowToLiveBetter/ 同级。
 *
 * 走 Git Data API（国内 git 直连不通，api.github.com 可用）。
 * 幂等：目标目录若已存在旧文件，会一并删除后再写入，可安全重跑。
 *
 * 用法：
 *   node tools/gh_pages.js --dry     # 只打印清单，不写
 *   node tools/gh_pages.js           # 正式发布
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const OWNER = 'juziqishui11';
const REPO = 'Workbuddy_Place';
const BRANCH = 'gh-pages';
const DEST = '1024';
const SRC = path.resolve(__dirname, '..');
const MESSAGE = 'deploy(1024): 发布「1024 码上好运」到 GitHub Pages\n\n'
  + '- 站点路径：/Workbuddy_Place/1024/\n'
  + '- 六面板互动看板：人设 / 看板 / 持证 / 时光机 / 许愿机 / 翻译机';

const PAT = fs.readFileSync('C:/Users/EDY/.workbuddy/secrets/github_pat.txt', 'utf8').trim();
const DRY = process.argv.includes('--dry');

/* ---------- 收集要发布的静态资源（白名单，避免把脚本与文档推上去） ---------- */
function collect() {
  const out = [];
  const add = (abs) => {
    out.push({ abs, repo: DEST + '/' + path.relative(SRC, abs).split(path.sep).join('/') });
  };
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const abs = path.join(dir, name);
      const st = fs.statSync(abs);
      if (st.isDirectory()) walk(abs);
      else if (!/\.md$/i.test(name)) add(abs);   // assets 里的说明文档不用上线
    }
  };

  add(path.join(SRC, 'index.html'));
  walk(path.join(SRC, 'css'));
  walk(path.join(SRC, 'js'));
  walk(path.join(SRC, 'assets'));
  return out.sort((a, b) => a.repo.localeCompare(b.repo));
}

/* ---------- HTTP ---------- */
function api(method, p, body) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: p,
      method,
      headers: {
        'User-Agent': 'wb-1024-deploy',
        Authorization: 'Bearer ' + PAT,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        let j = null;
        try { j = JSON.parse(d); } catch (e) {}
        resolve({ status: res.statusCode, json: j, raw: d });
      });
    });
    req.on('error', (e) => resolve({ status: 0, json: null, raw: String(e) }));
    if (data) req.write(data);
    req.end();
  });
}

async function must(method, p, body, label) {
  const r = await api(method, p, body);
  if (r.status < 200 || r.status >= 300) {
    throw new Error(`${label} 失败 [${r.status}] ${r.raw.slice(0, 300)}`);
  }
  return r.json;
}

/* 小并发跑 blob */
async function pool(items, limit, worker) {
  const res = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      res[idx] = await worker(items[idx], idx);
    }
  }));
  return res;
}

(async () => {
  const files = collect();
  const total = files.reduce((s, f) => s + fs.statSync(f.abs).size, 0);
  console.log(`待发布 ${files.length} 个文件，共 ${(total / 1024).toFixed(1)} KB`);
  console.log(`目标：${OWNER}/${REPO} @ ${BRANCH} → ${DEST}/`);
  files.forEach((f) => console.log('  ', String(fs.statSync(f.abs).size).padStart(8), f.repo));
  if (DRY) { console.log('\n--dry：仅预览，未写入。'); return; }

  /* 1. 当前 head */
  const ref = await must('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`, null, '读取分支');
  const headSha = ref.object.sha;
  const headCommit = await must('GET', `/repos/${OWNER}/${REPO}/git/commits/${headSha}`, null, '读取提交');
  const baseTree = headCommit.tree.sha;
  console.log(`\n当前 ${BRANCH} = ${headSha.slice(0, 8)} (tree ${baseTree.slice(0, 8)})`);

  /* 2. 清理目标目录旧条目（保证幂等） */
  const oldTree = await must('GET', `/repos/${OWNER}/${REPO}/git/trees/${baseTree}?recursive=1`, null, '读取现有树');
  const stale = (oldTree.tree || [])
    .filter((x) => x.path === DEST || x.path.startsWith(DEST + '/'))
    .map((x) => ({ path: x.path, mode: x.mode, type: x.type, sha: null }));
  if (stale.length) console.log(`清理旧条目 ${stale.length} 个`);

  /* 3. 上传 blob */
  const blobs = await pool(files, 6, async (f) => {
    const content = fs.readFileSync(f.abs).toString('base64');
    const b = await must('POST', `/repos/${OWNER}/${REPO}/git/blobs`,
      { content, encoding: 'base64' }, '上传 ' + f.repo);
    process.stdout.write('.');
    return { path: f.repo, mode: '100644', type: 'blob', sha: b.sha };
  });
  console.log('\nblob 上传完成');

  /* 4. 建树 */
  const tree = await must('POST', `/repos/${OWNER}/${REPO}/git/trees`,
    { base_tree: baseTree, tree: [...stale, ...blobs] }, '创建树');
  console.log(`新树 ${tree.sha.slice(0, 8)}`);

  /* 5. 提交 */
  const commit = await must('POST', `/repos/${OWNER}/${REPO}/git/commits`,
    { message: MESSAGE, tree: tree.sha, parents: [headSha] }, '创建提交');
  console.log(`新提交 ${commit.sha.slice(0, 8)}`);

  /* 6. 更新分支 */
  await must('PATCH', `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`,
    { sha: commit.sha, force: false }, '更新分支');

  console.log(`\n已推送。线上地址：`);
  console.log(`  https://${OWNER.toLowerCase()}.github.io/${REPO}/${DEST}/`);
  console.log('（Pages 构建通常 30–90 秒，稍等再刷新）');
})().catch((e) => { console.error('\n失败：' + e.message); process.exit(1); });
