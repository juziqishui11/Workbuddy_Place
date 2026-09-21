/**
 * utils/profile.js —— 本机用户档案（头像 / 昵称）
 *
 * 重要边界（不要误解这个模块的语义）：
 *   1. 微信自 2022-10-25 起回收了 wx.getUserProfile，**拿不到微信真实昵称头像**。
 *      唯一合规路径是「头像昵称填写能力」：
 *        - 头像：<button open-type="chooseAvatar" bindchooseavatar="..."> → e.detail.avatarUrl（临时路径）
 *        - 昵称：<input type="nickname" />  → 用户手动确认（键盘上方会提供微信昵称快捷填入）
 *      对应隐私类型「收集你的昵称、头像」，**必须先在 mp 后台《用户隐私保护指引》里声明**，
 *      否则调用会直接报 `api scope is not declared in the privacy agreement`。
 *   2. 本模块**只写本机存储**，没有任何网络请求；档案与收藏数据互相独立，
 *      「退出登录」只清档案，绝不动收藏。
 *   3. wx.login 的 code 目前**不消费**（没有服务端去 code2session 换 openid），
 *      仅用于校验微信登录链路是否可用，并为将来接入云同步预留。
 */
const KEY = 'toycol_profile_v1';
const SKIP_KEY = 'toycol_login_skipped_v1';
const AVATAR_FILE = 'profile_avatar.png';
const NICK_MAX = 20;

/** 读取本机档案，无则返回 null */
function get() {
  try {
    const p = wx.getStorageSync(KEY);
    return (p && typeof p === 'object' && p.nickName) ? p : null;
  } catch (e) {
    return null;
  }
}

function isLogged() {
  return !!get();
}

/** 用户点过「暂不登录」——用于避免每次都弹登录引导 */
function skipped() {
  try {
    return !!wx.getStorageSync(SKIP_KEY);
  } catch (e) {
    return false;
  }
}

function markSkipped() {
  try { wx.setStorageSync(SKIP_KEY, 1); } catch (e) {}
}

/** 昵称清洗：去空白、滤掉控制字符、限长；返回 '' 表示非法 */
function cleanNick(name) {
  const s = String(name == null ? '' : name)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return s.slice(0, NICK_MAX);
}

/** 头像持久化：chooseAvatar 给的是临时文件，退出后可能被清理 → 复制到本地用户文件 */
function persistAvatar(tempFilePath, cb) {
  const done = typeof cb === 'function' ? cb : function () {};
  if (!tempFilePath) { done(''); return; }
  // 已经是持久路径（本地用户文件）或远端持久地址 → 原样返回。
  // ⚠️ 注意不能拿 /^http/ 当判据：chooseAvatar 在**开发者工具**返回的是
  //    `http://tmp/xxx.jpeg`（临时文件的 URL 形式），它同样需要转持久化。
  if (tempFilePath.indexOf('wxfile://usr') === 0 || /^https:\/\//.test(tempFilePath)) {
    done(tempFilePath);
    return;
  }
  let dest = '';
  let fs = null;
  try {
    dest = wx.env.USER_DATA_PATH + '/' + AVATAR_FILE;
    fs = wx.getFileSystemManager();
  } catch (e) {
    done(tempFilePath);
    return;
  }
  // saveFile 到已存在的目标会失败 → 先删旧文件（固定文件名，天然避免文件堆积）
  try {
    fs.accessSync(dest);
    fs.unlinkSync(dest);
  } catch (e) {}
  fs.saveFile({
    tempFilePath: tempFilePath,
    filePath: dest,
    success: function () { done(dest); },
    // 保存失败退化为临时路径：本次会话仍可显示，不阻断流程
    fail: function () { done(tempFilePath); }
  });
}

/** 保存档案（合并写入）。nickName 非法则返回 false */
function save(patch) {
  const cur = get() || {};
  const next = Object.assign({}, cur, patch || {});
  next.nickName = cleanNick(next.nickName);
  if (!next.nickName) return false;
  next.loginAt = cur.loginAt || Date.now();
  next.updatedAt = Date.now();
  try {
    wx.setStorageSync(KEY, next);
    try { wx.removeStorageSync(SKIP_KEY); } catch (e) {}
    return true;
  } catch (e) {
    return false;
  }
}

/** 退出登录：只清档案，不动收藏与心愿 */
function clear() {
  try { wx.removeStorageSync(KEY); } catch (e) {}
}

/** 头像缺失时用昵称首字兜底（本地生成，不上传任何东西） */
function avatarCharOf(nickName) {
  const s = cleanNick(nickName);
  return s ? s.slice(0, 1) : '?';
}

/**
 * 走一次微信登录链路拿 code。
 * 注意：当前没有服务端消费 code，所以**它不构成身份认证**；
 * 失败也不阻断（后续的头像昵称填写是本机行为，不依赖 code）。
 */
function wxLogin(cb) {
  const done = typeof cb === 'function' ? cb : function () {};
  if (!wx.login) { done(null, 'unsupported'); return; }
  wx.login({
    success: function (res) { done(res && res.code ? res.code : null, null); },
    fail: function (err) { done(null, (err && err.errMsg) || 'login fail'); }
  });
}

module.exports = {
  get: get,
  isLogged: isLogged,
  skipped: skipped,
  markSkipped: markSkipped,
  cleanNick: cleanNick,
  persistAvatar: persistAvatar,
  save: save,
  clear: clear,
  avatarCharOf: avatarCharOf,
  wxLogin: wxLogin,
  NICK_MAX: NICK_MAX
};
