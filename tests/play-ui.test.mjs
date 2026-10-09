import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createState, upgradeCost } from '../assets/js/play/state.js';
import { upgradeRows, welcomeText, caughtText, newSpeciesText, collectionView, onceThisSession, LOCKED_ROW_TEXT } from '../assets/js/play/ui.js';

const { zones, species } = JSON.parse(readFileSync(new URL('../assets/data/fish.json', import.meta.url), 'utf8'));

test('every upgrade has a row with its level, effect and cost', () => {
  const state = { ...createState(), coins: 50 };
  const rows = upgradeRows(state);
  assert.deepEqual(rows.map(r => r.id), ['line', 'sink', 'hold', 'reach', 'reel', 'luck', 'crew', 'vessel']);
  const line = rows[0];
  assert.equal(line.name, 'Line length');
  assert.equal(line.level, 0);
  assert.equal(line.max, 10);
  assert.equal(line.effect, '120 m → 220 m');
  assert.equal(line.cost, upgradeCost('line', 0));
  assert.equal(line.affordable, true);
  assert.equal(rows.find(r => r.id === 'vessel').affordable, false);
  assert.equal(rows.find(r => r.id === 'vessel').effect, 'Life ring → Rowboat');
});

test('a maxed upgrade has no cost and cannot be bought', () => {
  const state = createState();
  state.levels.line = 10;
  state.coins = 1e9;
  const line = upgradeRows(state)[0];
  assert.equal(line.maxed, true);
  assert.equal(line.affordable, false);
  assert.equal(line.cost, null);
  assert.equal(line.effect, '2500 m');
});

test('the welcome-back card uses the exact copy', () => {
  assert.equal(welcomeText({ fish: 12, coins: 3400 }), 'Your crew caught 12 fish worth 3,400 coins while you were away');
});

test('catches and new species are announced in plain words', () => {
  assert.equal(caughtText({ name: 'Bluegill' }, 1.234), 'Caught Bluegill, 1.2 kg');
  assert.equal(newSpeciesText({ name: 'Bluegill' }), 'New species: Bluegill');
});

test('the collection shows silhouettes for unseen species and the heaviest catch for caught ones', () => {
  const state = createState();
  const first = species[0];
  state.collection[first.id] = 3.456;
  const view = collectionView(state, species, zones);
  assert.equal(view.total, 36);
  assert.equal(view.caught, 1);
  assert.deepEqual(view.zones.map(z => z.cards.length), [12, 12, 12]);
  const cards = view.zones.flatMap(z => z.cards);
  const seen = cards.find(c => c.id === first.id);
  assert.equal(seen.known, true);
  assert.equal(seen.label, first.name);
  assert.equal(seen.detail, '3.5 kg');
  const unseen = cards.find(c => c.id !== first.id);
  assert.equal(unseen.known, false);
  assert.equal(unseen.label, '???');
  assert.equal(view.zones[1].locked, true);
  assert.equal(view.zones[0].locked, false);
  assert.equal(LOCKED_ROW_TEXT, '+245 more species in the full game');
});

test('a prompt shows at most once per session, even with blocked storage', () => {
  const data = {};
  const storage = { getItem: k => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
  assert.equal(onceThisSession(storage, 'complete'), true);
  assert.equal(onceThisSession(storage, 'complete'), false);
  assert.equal(onceThisSession(storage, 'forgotten-sea'), true);
  const blocked = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); } };
  assert.equal(onceThisSession(blocked, 'complete'), true);
  assert.equal(onceThisSession(blocked, 'complete'), false);
});

test('tiny fish are weighed in grams instead of 0.0 kg', () => {
  assert.equal(caughtText({ name: 'Spotted Lanternfish' }, 0.012), 'Caught Spotted Lanternfish, 12 g');
  assert.equal(caughtText({ name: 'Spotted Lanternfish' }, 0.0004), 'Caught Spotted Lanternfish, 1 g');
  assert.equal(caughtText({ name: 'Salema' }, 0.1), 'Caught Salema, 0.1 kg');
});
