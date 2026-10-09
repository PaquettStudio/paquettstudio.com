import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const cssDir = new URL('../assets/css/', import.meta.url);

async function rules() {
  const out = [];
  for (const file of (await readdir(cssDir)).filter(f => f.endsWith('.css'))) {
    const css = (await readFile(new URL(file, cssDir), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) out.push({ file, selector: selector.trim(), body });
  }
  return out;
}

test('content hidden for the reveal animation is hidden only once the reveal script has run', async () => {
  const offenders = [];
  for (const { file, selector, body } of await rules()) {
    if (!/opacity\s*:\s*0(?![.\d])/.test(body)) continue;
    for (const part of selector.split(',').map(s => s.trim())) {
      if (part.includes('.reveal') && !part.startsWith('.reveal-ready ')) offenders.push(`${file}: ${part}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('nothing hides the system cursor', async () => {
  const offenders = (await rules()).filter(r => /cursor\s*:\s*none/.test(r.body)).map(r => `${r.file}: ${r.selector}`);
  assert.deepEqual(offenders, []);
});

test('decorative glitch copies are hidden from screen readers', async () => {
  const offenders = (await rules())
    .filter(r => /content\s*:\s*attr\(data-t\)/.test(r.body) && !/content\s*:\s*attr\(data-t\)\s*\/\s*""/.test(r.body))
    .map(r => `${r.file}: ${r.selector}`);
  assert.deepEqual(offenders, []);
});

function luminance(hex) {
  const [r, g, b] = hex.match(/[0-9a-f]{2}/gi).map(h => parseInt(h, 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrastWithWhite = hex => 1.05 / (luminance(hex) + 0.05);

test('white text on the primary buttons and the active language pill meets WCAG AA', async () => {
  const all = await rules();
  const vars = Object.fromEntries(all.filter(r => r.selector === ':root').flatMap(r => [...r.body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()])));
  const resolve = v => v.replace(/var\((--[\w-]+)\)/g, (_, n) => resolve(vars[n] ?? ''));
  for (const selector of ['.btn-primary', '.lang-switch a[aria-current="true"]']) {
    const rule = all.find(r => r.selector === selector && /background/.test(r.body));
    assert.ok(rule, selector);
    const stops = resolve(rule.body).match(/#[0-9a-f]{6}/gi) ?? [];
    assert.ok(stops.length >= 2, `${selector} has no colour stops`);
    for (const stop of stops) assert.ok(contrastWithWhite(stop) >= 4.5, `${selector} ${stop}: ${contrastWithWhite(stop).toFixed(2)}:1`);
  }
});
