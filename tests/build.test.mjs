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
