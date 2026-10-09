import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkSite as check, expectedPaths } from './check-site.mjs';

const BILINGUAL = [{ code: 'en', prefix: '' }, { code: 'ro', prefix: '/ro' }];
const EXPECTED_PATHS = expectedPaths(BILINGUAL);
const checkSite = (dir, opts) => check(dir, { languages: BILINGUAL, ...opts });

const BASE = 'https://paquettstudio.com';
const FOOTER = '<footer>© 2026 Paquett Studio Ltd · Company No. 123 · Registered office: 1 Street</footer>';

function page(url, { lang = url.startsWith('/ro') ? 'ro' : 'en', head = '', body = '', footer = FOOTER } = {}) {
  const path = url.replace(/^\/ro/, '') || '/';
  return `<!doctype html><html lang="${lang}"><head><title>T</title><meta name="description" content="D">
<link rel="alternate" hreflang="en" href="${BASE}${path}">
<link rel="alternate" hreflang="ro" href="${BASE}/ro${path}">
<link rel="alternate" hreflang="x-default" href="${BASE}${path}">${head}</head>
<body>${body}${footer}</body></html>`;
}

const fileFor = url => (url.endsWith('/') ? `${url}index.html` : url).replace(/^\//, '');

function validSite() {
  const files = {};
  for (const url of EXPECTED_PATHS) files[fileFor(url)] = page(url);
  files['assets/css/site.css'] = 'body{color:#fff}';
  return files;
}

async function writeFixture(files) {
  const dir = await mkdtemp(join(tmpdir(), 'check-'));
  for (const [rel, content] of Object.entries(files)) {
    await mkdir(join(dir, rel, '..'), { recursive: true });
    await writeFile(join(dir, rel), content);
  }
  return dir;
}

test('a complete valid site has no errors', async () => {
  assert.deepEqual(await checkSite(await writeFixture(validSite()), { strict: true }), []);
});

test('a missing page is reported by URL', async () => {
  const files = validSite();
  delete files['ro/report/index.html'];
  assert.ok((await checkSite(await writeFixture(files), { strict: false })).includes('Missing page: /ro/report/'));
});

test('a broken internal link is reported', async () => {
  const files = validSite();
  files['index.html'] = page('/', { body: '<a href="/nope/">x</a>' });
  assert.ok((await checkSite(await writeFixture(files), { strict: false })).includes('Broken link in index.html: /nope/'));
});

test('internal links to existing pages and assets pass, fragments and mailto are ignored', async () => {
  const files = validSite();
  files['index.html'] = page('/', {
    head: '<link rel="stylesheet" href="/assets/css/site.css">',
    body: '<a href="/legal/terms/">t</a><a href="#games">g</a><a href="mailto:x@y.z">m</a><a href="/ro/#contact">c</a>',
  });
  assert.deepEqual(await checkSite(await writeFixture(files), { strict: true }), []);
});

test('a page without a title is reported', async () => {
  const files = validSite();
  files['index.html'] = page('/').replace('<title>T</title>', '');
  assert.ok((await checkSite(await writeFixture(files), { strict: false })).includes('Missing <title> in index.html'));
});

test('a page without a meta description is reported', async () => {
  const files = validSite();
  files['index.html'] = page('/').replace('<meta name="description" content="D">', '');
  assert.ok((await checkSite(await writeFixture(files), { strict: false })).includes('Missing meta description in index.html'));
});

test('a page missing a hreflang alternate is reported', async () => {
  const files = validSite();
  files['index.html'] = page('/').replace(/<link rel="alternate" hreflang="ro"[^>]*>/, '');
  assert.ok((await checkSite(await writeFixture(files), { strict: false })).includes('Missing hreflang ro in index.html'));
});

test('the 404 page does not need hreflang alternates', async () => {
  const files = validSite();
  files['404.html'] = page('/404.html').replace(/<link rel="alternate"[^>]*>/g, '');
  assert.deepEqual(await checkSite(await writeFixture(files), { strict: true }), []);
});

test('a footer without the company number is reported', async () => {
  const files = validSite();
  files['index.html'] = page('/', { footer: '<footer>© 2026 Paquett Studio Ltd · Registered office: 1 Street</footer>' });
  assert.ok((await checkSite(await writeFixture(files), { strict: false })).includes('Footer incomplete in index.html'));
});

test('an external script is reported', async () => {
  const files = validSite();
  files['index.html'] = page('/', { body: '<script src="https://cdn.example.com/x.js"></script>' });
  assert.ok((await checkSite(await writeFixture(files), { strict: false })).includes('External resource in index.html: https://cdn.example.com/x.js'));
});

test('an external stylesheet and a CSS url() are reported', async () => {
  const files = validSite();
  files['index.html'] = page('/', { head: '<link rel="stylesheet" href="https://fonts.googleapis.com/css2">' });
  files['assets/css/site.css'] = '@font-face{src:url(https://fonts.gstatic.com/a.woff2)}';
  const errors = await checkSite(await writeFixture(files), { strict: false });
  assert.ok(errors.includes('External resource in index.html: https://fonts.googleapis.com/css2'));
  assert.ok(errors.includes('External resource in assets/css/site.css: https://fonts.gstatic.com/a.woff2'));
});

test('external links to stores are allowed', async () => {
  const files = validSite();
  files['index.html'] = page('/', { body: '<a href="https://apps.apple.com/app/x">App Store</a>' });
  assert.deepEqual(await checkSite(await writeFixture(files), { strict: true }), []);
});

test('the registered mark is reported', async () => {
  const files = validSite();
  files['index.html'] = page('/', { body: 'Abyss Angler®' });
  assert.ok((await checkSite(await writeFixture(files), { strict: false })).includes('Registered mark ® in index.html'));
});

test('an unfinished marker fails only in strict mode', async () => {
  const files = validSite();
  files['index.html'] = page('/', { body: 'Company No. [[DE COMPLETAT]]' });
  const dir = await writeFixture(files);
  assert.ok((await checkSite(dir, { strict: true })).includes('Unfinished marker [[DE COMPLETAT]] in index.html'));
  assert.deepEqual(await checkSite(dir, { strict: false }), []);
});

test('links still waiting for real data are left to the strict marker check', async () => {
  const files = validSite();
  files['index.html'] = page('/', { body: '<a href="[[DE COMPLETAT]]">App Store</a>' });
  const dir = await writeFixture(files);
  assert.deepEqual(await checkSite(dir, { strict: false }), []);
  assert.deepEqual(await checkSite(dir, { strict: true }), ['Unfinished marker [[DE COMPLETAT]] in index.html']);
});

test('a single-language site needs no hreflang and no /ro/ pages', async () => {
  const files = {};
  for (const url of expectedPaths([{ code: 'en', prefix: '' }])) {
    files[fileFor(url)] = page(url).replace(/<link rel="alternate"[^>]*>/g, '');
  }
  assert.deepEqual(await check(await writeFixture(files), { strict: true, languages: [{ code: 'en', prefix: '' }] }), []);
});
