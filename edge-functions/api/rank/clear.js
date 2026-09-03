// EdgeOne Pages 边缘函数：/api/rank/clear
// POST { token } → 清空榜单（需环境变量 ADMIN_TOKEN）
const KEY = 'rank:2048';

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }
  });
}
function getKV(env) {
  const ns = env.KV_NS || 'rankkv';
  return env[ns] || null;
}

export default async function onRequest(ctx) {
  const env = (ctx && ctx.env) || {};
  const kv = getKV(env);
  if (!kv) return json({ error: 'kv_not_bound' }, 500);
  if (!env.ADMIN_TOKEN) return json({ error: 'forbidden' }, 403);

  let b;
  try { b = await ctx.request.json(); } catch (e) { b = null; }
  if (!b || b.token !== env.ADMIN_TOKEN) return json({ error: 'forbidden' }, 403);

  try { await kv.put(KEY, JSON.stringify({ list: [] })); } catch (e) {}
  return json({ ok: true });
}
