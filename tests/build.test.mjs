import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../build.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let out;
const read = rel => readFile(join(out, rel), 'utf8');

before(async () => {
  out = await mkdtemp(join(tmpdir(), 'site-'));
  // Romanian is dormant in production; build it here so the bilingual machinery stays covered.
  await build({ root, outDir: out, languages: ['en', 'ro'] });
});

test('home pages exist in both languages', async () => {
  await access(join(out, 'index.html'));
  await access(join(out, 'ro/index.html'));
});

test('the Romanian home page declares lang="ro"', async () => {
  assert.match(await read('ro/index.html'), /<html[^>]*lang="ro"/);
});

test('home pages link their language alternates', async () => {
  for (const file of ['index.html', 'ro/index.html']) {
    const html = await read(file);
    assert.ok(html.includes('hreflang="en" href="https://paquettstudio.com/"'), file);
    assert.ok(html.includes('hreflang="ro" href="https://paquettstudio.com/ro/"'), file);
    assert.ok(html.includes('hreflang="x-default" href="https://paquettstudio.com/"'), file);
  }
});

test('every page footer names the company and its number', async () => {
  for (const file of ['index.html', 'ro/index.html']) {
    const html = await read(file);
    assert.ok(html.includes('Paquett Studio Ltd'), file);
    assert.ok(html.includes('Company No.'), file);
    assert.ok(html.includes('Registered office'), file);
  }
});

test('the layout starts as no-js and exposes an accessible menu toggle', async () => {
  for (const file of ['index.html', 'ro/index.html']) {
    const html = await read(file);
    assert.match(html, /<html[^>]*class="no-js"/, file);
    assert.ok(html.includes('aria-controls="site-menu"'), file);
    assert.ok(html.includes('aria-expanded="false"'), file);
    assert.ok(html.includes('id="site-menu"'), file);
  }
});

test('the language switch links each page to its counterpart and marks the current one', async () => {
  const ro = await read('ro/index.html');
  assert.match(ro, /<a href="\/" hreflang="en" lang="en" data-lang-link="en" aria-current="false">EN<\/a>/);
  assert.match(ro, /<a href="\/ro\/" hreflang="ro" lang="ro" data-lang-link="ro" aria-current="true">RO<\/a>/);
});

test('the first-visit redirect script is inlined only on the English home page', async () => {
  assert.ok((await read('index.html')).includes('data-lang-redirect'));
  assert.ok(!(await read('ro/index.html')).includes('data-lang-redirect'));
});

test('home pages have the games section, a tilt card and organisation JSON-LD', async () => {
  for (const file of ['index.html', 'ro/index.html']) {
    const html = await read(file);
    assert.ok(html.includes('id="games"'), file);
    assert.ok(html.includes('data-tilt'), file);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
    const org = blocks.find(b => b['@type'] === 'Organization');
    assert.ok(org, file);
    assert.equal(org.legalName, 'Paquett Studio Ltd');
    assert.equal(org.url, 'https://paquettstudio.com');
  }
});

const OFFICIAL = {
  'games/abyss-angler/index.html': {
    text: 'Abyss Angler is developed and published exclusively by Paquett Studio Ltd. The only official versions are listed here. Any other listing is unauthorised — please report it.',
    report: '/report/',
  },
  'ro/games/abyss-angler/index.html': {
    text: 'Abyss Angler este dezvoltat și publicat exclusiv de Paquett Studio Ltd. Singurele versiuni oficiale sunt cele listate aici. Orice altă listare este neautorizată — te rugăm să o raportezi.',
    report: '/ro/report/',
  },
};

test('the game page states the official releases and links the right report page', async () => {
  for (const [file, { text, report }] of Object.entries(OFFICIAL)) {
    const html = await read(file);
    assert.ok(html.includes(text), file);
    const box = html.match(/<section[^>]*class="[^"]*official[^"]*"[\s\S]*?<\/section>/)?.[0] ?? '';
    assert.ok(box.includes(`href="${report}"`), file);
  }
});

test('the game page describes the game as structured data published by the company', async () => {
  for (const file of Object.keys(OFFICIAL)) {
    const html = await read(file);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
    const game = blocks.find(b => b['@type'] === 'VideoGame');
    assert.ok(game, file);
    assert.equal(game.name, 'Abyss Angler');
    assert.equal(game.publisher.legalName, 'Paquett Studio Ltd');
    assert.deepEqual(game.gamePlatform, ['iOS', 'Android']);
  }
});

const LEGAL = ['legal/terms', 'legal/privacy', 'legal/copyright'];
const NOTICE = 'Traducere informativă; versiunea în engleză prevalează.';

test('Romanian legal pages carry the translation notice, English ones do not', async () => {
  for (const page of LEGAL) {
    assert.ok((await read(`ro/${page}/index.html`)).includes(NOTICE), `ro/${page}`);
    assert.ok(!(await read(`${page}/index.html`)).includes(NOTICE), page);
  }
});

test('every legal page shows when it was last updated', async () => {
  for (const page of LEGAL) {
    assert.match(await read(`${page}/index.html`), /Last updated/, page);
    assert.match(await read(`ro/${page}/index.html`), /Ultima actualizare/, `ro/${page}`);
  }
});

test('the report page opens a pre-addressed email in both languages', async () => {
  for (const file of ['report/index.html', 'ro/report/index.html']) {
    const html = await read(file);
    assert.ok(html.includes('mailto:'), file);
    assert.ok(html.includes('Report%20a%20copy'), file);
  }
});

test('robots.txt points crawlers at the sitemap', async () => {
  assert.equal(await read('robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://paquettstudio.com/sitemap.xml\n');
});

test('CNAME names the custom domain', async () => {
  assert.equal((await read('CNAME')).trim(), 'paquettstudio.com');
});

test('the 404 page is not indexed and offers a way home', async () => {
  const html = await read('404.html');
  assert.ok(html.includes('<meta name="robots" content="noindex">'));
  assert.ok(html.includes('href="/"'));
});

test('pages carry social preview tags with absolute URLs', async () => {
  const html = await read('ro/legal/terms/index.html');
  assert.ok(html.includes('<meta property="og:image" content="https://paquettstudio.com/assets/img/og-image.png">'));
  assert.ok(html.includes('<meta property="og:url" content="https://paquettstudio.com/ro/legal/terms/">'));
  assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'));
  assert.ok(!html.includes('noindex'));
});

test('the privacy policy states legal bases and does not overclaim anonymity', async () => {
  const en = await read('legal/privacy/index.html');
  const ro = await read('ro/legal/privacy/index.html');
  assert.match(en, /id="bases"[^>]*>[^<]*Legal bases/);
  assert.match(ro, /id="bases"[^>]*>[^<]*Temeiurile legale/);
  assert.ok(!/anonymous/i.test(en), 'EN must not call identifier-linked data anonymous');
  assert.ok(!/anonim/i.test(ro), 'RO must not call identifier-linked data anonymous');
  assert.match(en, /ad networks/);
});
