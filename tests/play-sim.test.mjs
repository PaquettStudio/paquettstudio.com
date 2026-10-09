import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { WORLD_WIDTH, createRng, createSession, requestCast, stepCast, finishCast, reelIn } from '../assets/js/play/sim.js';
import { createState, derived, buy, upgradeCost, unlockedZoneIds, UPGRADE_IDS, ECONOMY } from '../assets/js/play/state.js';

const data = JSON.parse(await readFile(new URL('../assets/data/fish.json', import.meta.url), 'utf8'));
const speciesById = Object.fromEntries(data.species.map(s => [s.id, s]));
const withLevels = levels => ({ ...createState(), levels: { ...createState().levels, ...levels } });

function runToEnd(cast, rng, targetX = 30, onStep = () => {}) {
  for (let i = 0; i < 100000 && cast.phase !== 'done'; i++) {
    stepCast(cast, 0.05, { targetX }, rng);
    onStep(cast);
  }
}

test('without fish the hook sinks exactly to the line length, reels up and finishes', () => {
  const session = createSession();
  requestCast(session, withLevels({ line: 3 }), [], createRng(1));
  let deepest = 0;
  runToEnd(session.cast, createRng(1), 30, c => { deepest = Math.max(deepest, c.hook.depth); });
  assert.equal(deepest, derived(withLevels({ line: 3 })).maxDepth);
  assert.equal(session.cast.phase, 'done');
  assert.equal(session.cast.hook.depth, 0);
});

test('nothing is caught on the way down; the hold fills on the way up and then stops', () => {
  const session = createSession();
  requestCast(session, createState(), [], createRng(2));
  const cast = session.cast;
  for (let d = 2; d < 100; d += 1) cast.fish.push({ id: d, speciesId: 'european-anchovy', x: 30, depth: d, vx: 0, scaredUntil: 0 });
  while (cast.phase === 'sinking') stepCast(cast, 0.05, { targetX: 30 }, createRng(2));
  assert.equal(cast.caught.length, 0, 'caught while sinking');
  while (cast.phase !== 'done') stepCast(cast, 0.05, { targetX: 30 }, createRng(2));
  assert.equal(cast.caught.length, derived(createState()).holdSize);
});

test('fish are caught inside the hook reach and not outside it', () => {
  const state = createState();
  const { reach } = derived(state);
  const session = createSession();
  requestCast(session, state, [], createRng(3));
  const cast = session.cast;
  cast.hook.depth = 50;
  cast.phase = 'reeling';
  cast.fish.push({ id: 1, speciesId: 'european-anchovy', x: 30 + reach + 0.1, depth: 50, vx: 0, scaredUntil: 0 });
  cast.fish.push({ id: 2, speciesId: 'salema', x: 30, depth: 50 - (reach - 0.1), vx: 0, scaredUntil: 0 });
  stepCast(cast, 0.0001, { targetX: 30 }, createRng(3));
  assert.deepEqual(cast.caught.map(c => c.speciesId), ['salema']);
});

test('the hook never leaves the playfield', () => {
  const session = createSession();
  requestCast(session, createState(), [], createRng(4));
  for (let i = 0; i < 200; i++) stepCast(session.cast, 0.05, { targetX: 999 }, createRng(4));
  assert.ok(session.cast.hook.x <= WORLD_WIDTH - 2);
  for (let i = 0; i < 200; i++) stepCast(session.cast, 0.05, { targetX: -999 }, createRng(4));
  assert.ok(session.cast.hook.x >= 2);
});

test('sharks scare fish but never take a catch', () => {
  const rng = createRng(5);
  const state = withLevels({ line: 10, hold: 10, reach: 10, sink: 4 });
  let sharksSeen = 0;
  for (let i = 0; i < 200; i++) {
    const session = createSession();
    // Only abyss fish, so the hook reaches the shark depths before the hold fills.
    requestCast(session, state, data.species.filter(s => s.zone === 'abyss'), rng);
    let previous = 0;
    runToEnd(session.cast, rng, 10 + (i % 40), c => {
      assert.ok(c.caught.length >= previous, 'a catch was lost');
      previous = c.caught.length;
      sharksSeen += c.sharks.length;
    });
  }
  assert.ok(sharksSeen > 0, 'no shark ever appeared');
});

test('reeling in early turns the hook around where it is', () => {
  const session = createSession();
  requestCast(session, withLevels({ line: 10 }), [], createRng(7));
  const cast = session.cast;
  for (let i = 0; i < 20; i++) stepCast(cast, 0.05, { targetX: 30 }, createRng(7));
  const depth = cast.hook.depth;
  assert.equal(reelIn(cast), true);
  assert.equal(cast.phase, 'reeling');
  assert.equal(reelIn(cast), false);
  stepCast(cast, 0.05, { targetX: 30 }, createRng(7));
  assert.ok(cast.hook.depth < depth);
});

test('a second cast cannot start while one is running', () => {
  const session = createSession();
  assert.equal(requestCast(session, createState(), [], createRng(6)), true);
  assert.equal(requestCast(session, createState(), [], createRng(6)), false);
  runToEnd(session.cast, createRng(6));
  assert.equal(requestCast(session, createState(), [], createRng(6)), true);
});

// A steady, average player: casts back to back, steers toward the nearest fish ahead,
// and buys the cheapest useful upgrade (line length first when affordable).
function simulatePlayer(minutes) {
  const rng = createRng(42);
  let state = createState();
  let clock = 0;
  const marks = {};
  const useful = UPGRADE_IDS.filter(id => id !== 'vessel' && id !== 'crew');
  while (clock < minutes * 60) {
    const session = createSession();
    requestCast(session, state, data.species, rng);
    const cast = session.cast;
    const missing = data.species.filter(s => !(s.id in state.collection) && unlockedZoneIds(state).includes(s.zone));
    const turnAt = missing.length ? Math.max(...missing.map(s => s.depthMax)) + 10 : Infinity;
    while (cast.phase !== 'done') {
      if (cast.phase === 'sinking' && cast.hook.depth >= turnAt) reelIn(cast);
      const ahead = cast.fish.filter(f => (cast.phase === 'sinking' ? f.depth > cast.hook.depth : f.depth < cast.hook.depth));
      ahead.sort((a, b) => Math.abs(a.depth - cast.hook.depth) - Math.abs(b.depth - cast.hook.depth));
      stepCast(cast, 0.05, { targetX: ahead[0]?.x ?? 30 }, rng);
      clock += 0.05;
    }
    clock += 2;
    state = finishCast(state, cast, speciesById).state;
    for (;;) {
      const affordable = useful.filter(id => state.levels[id] < ECONOMY.max[id] && upgradeCost(id, state.levels[id]) <= state.coins);
      if (!affordable.length) break;
      const pick = affordable.includes('line') ? 'line' : affordable.sort((a, b) => upgradeCost(a, state.levels[a]) - upgradeCost(b, state.levels[b]))[0];
      state = buy(state, pick).state;
    }
    const zones = unlockedZoneIds(state);
    if (zones.includes('twilight')) marks.twilight ??= clock / 60;
    if (zones.includes('abyss')) marks.abyss ??= clock / 60;
    if (Object.keys(state.collection).length === data.species.length) { marks.complete ??= clock / 60; break; }
  }
  return marks;
}

test('pacing: zones unlock around 10 and 30 minutes, the collection takes 1–2 hours', () => {
  const marks = simulatePlayer(180);
  assert.ok(marks.twilight >= 5 && marks.twilight <= 15, `twilight at ${marks.twilight?.toFixed(1)} min`);
  assert.ok(marks.abyss >= 20 && marks.abyss <= 45, `abyss at ${marks.abyss?.toFixed(1)} min`);
  assert.ok(marks.complete >= 60 && marks.complete <= 150, `complete at ${marks.complete?.toFixed(1)} min`);
});
