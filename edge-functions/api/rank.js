// EdgeOne Pages 边缘函数：/api/rank
// GET  -> 榜单 Top50
// POST -> 提交成绩（同一用户只保留最高分），数据存于边缘 KV
//
// 依赖：在 EdgeOne 控制台创建 KV 命名空间（建议名 rankkv），
//       绑定到本项目后，通过环境变量 KV_NS 指定命名空间名（默认 rankkv）。

const KEY = 'rank:2048';

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }
  });
}
function clean(s, n) {
  s = String(s == null ? '' : s);
  s = Array.from(s).filter(function (c) { return c.codePointAt(0) >= 32; }).join('');
  return s.slice(0, n);
}
function isUrl(s) {
  try {
    const u = new URL(s);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.href.length <= 300;
  } catch (e) { return false; }
}
function getKV(env) {
  const ns = env.KV_NS || 'rankkv';
  return env[ns] || null;
}
async function readList(kv) {
  if (!kv) return [];
  try { const raw = await kv.get(KEY); return raw ? (JSON.parse(raw).list || []) : []; }
  catch (e) { return []; }
}
async function writeList(kv, list) {
  if (!kv) return;
  try { await kv.put(KEY, JSON.stringify({ list: list })); } catch (e) {}
}
function sortList(list) {
  return list.slice().sort(function (a, b) { return b.score - a.score; });
}

export default async function onRequest(ctx) {
  const env = (ctx && ctx.env) || {};
  const kv = getKV(env);
  const req = ctx.request;
  const method = req.method || 'GET';

  if (method === 'GET') {
    if (!kv) return json({ ok: false, error: 'kv_not_bound', list: [] });
    const list = sortList(await readList(kv)).slice(0, 50);
    return json({ ok: true, list: list });
  }

  if (method === 'POST') {
    if (!kv) return json({ ok: false, error: 'kv_not_bound' }, 500);
    let b;
    try { b = await req.json(); } catch (e) { b = null; }
    if (!b) return json({ error: 'bad_json' }, 400);

    const score = Math.max(0, Math.min(99999999, parseInt(b.score, 10) || 0));
    const max = Math.max(0, Math.min(999999, parseInt(b.max, 10) || 0));
    const openid = clean(b.openid, 64);
    const name = clean(b.name || '玩家', 12) || '玩家';
    const avatar = isUrl(b.avatar) ? b.avatar : '';
    if (score <= 0) return json({ error: 'zero_score' }, 400);

    const list = await readList(kv);
    const key = openid || ('local:' + name);
    const rec = {
      key: key, openid: openid, name: name, avatar: avatar, score: score, max: max,
      src: openid ? (openid.indexOf('demo_') === 0 ? 'demo' : 'wx') : 'local',
      date: new Date().toISOString(), ts: Date.now()
    };
    const i = list.findIndex(function (x) { return x.key === key; });
    if (i >= 0) { if (rec.score > list[i].score) { rec.date = list[i].date; list[i] = Object.assign({}, list[i], rec); } }
    else list.push(rec);
    await writeList(kv, sortList(list).slice(0, 200));

    const top = sortList(await readList(kv)).slice(0, 50);
    const mine = top.findIndex(function (x) { return x.key === key; });
    return json({ ok: true, list: top, mine: mine });
  }

  return json({ error: 'method_not_allowed' }, 405);
}
