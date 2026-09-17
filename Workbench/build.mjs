import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const srcDir = join(root, 'src');
const jsDir = join(srcDir, 'js');

const tplPath = join(srcDir, 'template.html');
const cssPath = join(srcDir, 'styles.css');

if (!existsSync(tplPath) || !existsSync(cssPath)) {
  console.error('缺少 src/template.html 或 src/styles.css');
  process.exit(1);
}

let html = readFileSync(tplPath, 'utf8');
const css = readFileSync(cssPath, 'utf8');

const files = readdirSync(jsDir).filter((f) => f.endsWith('.js')).sort();
const js = files
  .map((f) => `/* ==================== ${f} ==================== */\n` + readFileSync(join(jsDir, f), 'utf8'))
  .join('\n\n');

if (!html.includes('/*INJECT_CSS*/') || !html.includes('//INJECT_JS')) {
  console.error('template.html 缺少注入占位符 /*INJECT_CSS*/ 或 //INJECT_JS');
  process.exit(1);
}

html = html
  .replace('/*INJECT_CSS*/', () => css)
  .replace('//INJECT_JS', () => js);

const out = join(root, 'index.html');
writeFileSync(out, html, { encoding: 'utf8' });

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
console.log(`build ok -> index.html (${kb} KB)  js: ${files.length} files`);
console.log(files.map((f) => '  · ' + f).join('\n'));
