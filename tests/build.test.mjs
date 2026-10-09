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
  await build({ root, outDir: out });
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
