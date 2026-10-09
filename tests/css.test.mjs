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

test('content hidden for the reveal animation is hidden only when JavaScript runs', async () => {
  const offenders = [];
  for (const { file, selector, body } of await rules()) {
    if (!/opacity\s*:\s*0(?![.\d])/.test(body)) continue;
    for (const part of selector.split(',').map(s => s.trim())) {
      if (part.includes('.reveal') && !part.startsWith('.js ')) offenders.push(`${file}: ${part}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('nothing hides the system cursor', async () => {
  const offenders = (await rules()).filter(r => /cursor\s*:\s*none/.test(r.body)).map(r => `${r.file}: ${r.selector}`);
  assert.deepEqual(offenders, []);
});
