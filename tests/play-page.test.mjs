import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../build.mjs';
import { checkSite } from './check-site.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(await readFile(join(root, 'src/data/site.json'), 'utf8'));
let out;
const read = rel => readFile(join(out, rel), 'utf8');

before(async () => {
  out = await mkdtemp(join(tmpdir(), 'site-play-'));
  await build({ root, outDir: out });
});

// Abyss Angler Idle is paused while its fishing is fixed; reverting the pause commit restores the game tests.
test('while paused, /play/ explains the break, points to the full game and stays out of search', async () => {
  const html = await read('play/index.html');
  assert.ok(html.includes('taking a short break'));
  assert.ok(!html.includes('/assets/js/play/main.js'));
  assert.ok(html.includes('<meta name="robots" content="noindex">'));
  assert.ok(html.includes(`href="${site.games.abyssAngler.appStore}"`));
  assert.ok(html.includes(`href="${site.games.abyssAngler.googlePlay}"`));
});

test('while paused, nothing on the site links to /play/', async () => {
  for (const file of ['index.html', 'games/abyss-angler/index.html', 'legal/privacy/index.html']) {
    assert.ok(!(await read(file)).includes('href="/play/"'), file);
  }
});

test('the privacy policy mentions the game progress saved in the browser', async () => {
  assert.ok((await read('legal/privacy/index.html')).includes('Abyss Angler Idle'));
});

test('the built site including the play page passes the strict release gate', async () => {
  assert.deepEqual(await checkSite(out, { strict: true, languages: [{ code: 'en', prefix: '' }] }), []);
});

async function sizeOf(path) {
  const info = await stat(path).catch(() => null);
  if (!info) return 0;
  if (!info.isDirectory()) return info.size;
  let total = 0;
  for (const name of await readdir(path)) total += await sizeOf(join(path, name));
  return total;
}

test('the play page and everything it loads stay under 2 MB', async () => {
  const parts = ['play/index.html', 'assets/css', 'assets/js', 'assets/data/fish.json', 'assets/img/play', 'assets/fonts', 'assets/img/badges'];
  let total = 0;
  for (const part of parts) total += await sizeOf(join(out, part));
  assert.ok(total < 2_000_000, `${total} bytes`);
});
