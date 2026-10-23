/* 形象图预加载 —— 图片是异步的，canvas 绘制是同步的。
   策略：领号时先 preload 一次，用户点导出时大概率已命中缓存；
   失败记负缓存（false），不再重试，导出走几何兜底。 */
(function () {
  const cache = (typeof Map !== 'undefined') ? new Map() : null;
  const mem = {};

  const has = () => !!cache;
  function getMap(k) { return has() ? cache.get(k) : mem[k]; }
  function setMap(k, v) { if (has()) cache.set(k, v); else mem[k] = v; }
  function hasKey(k) { return has() ? cache.has(k) : Object.prototype.hasOwnProperty.call(mem, k); }

  const url = (code) => 'assets/avatar/' + code + '.webp';

  function get(code) {
    const v = getMap(code);
    return v && v !== false ? v : null;
  }

  function ensure(code, timeout) {
    const wait = timeout || 1200;
    if (hasKey(code)) return Promise.resolve(get(code));
    return new Promise((resolve) => {
      if (typeof Image === 'undefined') { setMap(code, false); resolve(null); return; }
      const im = new Image();
      let done = false;
      const fin = (ok) => {
        if (done) return;
        done = true;
        setMap(code, ok ? im : false);
        resolve(ok ? im : null);
      };
      im.onload = () => fin(!!im.naturalWidth);
      im.onerror = () => fin(false);
      setTimeout(() => fin(!!(im.complete && im.naturalWidth)), wait);
      try { im.decoding = 'async'; } catch (e) {}
      im.src = url(code);
    });
  }

  function preload(code) {
    ensure(code).catch(function () {});
  }

  APP.assets = { url: url, get: get, has: hasKey, ensure: ensure, preload: preload };
})();
