/* ============================================================
   07-ones-seed.js —— 把 ONES 数据合并进工作台
   - 需求(ONES_PARENTS) → 项目；任务(ONES_TASKS) → 任务
   - 按 onsId 幂等 upsert：重复导入只更新、不重复新增
   - 用 meta.onesSeed 记录已导入的数据版本；提升 ONES_SEED_VERSION 即可重导
   - 数据来源文件：06-ones-data.js（自动生成）
   - 注意：ONES 数据不计 demo 标记，因此「清空示例数据」不会误删真实任务
   ============================================================ */
var ONES_STATUS_MAP = {
  '未开始': 'todo',
  '进行中': 'doing',
  '实现中': 'doing',
  '已完成': 'done',
  '已实现': 'done'
};
function onesStatusToLocal(s) {
  if (!s) return 'todo';
  if (ONES_STATUS_MAP[s]) return ONES_STATUS_MAP[s];
  if (s.indexOf('完成') >= 0 || s.indexOf('已实现') >= 0) return 'done';
  if (s.indexOf('进行') >= 0 || s.indexOf('实现中') >= 0) return 'doing';
  return 'todo';
}
function onesProjectStatus(s) { return onesStatusToLocal(s) === 'done' ? 'done' : 'normal'; }

/** ONES 已完成条目的完成时间：取「计划完成日期 → 截止日期」，缺失才用当前时间（避免污染本周/本月统计） */
function onesCompletedAt(planEnd, dueDate) {
  var d = planEnd || dueDate || '';
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d));
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0).toISOString();
  return nowISO();
}

/** 判断某任务是否来自 ONES 导入 */
function isOnesTask(t) { return !!(t && (t.source === 'ones' || t.onsId)); }

/**
 * 合并 ONES 数据。
 * @param {boolean} force 忽略版本号强制重导
 * @returns {null|{projects:number,tasks:number,updP:number,updT:number}}
 */
function seedOnes(force) {
  if (typeof ONES_PARENTS === 'undefined' || typeof ONES_TASKS === 'undefined') return null;
  S.meta = S.meta || {};
  if (!force && (S.meta.onesSeed || 0) >= ONES_SEED_VERSION) return null;

  var now = nowISO();
  var stat = { projects: 0, tasks: 0, updP: 0, updT: 0 };
  var titleToPid = {};

  /* 1) 需求 → 项目 */
  (S.projects || []).forEach(function (p) { if (p.onsId) titleToPid[p.name] = p.id; });
  ONES_PARENTS.forEach(function (p) {
    var exist = (S.projects || []).filter(function (x) { return x.onsId === p.onsId; })[0] ||
      (S.projects || []).filter(function (x) { return x.name === p.name; })[0];
    var pstatus = onesProjectStatus(p.onesStatus);
    var fields = {
      onsId: p.onsId, name: p.name, desc: p.desc || '', source: 'ones',
      owner: p.owner || '', onesStatus: p.onesStatus,
      startDate: p.startDate || '', dueDate: p.dueDate || '',
      priority: 'mid', progress: p.progress === null ? 0 : p.progress,
      status: pstatus
    };
    if (exist) {
      Object.keys(fields).forEach(function (k) {
        if (k === 'name') return; /* 名称保持用户可能改过的值 */
        if (exist[k] !== fields[k]) { exist[k] = fields[k]; stat.updP++; }
      });
      exist.status = pstatus;
      if (pstatus === 'done') exist.completedAt = onesCompletedAt(p.planEnd || p.dueDate, '');
      else exist.completedAt = '';
      exist.updatedAt = now;
      titleToPid[p.name] = exist.id;
    } else {
      var np = Object.assign({
        id: uid(), nextAction: '', note: '',
        createdAt: now, updatedAt: now,
        completedAt: pstatus === 'done' ? onesCompletedAt(p.planEnd, p.dueDate) : ''
      }, fields);
      S.projects.push(np);
      titleToPid[p.name] = np.id;
      stat.projects++;
    }
  });

  /* 2) 任务 → 任务 */
  ONES_TASKS.forEach(function (t) {
    var pid = titleToPid[t.parentTitle] || null;
    var status = onesStatusToLocal(t.onesStatus);
    var fields = {
      onsId: t.onsId, title: t.title, projectId: pid, source: 'ones',
      owner: t.owner || '', followers: t.followers || '',
      onesStatus: t.onesStatus, onesPriority: t.onesPriority || '普通',
      progress: t.progress === null ? (status === 'done' ? 100 : null) : t.progress,
      planStart: t.planStart || '', planEnd: t.planEnd || '',
      dueDate: t.dueDate || '', note: t.desc || '',
      worklog: t.worklog || '', logged: t.logged || ''
    };
    var exist = (S.tasks || []).filter(function (x) { return x.onsId === t.onsId; })[0];
    if (exist) {
      var statusChanged = exist.status !== status;
      Object.keys(fields).forEach(function (k) {
        if (exist[k] !== fields[k]) { exist[k] = fields[k]; stat.updT++; }
      });
      exist.status = status;
      if (statusChanged) exist.statusChangedAt = now;
      if (status === 'done') exist.completedAt = onesCompletedAt(t.planEnd, t.dueDate);
      else exist.completedAt = '';
      exist.updatedAt = now;
    } else {
      var nt = Object.assign({
        id: uid(), dueTime: '', priority: 'mid', focus: false,
        statusChangedAt: now, createdAt: now, updatedAt: now,
        completedAt: status === 'done' ? onesCompletedAt(t.planEnd, t.dueDate) : ''
      }, fields);
      nt.status = status;
      S.tasks.push(nt);
      stat.tasks++;
    }
  });

  S.meta.onesSeed = ONES_SEED_VERSION;
  S.meta.onesAt = now;
  commit(true);
  return stat;
}

/** 台账筛选用：从 ONES 数据里取去重后的负责人 / 状态 / 计划完成月份 */
function onesFacets() {
  var owners = {}, statuses = {}, months = {};
  ONES_TASKS.forEach(function (t) {
    if (t.owner) owners[t.owner] = 1;
    if (t.onesStatus) statuses[t.onesStatus] = 1;
    if (t.planEnd) months[String(t.planEnd).slice(0, 7)] = 1;
  });
  return {
    owners: Object.keys(owners),
    statuses: Object.keys(statuses),
    months: Object.keys(months).sort()
  };
}
