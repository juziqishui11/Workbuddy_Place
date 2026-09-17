#!/usr/bin/env node
/* ============================================================
   tools/skills-sync.mjs —— 技能库「真实安装」快照同步
   扫描本机真实安装情况，生成 src/js/78-installed-data.js：
     var INSTALLED_SKILLS = { generatedAt, skills:{slug→meta}, conns:[...] }
   用法：node tools/skills-sync.mjs
   装了/删了技能后跑一次，再 node build.mjs，页面「已安装」即与磁盘对齐。
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const HOME = os.homedir();
const SKILLS_DIR = path.join(HOME, '.workbuddy', 'skills');
const CONNS_DIR = path.join(HOME, '.workbuddy', 'connectors', 'skills');
const OUT = path.join(HOME, '.workbuddy', 'skills-sync-out'); // 占位，实际输出在下面 OUT_FILE
const OUT_FILE = path.resolve(process.cwd(), 'src/js/78-installed-data.js');

function iso(ms) { try { return new Date(ms).toISOString(); } catch { return ''; } }

function readSkillhubMeta(dir) {
  try {
    const p = path.join(dir, '_skillhub_meta.json');
    if (!fs.existsSync(p)) return null;
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    return {
      slug: j.slug || '',
      name: j.name || j.slug || '',
      skillId: j.skillId || '',
      version: j.version || '',
      installedAt: j.installedAt ? iso(j.installedAt) : '',
      source: j.source || 'skillhub',
      namespace: j.namespace || '',
      canonicalName: j.canonicalName || ''
    };
  } catch { return null; }
}

/* 归一化匹配键：小写、去分隔符/空格，用于跨源模糊命中（ClawHub slug ↔ 市场 displayName） */
function normKey(s) {
  return String(s || '').toLowerCase().replace(/[\s_\-–—·.]/g, '');
}

/* ---- 扫描技能目录 ---- */
const skills = {};   // 主表：slug（或目录名）→ meta
const index = {};    // 匹配索引：归一化键 → slug（覆盖 slug / name / skillId / 目录名，去 __skillhub 后缀）
function addIndex(key, slug) {
  const k = normKey(key);
  if (!k || index[k]) return;
  index[k] = slug;
}
if (fs.existsSync(SKILLS_DIR)) {
  for (const ent of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    if (ent.name.startsWith('_') || ent.name.startsWith('.')) continue; // _bm_* 等杂项
    const dir = path.join(SKILLS_DIR, ent.name);
    const dirBase = ent.name.replace(/__skillhub$/i, '');
    const meta = readSkillhubMeta(dir);
    const slug = (meta && meta.slug) ? meta.slug : dirBase;
    const row = meta
      ? { ...meta, dir: ent.name, origin: (meta.source === 'marketplace' ? 'marketplace' : 'skillhub') }
      : (() => {
          let mt = '';
          try { mt = iso(fs.statSync(dir).mtimeMs); } catch {}
          return { slug, name: dirBase, skillId: '', version: '', installedAt: mt, source: 'local', namespace: '', canonicalName: '', dir: ent.name, origin: 'local' };
        })();
    skills[slug] = row;
    /* 多键索引：让市场装的（中文 displayName 目录）与 ClawHub slug 能对上 */
    addIndex(slug, slug);
    addIndex(dirBase, slug);
    addIndex(row.name, slug);
    addIndex(row.skillId, slug);
    if (row.canonicalName) addIndex(String(row.canonicalName).split('/').pop(), slug);
  }
}

/* ---- 扫描连接器目录 ---- */
const conns = [];
if (fs.existsSync(CONNS_DIR)) {
  for (const ent of fs.readdirSync(CONNS_DIR, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    conns.push({ id: 'conn-' + ent.name.replace(/^connector-/, ''), dir: ent.name });
  }
}

const data = {
  generatedAt: iso(Date.now()),
  skills,
  index,
  conns
};

const js = '/* 本文件由 tools/skills-sync.mjs 生成 —— 真实安装快照，勿手改；重跑 node tools/skills-sync.mjs 刷新 */\n'
  + 'var INSTALLED_SKILLS = ' + JSON.stringify(data, null, 2) + ';\n';

fs.writeFileSync(OUT_FILE, js, 'utf8');
const n = Object.keys(skills).length;
console.log('[skills-sync] skills: ' + n + ', index keys: ' + Object.keys(index).length + ', connectors: ' + conns.length + ' -> ' + OUT_FILE);
console.log('[skills-sync] generatedAt: ' + data.generatedAt);
console.log('[skills-sync] by source: market=' + Object.values(skills).filter(s => s.source === 'marketplace').length
  + ', skillhub=' + Object.values(skills).filter(s => s.source === 'skillhub').length
  + ', local=' + Object.values(skills).filter(s => s.source === 'local').length);
