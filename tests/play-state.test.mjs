import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ECONOMY, UPGRADE_IDS, createState, upgradeCost, derived, unlockedZoneIds, fishValue,
  buy, sell, idleEarnings, collectIdle, touch, save, load, reset, SAVE_KEY,
} from '../assets/js/play/state.js';

const MIN = 60_000;
const SPECIES = [
  { id: 'anchovy', name: 'European Anchovy', zone: 'sunlit', rarity: 0, value: 20, weightMin: 0.01, weightMax: 0.05 },
  { id: 'halibut', name: 'Atlantic Halibut', zone: 'sunlit', rarity: 0, value: 400, weightMin: 5, weightMax: 50 },
];
const byId = Object.fromEntries(SPECIES.map(s => [s.id, s]));
const withLevels = (levels, extra = {}) => ({ ...createState(), ...extra, levels: { ...createState().levels, ...levels } });

function memoryStorage() {
  const data = {};
  return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, removeItem: k => { delete data[k]; } };
}
const blocked = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); }, removeItem() { throw new Error('SecurityError'); } };

test('upgrade costs grow by 1.6 per level', () => {
  assert.equal(upgradeCost('line', 0), ECONOMY.costBase.line);
  assert.equal(upgradeCost('line', 5), Math.round(ECONOMY.costBase.line * 1.6 ** 5));
});

test('every upgrade has a base cost and a max level; the vessel has 2 levels', () => {
  for (const id of UPGRADE_IDS) {
    assert.ok(ECONOMY.costBase[id] > 0, id);
    assert.equal(ECONOMY.max[id], id === 'vessel' ? 2 : 10, id);
  }
});

test('derived stats at level 0 and level 10', () => {
  const low = derived(createState());
  assert.equal(low.maxDepth, 120);
  assert.equal(low.holdSize, 3);
  assert.equal(low.crewPerMinute, 0);
  const high = derived(withLevels(Object.fromEntries(UPGRADE_IDS.map(id => [id, ECONOMY.max[id]]))));
  assert.equal(high.maxDepth, 2500);
  assert.equal(high.holdSize, 12);
  assert.ok(high.crewPerMinute > 0);
});

test('line length unlocks the zones at 320 m and 1300 m', () => {
  assert.deepEqual(unlockedZoneIds(withLevels({ line: 2 })), ['sunlit']);
  assert.deepEqual(unlockedZoneIds(withLevels({ line: 3 })), ['sunlit', 'twilight']);
  assert.deepEqual(unlockedZoneIds(withLevels({ line: 6 })), ['sunlit', 'twilight']);
  assert.deepEqual(unlockedZoneIds(withLevels({ line: 7 })), ['sunlit', 'twilight', 'abyss']);
});

test('fish value is at least 1 and heavier fish are worth more', () => {
  const light = fishValue(SPECIES[1], 5), heavy = fishValue(SPECIES[1], 50);
  assert.ok(light >= 1);
  assert.ok(heavy > light);
});

test('buying with coins for exactly one level succeeds once', () => {
  const start = withLevels({}, { coins: upgradeCost('sink', 0) });
  const first = buy(start, 'sink');
  assert.equal(first.ok, true);
  assert.equal(first.state.levels.sink, 1);
  assert.equal(first.state.coins, 0);
  assert.equal(start.levels.sink, 0, 'buy must not mutate its input');
  const second = buy(first.state, 'sink');
  assert.equal(second.ok, false);
  assert.equal(second.state.coins, 0);
  assert.equal(second.state.levels.sink, 1);
});

test('buying past the max level fails', () => {
  const maxed = withLevels({ vessel: 2 }, { coins: 1e9 });
  assert.equal(buy(maxed, 'vessel').ok, false);
});

test('selling adds coins, records new species once and keeps the heaviest catch', () => {
  const first = sell(createState(), [{ speciesId: 'halibut', weight: 10 }, { speciesId: 'halibut', weight: 30 }], byId);
  assert.ok(first.coins > 0);
  assert.equal(first.state.coins, first.coins);
  assert.deepEqual(first.newSpecies, ['halibut']);
  assert.equal(first.state.collection.halibut, 30);
  const again = sell(first.state, [{ speciesId: 'halibut', weight: 12 }], byId);
  assert.deepEqual(again.newSpecies, []);
  assert.equal(again.state.collection.halibut, 30);
  assert.equal(again.state.stats.caught, 3);
});

test('the crew earns while you are away', () => {
  const now = Date.UTC(2026, 9, 9, 12);
  const state = withLevels({ crew: 3 }, { lastSeen: now - 10 * MIN, collection: { anchovy: 0.03 } });
  const earned = idleEarnings(state, now, byId);
  assert.equal(earned.minutes, 10);
  assert.ok(earned.coins > 0);
  assert.ok(earned.fish > 0);
});

test('idle earnings are capped at 8 hours', () => {
  const now = Date.UTC(2026, 9, 9, 12);
  const state = withLevels({ crew: 3 }, { lastSeen: now - 3 * 24 * 60 * MIN, collection: { anchovy: 0.03 } });
  assert.equal(idleEarnings(state, now, byId).minutes, 480);
});

test('a clock set backwards earns nothing', () => {
  const now = Date.UTC(2026, 9, 9, 12);
  const state = withLevels({ crew: 3 }, { lastSeen: now + 60 * MIN, collection: { anchovy: 0.03 } });
  assert.deepEqual(idleEarnings(state, now, byId), { minutes: 0, coins: 0, fish: 0 });
});

test('the crew cannot earn before any species is discovered or without nets', () => {
  const now = Date.UTC(2026, 9, 9, 12);
  assert.equal(idleEarnings(withLevels({ crew: 3 }, { lastSeen: now - 60 * MIN }), now, byId).coins, 0);
  assert.equal(idleEarnings(withLevels({ crew: 0 }, { lastSeen: now - 60 * MIN, collection: { anchovy: 0.03 } }), now, byId).coins, 0);
});

test('collecting idle earnings resets the clock so they are not counted twice', () => {
  const now = Date.UTC(2026, 9, 9, 12);
  const state = withLevels({ crew: 3 }, { lastSeen: now - 30 * MIN, collection: { anchovy: 0.03 } });
  const collected = collectIdle(state, now, byId);
  assert.ok(collected.coins > state.coins);
  assert.equal(idleEarnings(collected, now, byId).coins, 0);
  assert.equal(touch(state, now).lastSeen, now);
});

test('save and load round-trip the state', () => {
  const storage = memoryStorage();
  const state = withLevels({ line: 4 }, { coins: 77, collection: { anchovy: 0.04 } });
  save(storage, state);
  assert.deepEqual(load(storage), state);
});

test('blocked storage never throws and starts a fresh game', () => {
  assert.doesNotThrow(() => save(blocked, createState()));
  assert.deepEqual(load(blocked), createState());
  assert.doesNotThrow(() => reset(blocked));
});

test('a corrupt save starts fresh and is kept as a backup', () => {
  const storage = memoryStorage();
  storage.setItem(SAVE_KEY, '{not json');
  assert.deepEqual(load(storage), createState());
  assert.equal(storage.data[`${SAVE_KEY}.bak`], '{not json');
});

test('a save from an unknown version starts fresh and is kept as a backup', () => {
  const storage = memoryStorage();
  const future = JSON.stringify({ version: 2, coins: 5 });
  storage.setItem(SAVE_KEY, future);
  assert.deepEqual(load(storage), createState());
  assert.equal(storage.data[`${SAVE_KEY}.bak`], future);
});

test('reset clears the save but keeps a backup', () => {
  const storage = memoryStorage();
  save(storage, withLevels({}, { coins: 9 }));
  const before = storage.data[SAVE_KEY];
  reset(storage);
  assert.equal(storage.getItem(SAVE_KEY), null);
  assert.equal(storage.data[`${SAVE_KEY}.bak`], before);
});
