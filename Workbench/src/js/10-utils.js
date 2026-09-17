/* ============================================================
   10-utils.js —— 通用工具：ID / 日期 / 转义 / toast / 弹窗
   ============================================================ */
function uid() {
  return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function p2(n) { return (n < 10 ? '0' : '') + n; }

/* ---------------- 转义（防 XSS） ---------------- */
function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ---------------- 日期 ---------------- */
function ymd(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
function hm(d) { return p2(d.getHours()) + ':' + p2(d.getMinutes()); }
function dOff(n) { var d = new Date(); d.setDate(d.getDate() + n); return ymd(d); }
function shiftISO(n) { var d = new Date(); d.setDate(d.getDate() + (n || 0)); return d.toISOString(); }
function nowISO() { return new Date().toISOString(); }

/** 把 YYYY-MM-DD [+ HH:mm] 解析为「本地时间」的 Date。禁止用 new Date('2026-09-10')（按 UTC 解析会差时区）。 */
function parseLocal(dateStr, timeStr) {
  if (!dateStr) return null;
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr).trim());
  if (!m) return null;
  var hh = 23, mm = 59;
  if (timeStr) {
    var t = /^(\d{1,2}):(\d{2})$/.exec(String(timeStr).trim());
    if (t) { hh = parseInt(t[1], 10); mm = parseInt(t[2], 10); }
  }
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), hh, mm, 0, 0);
}
/** 今天 00:00 */
function todayStart() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
/** 距今天的天数差（今天=0，未来为正，过去为负），只按日期算 */
function dayDiff(dateStr) {
  var d = parseLocal(dateStr, '00:00');
  if (!d) return null;
  var a = todayStart();
  var b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((b - a) / 86400000);
}
/** 周一为一周起点 */
function startOfWeek(d) {
  var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var w = x.getDay(); // 0=周日
  var back = (w + 6) % 7;
  x.setDate(x.getDate() - back);
  x.setHours(0, 0, 0, 0);
  return x;
}
function inThisWeek(iso) {
  if (!iso) return false;
  var d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  var s = startOfWeek(new Date());
  var e = new Date(s); e.setDate(e.getDate() + 7);
  return d >= s && d < e;
}
function fmtDue(dateStr, timeStr) {
  if (!dateStr) return '无截止';
  var n = dayDiff(dateStr);
  var base = dateStr.slice(5).replace('-', '/');
  if (n === 0) return '今天' + (timeStr ? ' ' + timeStr : '');
  if (n === 1) return '明天' + (timeStr ? ' ' + timeStr : '');
  if (n === 2) return '后天' + (timeStr ? ' ' + timeStr : '');
  if (n === -1) return '昨天' + (timeStr ? ' ' + timeStr : '');
  if (n !== null && n < 0) return base + (timeStr ? ' ' + timeStr : '') + ' · 逾期' + (-n) + '天';
  return base + (timeStr ? ' ' + timeStr : '');
}
function dueClass(dateStr) {
  var n = dayDiff(dateStr);
  if (n === null) return '';
  if (n < 0) return 'red';
  if (n === 0) return 'amber';
  return '';
}
function fmtDT(iso) {
  if (!iso) return '—';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return ymd(d) + ' ' + hm(d);
}
function relTime(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  var s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return '刚刚';
  if (s < 3600) return Math.floor(s / 60) + ' 分钟前';
  if (s < 86400) return Math.floor(s / 3600) + ' 小时前';
  if (s < 86400 * 7) return Math.floor(s / 86400) + ' 天前';
  return ymd(d);
}
/** 两个 ISO 之间相差天数（用于等待超时判定） */
function daysSince(iso) {
  if (!iso) return null;
  var d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

/* ---------------- 农历（1900-2100，压缩表） ---------------- */
var LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
  0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
  0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
  0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
  0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
  0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
  0x0d520
];
var LUNAR_DAY_NAMES = ['', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
var LUNAR_MONTH_NAMES = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];

function lunarYearDays(y) {
  var i, sum = 348;
  for (i = 0x8000; i > 0x8; i >>= 1) sum += (LUNAR_INFO[y - 1900] & i) ? 1 : 0;
  return sum + lunarLeapDays(y);
}
function lunarLeapMonth(y) { return LUNAR_INFO[y - 1900] & 0xf; }
function lunarLeapDays(y) { return lunarLeapMonth(y) ? ((LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29) : 0; }
function lunarMonthDays(y, m) { return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29; }
/** 公历 Y/M/D → 农历 {y,m,d,leap} */
function solarToLunar(y, m, d) {
  var i, temp = 0;
  var base = Date.UTC(1900, 0, 31); // 1900-01-31 = 农历 1900 正月初一
  var off = Math.floor((Date.UTC(y, m - 1, d) - base) / 86400000);
  for (i = 1900; i < 2101 && off > 0; i++) { temp = lunarYearDays(i); off -= temp; }
  if (off < 0) { off += temp; i--; }
  var lYear = i;
  var leap = lunarLeapMonth(lYear), isLeap = false;
  for (i = 1; i < 13 && off > 0; i++) {
    if (leap > 0 && i === leap + 1 && isLeap === false) { --i; isLeap = true; temp = lunarLeapDays(lYear); }
    else { temp = lunarMonthDays(lYear, i); }
    if (isLeap === true && i === leap + 1) isLeap = false;
    off -= temp;
  }
  if (off === 0 && leap > 0 && i === leap + 1) {
    if (isLeap) { isLeap = false; } else { isLeap = true; --i; }
  }
  if (off < 0) { off += temp; --i; }
  return { y: lYear, m: i, d: off + 1, leap: isLeap };
}
/** 「YYYY-MM-DD」→ 农历文字：初一显示月份名（如「八月」），其余显示日名（如「廿三」） */
function lunarText(dateStr) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || '').trim());
  if (!m) return '';
  var L = solarToLunar(parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10));
  if (L.d === 1) return (L.leap ? '闰' : '') + LUNAR_MONTH_NAMES[L.m];
  return LUNAR_DAY_NAMES[L.d];
}

/* ---------------- Toast ---------------- */
function toast(msg, type, ms) {
  var root = document.getElementById('toast-root');
  if (!root) return;
  var el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(function () {
    el.style.transition = 'opacity .25s';
    el.style.opacity = '0';
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
  }, ms || 2600);
}

/* ---------------- 弹窗 ---------------- */
var MODAL_STACK = [];
function openModal(opt) {
  var root = document.getElementById('modal-root');
  var wrap = document.createElement('div');
  wrap.className = 'mask';
  wrap.innerHTML =
    '<div class="modal ' + (opt.size || '') + '" data-stop="1">' +
      '<div class="modal-hd"><h3>' + esc(opt.title || '') + '</h3>' +
        '<button class="icon-btn" data-mclose="1" aria-label="关闭">✕</button></div>' +
      '<div class="modal-bd">' + (opt.body || '') + '</div>' +
      (opt.footer ? '<div class="modal-ft">' + opt.footer + '</div>' : '') +
    '</div>';
  root.appendChild(wrap);
  root.classList.add('open');
  MODAL_STACK.push(wrap);
  wrap.addEventListener('click', function (e) {
    if (e.target === wrap) closeModal(wrap);
    if (e.target && e.target.getAttribute && e.target.getAttribute('data-mclose')) closeModal(wrap);
  });
  var first = wrap.querySelector('input,textarea,select');
  if (first && window.innerWidth > 880) setTimeout(function () { first.focus(); }, 60);
  return wrap;
}
function closeModal(wrap) {
  var root = document.getElementById('modal-root');
  if (!wrap) { wrap = MODAL_STACK[MODAL_STACK.length - 1]; }
  if (!wrap) return;
  if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
  MODAL_STACK = MODAL_STACK.filter(function (x) { return x !== wrap; });
  if (MODAL_STACK.length === 0) root.classList.remove('open');
}
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && MODAL_STACK.length) closeModal();
});

/** 确认对话框，返回 Promise<boolean> */
function confirmDialog(opt) {
  return new Promise(function (resolve) {
    var yesTxt = opt.confirmText || '确定';
    var wrap = openModal({
      title: opt.title || '请确认',
      size: '',
      body: '<div style="font-size:14.5px;color:var(--ink-2);line-height:1.7">' + (opt.message || '') + '</div>' +
        (opt.requireText ? '<div class="field" style="margin-top:14px"><label>请输入「' + esc(opt.requireText) + '」以确认<span class="req">*</span></label><input type="text" id="cd-input" autocomplete="off"></div>' : ''),
      footer: '<button class="btn" data-no="1">' + esc(opt.cancelText || '取消') + '</button>' +
        '<button class="btn ' + (opt.danger ? 'danger' : 'pri') + '" data-yes="1">' + esc(yesTxt) + '</button>'
    });
    var input = wrap.querySelector('#cd-input');
    wrap.querySelector('[data-yes]').onclick = function () {
      if (opt.requireText) {
        if (!input || input.value.trim() !== opt.requireText) {
          toast('请输入「' + opt.requireText + '」以确认', 'warn');
          if (input) input.focus();
          return;
        }
      }
      closeModal(wrap); resolve(true);
    };
    wrap.querySelector('[data-no]').onclick = function () { closeModal(wrap); resolve(false); };
    if (input) input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') wrap.querySelector('[data-yes]').click();
    });
  });
}

/* ---------------- 复制 ---------------- */
function copyText(text) {
  function fallback() {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return fallback(); });
  }
  return Promise.resolve(fallback());
}

/* ---------------- 小组件 ---------------- */
function emptyBox(icon, title, sub) {
  return '<div class="empty"><div class="e-ic">' + esc(icon) + '</div>' +
    '<div class="e-t">' + esc(title) + '</div>' +
    (sub ? '<div class="e-s">' + esc(sub) + '</div>' : '') + '</div>';
}
function ringSVG(pct, label) {
  var r = 38, c = 2 * Math.PI * r;
  var off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return '<div class="ring"><svg width="88" height="88" viewBox="0 0 88 88">' +
    '<circle cx="44" cy="44" r="' + r + '" fill="none" stroke="#eef1f8" stroke-width="8"/>' +
    '<circle cx="44" cy="44" r="' + r + '" fill="none" stroke="url(#rg)" stroke-width="8" stroke-linecap="round" ' +
    'stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
    '<defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="#6d5efc"/><stop offset="100%" stop-color="#22c1c3"/>' +
    '</linearGradient></defs></svg>' +
    '<div class="rv">' + Math.round(pct) + '<small>%</small>' +
    (label ? '<small style="font-size:9px">' + esc(label) + '</small>' : '') + '</div></div>';
}
function progressBar(pct) {
  return '<div class="pbar"><i style="width:' + Math.max(0, Math.min(100, pct)) + '%"></i></div>';
}
function openUrl(u) {
  if (!u) { toast('该条目没有填写链接', 'warn'); return; }
  var s = String(u).trim();
  if (/^https?:\/\//i.test(s) || /^mailto:/i.test(s)) window.open(s, '_blank', 'noopener');
  else toast('只支持 http/https 链接，若是本地路径请先复制', 'warn');
}
