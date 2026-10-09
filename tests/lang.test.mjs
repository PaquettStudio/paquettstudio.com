import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { rememberLang } from '../assets/js/i18n.js';

const redirectSource = await readFile(new URL('../src/partials/lang-redirect.js', import.meta.url), 'utf8');

function runRedirect({ path = '/', search = '', hash = '', stored = null, storageThrows = false, languages, language }) {
  const replaced = [];
  const window = {
    navigator: { languages, language },
    location: { pathname: path, search, hash, replace: url => replaced.push(url) },
  };
  Object.defineProperty(window, 'localStorage', {
    get() {
      if (storageThrows) throw new Error('SecurityError');
      return { getItem: key => (key === 'paquett.lang' ? stored : null) };
    },
  });
  runInNewContext(redirectSource, { window });
  return replaced;
}

test('a Romanian browser with no saved choice is sent to /ro/', () => {
  assert.deepEqual(runRedirect({ languages: ['ro-RO'] }), ['/ro/']);
});

test('a saved English choice wins over a Romanian browser', () => {
  assert.deepEqual(runRedirect({ stored: 'en', languages: ['ro'] }), []);
});

test('a saved Romanian choice redirects even from an English browser', () => {
  assert.deepEqual(runRedirect({ stored: 'ro', languages: ['en-GB'] }), ['/ro/']);
});

test('blocked storage counts as no saved choice and does not throw', () => {
  assert.deepEqual(runRedirect({ storageThrows: true, languages: ['ro'] }), ['/ro/']);
});

test('an English browser with no saved choice stays put', () => {
  assert.deepEqual(runRedirect({ languages: ['en-US'] }), []);
});

test('navigator.language is used when navigator.languages is missing', () => {
  assert.deepEqual(runRedirect({ languages: undefined, language: 'ro' }), ['/ro/']);
});

test('query string and hash are preserved', () => {
  assert.deepEqual(runRedirect({ search: '?x=1', hash: '#a', languages: ['ro'] }), ['/ro/?x=1#a']);
});

test('only the root path redirects', () => {
  assert.deepEqual(runRedirect({ path: '/legal/terms/', languages: ['ro'] }), []);
});

test('rememberLang stores the chosen language', () => {
  const data = {};
  rememberLang({ setItem: (k, v) => { data[k] = v; } }, 'ro');
  assert.deepEqual(data, { 'paquett.lang': 'ro' });
});

test('rememberLang never throws when storage is blocked', () => {
  assert.doesNotThrow(() => rememberLang({ setItem() { throw new Error('QuotaExceeded'); } }, 'en'));
  assert.doesNotThrow(() => rememberLang(null, 'en'));
});
