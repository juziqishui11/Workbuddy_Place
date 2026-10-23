/**
 * 推送单个文件到仓库指定路径（用于改根 README 这类小改动）。
 * 用法：node tools/gh_put.js <仓库内路径> <本地文件> "<提交信息>"
 */
const fs = require('fs');
const https = require('https');

const OWNER = 'juziqishui11';
const REPO = 'Workbuddy_Place';
const BRANCH = 'main';
const PAT = fs.readFileSync('C:/Users/EDY/.workbuddy/secrets/github_pat.txt', 'utf8').trim();

const [repoPath, localFile, msg] = process.argv.slice(2);
if (!repoPath || !localFile) { console.error('用法: node tools/gh_put.js <repoPath> <localFile> "<msg>"'); process.exit(1); }

function req(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: 'api.github.com', path: apiPath, method,
      headers: {
        Authorization: 'Bearer ' + PAT, 'User-Agent': 'wb-delivery',
        Accept: 'application/vnd.github+json', 'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
      timeout: 120000,
    }, (res) => {
      let s = '';
      res.on('data', (d) => (s += d));
      res.on('end', () => {
        let j = null;
        try { j = s ? JSON.parse(s) : null; } catch (e) { j = { raw: s.slice(0, 300) }; }
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(j);
        else reject(new Error(method + ' ' + apiPath + ' -> ' + res.statusCode + ' ' + JSON.stringify(j).slice(0, 300)));
      });
    });
    r.on('timeout', () => r.destroy(new Error('timeout')));
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  const buf = fs.readFileSync(localFile);
  const ref = await req('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
  const parentSha = ref.object.sha;
  const base = await req('GET', `/repos/${OWNER}/${REPO}/git/commits/${parentSha}`);

  const blob = await req('POST', `/repos/${OWNER}/${REPO}/git/blobs`, {
    content: buf.toString('base64'), encoding: 'base64',
  });
  const tree = await req('POST', `/repos/${OWNER}/${REPO}/git/trees`, {
    base_tree: base.tree.sha,
    tree: [{ path: repoPath, mode: '100644', type: 'blob', sha: blob.sha }],
  });
  const commit = await req('POST', `/repos/${OWNER}/${REPO}/git/commits`, {
    message: msg || ('docs: update ' + repoPath), tree: tree.sha, parents: [parentSha],
  });
  await req('PATCH', `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, { sha: commit.sha, force: false });
  console.log('✓ ' + repoPath + ' <- ' + (buf.length / 1024).toFixed(1) + ' KB  commit ' + commit.sha.slice(0, 8));
})().catch((e) => { console.error('✗ ' + e.message); process.exit(1); });
