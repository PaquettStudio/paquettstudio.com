import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parsePage, outputPathFor, urlFor, collectPages } from '../lib/pages.mjs';

const LANGS = [
  { code: 'en', label: 'EN', name: 'English', prefix: '' },
  { code: 'ro', label: 'RO', name: 'Română', prefix: '/ro' },
];

test('outputPathFor maps the root page to index.html', () => {
  assert.equal(outputPathFor('', '/'), 'index.html');
});

test('outputPathFor nests prefixed folder paths', () => {
  assert.equal(outputPathFor('/ro', '/legal/terms/'), 'ro/legal/terms/index.html');
});

test('outputPathFor keeps file paths as files', () => {
  assert.equal(outputPathFor('', '/404.html'), '404.html');
});

test('urlFor joins the language prefix and the page path', () => {
  assert.equal(urlFor('/ro', '/'), '/ro/');
  assert.equal(urlFor('', '/report/'), '/report/');
});

test('parsePage reads the JSON header and the body', () => {
  const src = '<!--page {"id":"home","path":"/","title":"T","description":"D"} -->\n<h1>Hi</h1>\n';
  const { meta, body } = parsePage(src, 'home.html');
  assert.deepEqual(meta, { id: 'home', path: '/', title: 'T', description: 'D' });
  assert.equal(body.trim(), '<h1>Hi</h1>');
});

test('parsePage names the file when the header is missing', () => {
  assert.throws(() => parsePage('<h1>Hi</h1>', 'src/pages/en/broken.html'), /broken\.html/);
});

async function pagesDir(files) {
  const dir = await mkdtemp(join(tmpdir(), 'pages-'));
  for (const [rel, content] of Object.entries(files)) {
    await mkdir(join(dir, rel, '..'), { recursive: true });
    await writeFile(join(dir, rel), content);
  }
  return dir;
}

const header = (id, path, extra = '') => `<!--page {"id":"${id}","path":"${path}","title":"t","description":"d"${extra}} -->\n`;

test('collectPages fails when a page has no counterpart in another language', async () => {
  const dir = await pagesDir({
    'en/home.html': header('home', '/'),
    'ro/home.html': header('home', '/'),
    'en/terms.html': header('terms', '/legal/terms/'),
  });
  await assert.rejects(collectPages(dir, LANGS), /Page "terms" missing in ro/);
});

test('collectPages allows single pages in one language only', async () => {
  const dir = await pagesDir({
    'en/home.html': header('home', '/'),
    'ro/home.html': header('home', '/'),
    'en/404.html': header('404', '/404.html', ',"single":true'),
  });
  const pages = await collectPages(dir, LANGS);
  assert.equal(pages.length, 3);
  assert.equal(pages.filter(p => p.meta.id === '404').length, 1);
});
