// The published configuration: English only (src/data/site.json → enabledLanguages).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../build.mjs';
import { checkSite } from './check-site.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let out;
const read = rel => readFile(join(out, rel), 'utf8');

before(async () => {
  out = await mkdtemp(join(tmpdir(), 'site-en-'));
  await build({ root, outDir: out });
});

test('no Romanian pages are published', async () => {
  await assert.rejects(access(join(out, 'ro/index.html')));
  await assert.rejects(access(join(out, 'ro/legal/privacy/index.html')));
});

test('pages carry no language switch, no hreflang and no language redirect', async () => {
  for (const file of ['index.html', 'games/abyss-angler/index.html', 'legal/terms/index.html', '404.html']) {
    const html = await read(file);
    assert.ok(!html.includes('data-lang-link'), file);
    assert.ok(!html.includes('hreflang='), file);
    assert.ok(!html.includes('data-lang-redirect'), file);
  }
});

test('the sitemap lists the six English pages without language alternates', async () => {
  const xml = await read('sitemap.xml');
  assert.equal(xml.match(/<url>/g).length, 6);
  assert.ok(!xml.includes('<xhtml:link'));
  assert.ok(!xml.includes('/ro/'));
});

test('the hero tagline is the cheeky one', async () => {
  const html = await read('index.html');
  assert.ok(html.includes('Small studio. Big worlds. Games that (mostly) respect your time.'));
  assert.ok(!/obsession/i.test(html));
});

test('the privacy policy no longer claims a remembered language choice', async () => {
  assert.ok(!/choose a language/i.test(await read('legal/privacy/index.html')));
});

test('the English-only site passes the strict release gate', async () => {
  assert.deepEqual(await checkSite(out, { strict: true, languages: [{ code: 'en', prefix: '' }] }), []);
});
