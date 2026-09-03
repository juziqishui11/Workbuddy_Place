// EdgeOne Pages 边缘函数：/api/config
// 返回是否启用微信登录（需配置 WX_APPID / WX_SECRET 环境变量）
export default async function onRequest(ctx) {
  const env = (ctx && ctx.env) || {};
  const enabled = !!(env.WX_APPID && env.WX_SECRET);
  return new Response(
    JSON.stringify({ wxEnabled: enabled, appId: enabled ? env.WX_APPID : '', ranked: true }),
    { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }
  );
}
