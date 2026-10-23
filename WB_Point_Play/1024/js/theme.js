/* 主题镜像 —— CSS 是唯一真源。
   模块加载时读一次 CSS 变量并缓存成纯色字符串：
   getComputedStyle 在 canvas 高频绘制里太贵，且 canvas 解析不了 gradient 变量。
   无 DOM 环境（check.js 的 vm）下退回 fallback。 */
(function () {
  const FALLBACK = {
    bg: '#F7F6FC', bg2: '#EFECFA', surface: '#FFFFFF', surface2: '#F4F2FC', surface3: '#E9E5F7',
    glass: 'rgba(255,255,255,.72)', glassLine: 'rgba(255,255,255,.65)', paper: '#FFF8EC',
    ink: '#191428', ink2: '#241D3A', ink3: '#2E2548',
    tx: '#191428', tx2: '#4E4667', tx3: '#6F6788', tx4: '#9A93AD',
    line: 'rgba(25,20,40,.08)', line2: 'rgba(25,20,40,.14)', line3: 'rgba(25,20,40,.22)',
    lineNeon: 'rgba(108,76,241,.28)',

    violet: '#6C4CF1', violetSoft: '#EDE9FF', violetInk: '#4B2BC9',
    magenta: '#F2248C', magentaSoft: '#FFE7F3', magentaInk: '#B00E63',
    cyan: '#16C7E8', cyanSoft: '#E1FAFF', cyanInk: '#087A90',
    mint: '#2FE0B0', mintSoft: '#E2FFF6', mintInk: '#087A5E',
    lemon: '#FFD84D', lemonSoft: '#FFF6D1', lemonInk: '#8A6500',
    orange: '#FF8A3D', orangeSoft: '#FFF0E6', orangeInk: '#A84A00',
    lime: '#A8E63A', limeSoft: '#F3FFDA', limeInk: '#4E7A0F',
    coral: '#FF5C7A', coralSoft: '#FFE8ED', coralInk: '#B81F3D',

    ok: '#087A5E', warn: '#A84A00', bad: '#B81F3D',
    codeBg: '#171226', codeBg2: '#221A38', codeTx: '#EDE9FA'
  };

  const NAME = {
    bg: '--bg', bg2: '--bg-2', surface: '--surface', surface2: '--surface-2', surface3: '--surface-3',
    glass: '--glass', glassLine: '--glass-line', paper: '--paper',
    ink: '--ink', ink2: '--ink-2', ink3: '--ink-3',
    tx: '--tx', tx2: '--tx-2', tx3: '--tx-3', tx4: '--tx-4',
    line: '--line', line2: '--line-2', line3: '--line-3', lineNeon: '--line-neon',

    violet: '--violet', violetSoft: '--violet-soft', violetInk: '--violet-ink',
    magenta: '--magenta', magentaSoft: '--magenta-soft', magentaInk: '--magenta-ink',
    cyan: '--cyan', cyanSoft: '--cyan-soft', cyanInk: '--cyan-ink',
    mint: '--mint', mintSoft: '--mint-soft', mintInk: '--mint-ink',
    lemon: '--lemon', lemonSoft: '--lemon-soft', lemonInk: '--lemon-ink',
    orange: '--orange', orangeSoft: '--orange-soft', orangeInk: '--orange-ink',
    lime: '--lime', limeSoft: '--lime-soft', limeInk: '--lime-ink',
    coral: '--coral', coralSoft: '--coral-soft', coralInk: '--coral-ink',

    ok: '--ok', warn: '--warn', bad: '--bad',
    codeBg: '--code-bg', codeBg2: '--code-bg-2', codeTx: '--code-tx'
  };

  /* 证书四套皮肤：全部浅底，白卡纸，深色正文 */
  const SKINS = {
    red:   { bg: '#FFF7F3', ink: '#7A1620', accent: '#C92A38', sub: '#9A6B62', line: '#E8B4B0', paper: '#FFFFFF', seal: '#C92A38' },
    gold:  { bg: '#FFFBEF', ink: '#6B4E12', accent: '#C79A2E', sub: '#9C8554', line: '#E8D9A8', paper: '#FFFFFF', seal: '#C79A2E' },
    green: { bg: '#F3FCF8', ink: '#0E5C46', accent: '#12A67C', sub: '#5E8A7B', line: '#B9E6D6', paper: '#FFFFFF', seal: '#12A67C' },
    retro: { bg: '#FBF3E2', ink: '#3B2E1C', accent: '#8A6A3A', sub: '#7A6748', line: '#D9C6A4', paper: '#FFFCF3', seal: '#8A6A3A' }
  };

  function readTheme() {
    const T = Object.assign({}, FALLBACK);
    try {
      if (typeof getComputedStyle !== 'function' || typeof document === 'undefined' || !document.documentElement) return T;
      const cs = getComputedStyle(document.documentElement);
      Object.keys(NAME).forEach((k) => {
        const v = (cs.getPropertyValue(NAME[k]) || '').trim();
        if (v) T[k] = v;
      });
    } catch (e) { /* 保持 fallback */ }
    return T;
  }

  function parseHex(h) {
    if (typeof h !== 'string') return null;
    let s = h.trim();
    if (s[0] !== '#') return null;
    s = s.slice(1);
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    if (s.length !== 6) return null;
    const n = parseInt(s, 16);
    if (isNaN(n)) return null;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

  /* 把颜色加透明度；非 hex（如 rgba()）原样返回其 rgb 形态 */
  function alpha(c, a) {
    const rgb = parseHex(c);
    if (!rgb) {
      const m = /rgba?\(([^)]+)\)/.exec(String(c || ''));
      if (m) {
        const p = m[1].split(',').map((x) => parseFloat(x));
        return 'rgba(' + p[0] + ',' + p[1] + ',' + (p[2] == null ? 0 : p[2]) + ',' + a + ')';
      }
      return 'rgba(25,20,40,' + a + ')';
    }
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')';
  }

  function mix(a, b, t) {
    const A = parseHex(a), B = parseHex(b);
    if (!A || !B) return a;
    return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  }

  const glow = (c, a) => '0 0 24px ' + alpha(c, a);

  APP.theme = {
    T: readTheme(),
    skins: SKINS,
    fallback: FALLBACK,
    NAME: NAME,
    alpha: alpha,
    mix: mix,
    glow: glow
  };
})();
