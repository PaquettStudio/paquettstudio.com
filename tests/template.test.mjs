import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderTemplate } from '../lib/template.mjs';

test('double braces insert an HTML-escaped value', () => {
  assert.equal(renderTemplate('<p>{{ a.b }}</p>', { a: { b: '<x>' } }), '<p>&lt;x&gt;</p>');
});

test('triple braces insert the raw value', () => {
  assert.equal(renderTemplate('{{{ h }}}', { h: '<b>' }), '<b>');
});

test('a missing key throws with the key path in the message', () => {
  assert.throws(() => renderTemplate('{{ nope }}', {}), /Missing template key: nope/);
});

test('numbers are converted to strings', () => {
  assert.equal(renderTemplate('{{ year }}', { year: 2026 }), '2026');
});

test('quotes and ampersands are escaped', () => {
  assert.equal(renderTemplate('{{ v }}', { v: `a&b "c" 'd'` }), 'a&amp;b &quot;c&quot; &#39;d&#39;');
});
