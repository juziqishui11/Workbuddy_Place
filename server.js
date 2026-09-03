/**
 * 2048 排行榜后端（Node 原生，零依赖）
 *
 *   启动： node server.js
 *   配置： 复制 config.example.json 为 config.json，填入微信公众号 AppID / AppSecret
 *
 * 接口：
 *   GET  /api/config                 → { wxEnabled, appId }
 *   GET  /api/wx/login?code=xxx      → { openid, nickname, avatar }   （需配置 appId/appSecret）
 *   GET  /api/rank                   → { ok:true, list:[...50] }
 *   POST /api/rank                   → { ok:true, list:[...] }        提交成绩，同一用户只保留最高分
 *   POST /api/rank/clear {token}     → { ok:true }                    清空（需 adminToken）
 *
 * 微信网页授权前提（缺一不可）：
 *   1. 认证的服务号/订阅号，或测试号：https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login
 *   2. 公众号后台「设置 → 公众号设置 → 功能设置」配置【网页授权域名】（只填域名，不含 http）
 *   3. 页面必须通过该域名的 http/https 访问（80/443 端口），且 urlEncode 后的回调地址与当前页面一致
 *   4. 游戏需在微信内置浏览器打开；外部浏览器无法调起微信授权
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');
const CFG_FILE = path.join(ROOT, 'config.json');

let CFG = {};
try { CFG = JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); } catch (e) { CFG = {}; }
const PORT = Number(process.env.PORT || CFG.port || 8080);
const APP_ID = process.env.WX_APPID || CFG.appId || '';
const APP_SECRET = process.env.WX_SECRET || CFG.appSecret || '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || CFG.adminToken || '';
const HOST = CFG.host || '0.0.0.0';

/* ---------------- 存储 ---------------- */
function readData() {
  try { const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); return Array.isArray(d.list) ? d : { list: [] }; }
  catch (e) { return { list: [] }; }
}
function writeData(d) { try { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 1)); } catch (e) {} }

/* ---------------- 工具 ---------------- */
function send(res, code, obj, type, mime) {
  const bin = (type === 'text' || type === 'bin');
  const body = bin ? obj : JSON.stringify(obj);
  const ct = type === 'bin' ? (mime || 'application/octet-stream')
           : type === 'text' ? 'text/html' : 'application/json';
  res.writeHead(code, {
    'Content-Type': ct + (type === 'bin' ? '' : '; charset=utf-8'),
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  res.end(body);
}
function body(req) {
  return new Promise(resolve => {
    let s = '';
    req.on('data', c => {
      s += c;
      if (s.length > 1e6) { req.destroy(); resolve(null); }
    });
    req.on('end', () => {
      try { resolve(s ? JSON.parse(s) : {}); } catch (e) { resolve(null); }
    });
    req.on('error', () => resolve(null));
  });
}
const clean = (s, n) => String(s == null ? '' : s).replace(/[\x00-\x1f]/g, '').slice(0, n);
const isUrl = s => /^https?:\/\/[^\s"']{1,300}$/i.test(s || '');

function rankList() {
  return readData().list.slice().sort((a, b) => b.score - a.score).slice(0, 50);
}

/* ---------------- 微信 ---------------- */
async function wxLogin(code) {
  const t = await jget('https://api.weixin.qq.com/sns/oauth2/access_token?appid=' + APP_ID +
    '&secret=' + APP_SECRET + '&code=' + encodeURIComponent(code) + '&grant_type=authorization_code');
  if (!t || !t.openid) return null;
  const u = await jget('https://api.weixin.qq.com/sns/userinfo?access_token=' +
    encodeURIComponent(t.access_token) + '&openid=' + encodeURIComponent(t.openid) + '&lang=zh_CN');
  return {
    openid: t.openid,
    nickname: clean((u && u.nickname) || '微信用户', 24),
    avatar: isUrl(u && u.headimgurl) ? u.headimgurl : ''
  };
}
function jget(url) {
  return new Promise(resolve => {
    const t = setTimeout(() => resolve(null), 6000);
    try {
      fetch(url).then(r => r.json()).then(j => { clearTimeout(t); resolve(j); })
        .catch(() => { clearTimeout(t); resolve(null); });
    } catch (e) { clearTimeout(t); resolve(null); }
  });
}

/* ---------------- 路由 ---------------- */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = u.pathname;
  if (req.method === 'OPTIONS') return send(res, 204, {});

  /* ---- API ---- */
  if (p === '/api/config') {
    return send(res, 200, { wxEnabled: !!(APP_ID && APP_SECRET), appId: APP_ID, ranked: true });
  }
  if (p === '/api/wx/login') {
    if (!APP_ID || !APP_SECRET) return send(res, 200, { error: 'not_configured' });
    const code = u.searchParams.get('code') || '';
    if (!/^[\w-]{6,64}$/.test(code)) return send(res, 200, { error: 'bad_code' });
    const info = await wxLogin(code);
    return send(res, 200, info || { error: 'wx_failed' });
  }
  if (p === '/api/rank' && req.method === 'GET') {
    return send(res, 200, { ok: true, list: rankList() });
  }
  if (p === '/api/rank' && req.method === 'POST') {
    const b = await body(req);
    if (!b) return send(res, 200, { error: 'bad_json' });
    const score = Math.max(0, Math.min(99999999, parseInt(b.score, 10) || 0));
    const max = Math.max(0, Math.min(999999, parseInt(b.max, 10) || 0));
    const openid = clean(b.openid, 64);
    const name = clean(b.name || '玩家', 12) || '玩家';
    const avatar = isUrl(b.avatar) ? b.avatar : '';
    if (score <= 0) return send(res, 200, { error: 'zero_score' });

    const d = readData();
    const key = openid || ('local:' + name);
    const rec = {
      key, openid, name, avatar, score, max,
      src: openid ? (openid.indexOf('demo_') === 0 ? 'demo' : 'wx') : 'local',
      date: new Date().toISOString(),
      ts: Date.now()
    };
    const i = d.list.findIndex(x => x.key === key);
    if (i >= 0) { if (rec.score > d.list[i].score) { rec.date = d.list[i].date; d.list[i] = Object.assign(d.list[i], rec); } }
    else d.list.push(rec);
    d.list.sort((a, b2) => b2.score - a.score);
    d.list = d.list.slice(0, 200);
    writeData(d);
    return send(res, 200, { ok: true, list: rankList(), mine: rankList().findIndex(x => x.key === key) });
  }
  if (p === '/api/rank/clear' && req.method === 'POST') {
    const b = await body(req);
    if (!ADMIN_TOKEN || !b || b.token !== ADMIN_TOKEN) return send(res, 200, { error: 'forbidden' });
    writeData({ list: [] });
    return send(res, 200, { ok: true });
  }

  /* ---- 静态 ---- */
  let file = path.normalize(path.join(ROOT, p === '/' ? 'index.html' : p));
  if (!file.startsWith(ROOT)) return send(res, 403, 'forbidden', 'text');
  fs.readFile(file, (e, buf) => {
    if (e) return send(res, 404, 'not found', 'text');
    send(res, 200, buf, 'bin', MIME[path.extname(file)] || 'application/octet-stream');
  });
}).listen(PORT, HOST, () => {
  console.log('2048 server: http://localhost:' + PORT);
  console.log('wechat login: ' + (APP_ID && APP_SECRET ? 'enabled (' + APP_ID + ')' : 'disabled - 填 config.json 后启用'));
});
