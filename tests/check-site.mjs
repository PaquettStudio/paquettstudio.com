// Release gate for the built site: run `node tests/check-site.mjs <dir> [--strict]`.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const PAGE_PATHS = ['/', '/games/abyss-angler/', '/legal/terms/', '/legal/privacy/', '/legal/copyright/', '/report/'];
export const EXPECTED_PATHS = [...['', '/ro'].flatMap(prefix => PAGE_PATHS.map(p => prefix + p)), '/404.html'];

const MARKER = '[[DE COMPLETAT]]';
const TEXT_EXT = /\.(html|css|js|mjs|json|xml|txt|svg)$/;
const RESOURCE_RELS = /\b(stylesheet|preload|modulepreload|icon|apple-touch-icon|manifest)\b/;
const isExternal = url => /^(https?:)?\/\//i.test(url);
const fileFor = url => (url.endsWith('/') ? `${url}index.html` : url).replace(/^\//, '');

async function walk(root, dir = root) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(root, full));
    else out.push(relative(root, full).split(sep).join('/'));
  }
  return out;
}

function internalTarget(fromFile, href) {
  const clean = href.split('#')[0].split('?')[0];
  if (clean === '') return null;
  const base = new URL(`http://site/${fromFile}`);
  return decodeURIComponent(new URL(clean, base).pathname);
}

function exists(files, urlPath) {
  const rel = urlPath.replace(/^\//, '');
  if (rel === '' || rel.endsWith('/')) return files.has(`${rel}index.html`);
  return files.has(rel) || files.has(`${rel}/index.html`);
}

function checkHtml(rel, html, files, errors) {
  if (!/<title>[^<]*\S[^<]*<\/title>/.test(html)) errors.push(`Missing <title> in ${rel}`);
  if (!/<meta\s+name="description"\s+content="[^"]+"/.test(html)) errors.push(`Missing meta description in ${rel}`);
  if (rel !== '404.html') {
    for (const code of ['en', 'ro', 'x-default']) {
      if (!html.includes(`hreflang="${code}"`)) errors.push(`Missing hreflang ${code} in ${rel}`);
    }
  }
  const footer = html.match(/<footer\b[\s\S]*<\/footer>/)?.[0] ?? '';
  if (!['Paquett Studio Ltd', 'Company No.', 'Registered office'].every(s => footer.includes(s))) {
    errors.push(`Footer incomplete in ${rel}`);
  }
  if (html.includes('®')) errors.push(`Registered mark ® in ${rel}`);

  for (const [, src] of html.matchAll(/\bsrc="([^"]*)"/g)) {
    if (isExternal(src)) errors.push(`External resource in ${rel}: ${src}`);
  }
  for (const [tag] of html.matchAll(/<link\b[^>]*>/g)) {
    const relAttr = tag.match(/\brel="([^"]*)"/)?.[1] ?? '';
    const href = tag.match(/\bhref="([^"]*)"/)?.[1] ?? '';
    if (RESOURCE_RELS.test(relAttr) && isExternal(href)) errors.push(`External resource in ${rel}: ${href}`);
  }
  for (const [, url] of html.matchAll(/\b(?:href|src)="([^"]*)"/g)) {
    if (isExternal(url) || /^(mailto:|tel:|data:|javascript:|#)/i.test(url)) continue;
    if (url.includes(MARKER)) continue; // reported by the strict marker check instead
    const target = internalTarget(rel, url);
    if (target !== null && !exists(files, target)) errors.push(`Broken link in ${rel}: ${url}`);
  }
}

function checkCss(rel, css, errors) {
  for (const [, url] of css.matchAll(/url\(\s*['"]?([^'")\s]+)/g)) {
    if (isExternal(url)) errors.push(`External resource in ${rel}: ${url}`);
  }
  for (const [, url] of css.matchAll(/@import\s+['"]([^'"]+)['"]/g)) {
    if (isExternal(url)) errors.push(`External resource in ${rel}: ${url}`);
  }
}

export async function checkSite(dir, { strict }) {
  const list = await walk(dir);
  const files = new Set(list);
  const errors = [];
  for (const url of EXPECTED_PATHS) {
    if (!files.has(fileFor(url))) errors.push(`Missing page: ${url}`);
  }
  for (const rel of list.filter(f => TEXT_EXT.test(f))) {
    const text = await readFile(join(dir, rel), 'utf8');
    if (rel.endsWith('.html')) checkHtml(rel, text, files, errors);
    if (rel.endsWith('.css')) checkCss(rel, text, errors);
    if (strict && text.includes(MARKER)) errors.push(`Unfinished marker ${MARKER} in ${rel}`);
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dir = process.argv[2] ?? 'site';
  const errors = await checkSite(dir, { strict: process.argv.includes('--strict') });
  for (const e of errors) console.error(e);
  console.log(errors.length ? `${errors.length} problem(s) found` : 'Site check passed');
  process.exitCode = errors.length ? 1 : 0;
}
