// EdgeOne Pages 边缘函数：/api/wx/login?code=xxx
// 用微信授权 code 换取 openid / 昵称 / 头像（需 WX_APPID / WX_SECRET 环境变量）
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

export default async function onRequest(ctx) {
  const env = (ctx && ctx.env) || {};
  if (!(env.WX_APPID && env.WX_SECRET)) return json({ error: 'not_configured' });

  const url = new URL(ctx.request.url);
  const code = url.searchParams.get('code') || '';
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(code)) return json({ error: 'bad_code' });

  try {
    const t = await fetch(
      'https://api.weixin.qq.com/sns/oauth2/access_token?appid=' + env.WX_APPID +
      '&secret=' + env.WX_SECRET + '&code=' + encodeURIComponent(code) + '&grant_type=authorization_code'
    ).then(function (r) { return r.json(); });

    if (!t || !t.openid) return json({ error: 'wx_failed' });

    const u = await fetch(
      'https://api.weixin.qq.com/sns/userinfo?access_token=' + encodeURIComponent(t.access_token) +
      '&openid=' + encodeURIComponent(t.openid) + '&lang=zh_CN'
    ).then(function (r) { return r.json(); });

    return json({
      openid: t.openid,
      nickname: clean((u && u.nickname) || '微信用户', 24),
      avatar: isUrl(u && u.headimgurl) ? u.headimgurl : ''
    });
  } catch (e) {
    return json({ error: 'wx_failed' });
  }
}
