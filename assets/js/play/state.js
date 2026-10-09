// Abyss Angler Idle — game state, economy, idle earnings and saves. Pure: no DOM, no clock.

export const SAVE_KEY = 'paquett.idle.v1';
const VERSION = 1;
const MINUTE = 60_000;

export const UPGRADE_IDS = ['line', 'sink', 'hold', 'reach', 'reel', 'luck', 'crew', 'vessel'];

// Every tuning number lives here (pacing is checked by tests/play-sim.test.mjs).
export const ECONOMY = {
  costBase: { line: 25, sink: 15, hold: 30, reach: 20, reel: 15, luck: 60, crew: 50, vessel: 400 },
  max: { line: 10, sink: 10, hold: 10, reach: 10, reel: 10, luck: 10, crew: 10, vessel: 2 },
  growth: 1.6,
  valueScale: 0.8,
  crewRate: 0.4, // fish per minute per Crew nets level
  idleCapMinutes: 480,
  lineDepths: [120, 220, 320, 500, 750, 1000, 1300, 1650, 2000, 2250, 2500],
};

const ZONES = [
  { id: 'sunlit', top: 0 },
  { id: 'twilight', top: 320 },
  { id: 'abyss', top: 1300 },
];

export function createState() {
  return {
    version: VERSION,
    coins: 0,
    levels: Object.fromEntries(UPGRADE_IDS.map(id => [id, 0])),
    collection: {},
    lastSeen: null,
    stats: { casts: 0, caught: 0 },
  };
}

const clone = state => structuredClone(state);

export function upgradeCost(id, level) {
  return Math.round(ECONOMY.costBase[id] * ECONOMY.growth ** level);
}

export function derived(state) {
  const l = state.levels;
  return {
    maxDepth: ECONOMY.lineDepths[l.line],
    sinkSpeed: 40 + 12 * l.sink,
    holdSize: Math.round(3 + 0.9 * l.hold),
    reach: 4 + 0.6 * l.reach,
    reelSpeed: 80 + 20 * l.reel,
    luck: l.luck,
    crewPerMinute: ECONOMY.crewRate * l.crew,
    vessel: l.vessel,
  };
}

export function unlockedZoneIds(state, zones = ZONES) {
  const { maxDepth } = derived(state);
  return zones.filter(z => z.top < maxDepth).map(z => z.id);
}

export function fishValue(species, weight) {
  const span = species.weightMax - species.weightMin;
  const rel = span > 0 ? Math.min(1, Math.max(0, (weight - species.weightMin) / span)) : 0.5;
  return Math.max(1, Math.round(Math.sqrt(species.value) * ECONOMY.valueScale * (0.8 + 0.4 * rel)));
}

export function buy(state, id) {
  const level = state.levels[id];
  if (level === undefined || level >= ECONOMY.max[id]) return { ok: false, state };
  const cost = upgradeCost(id, level);
  if (state.coins < cost) return { ok: false, state };
  const next = clone(state);
  next.coins -= cost;
  next.levels[id] = level + 1;
  return { ok: true, state: next };
}

export function sell(state, catches, speciesById) {
  const next = clone(state);
  let coins = 0;
  const newSpecies = [];
  for (const { speciesId, weight } of catches) {
    const species = speciesById[speciesId];
    if (!species) continue;
    coins += fishValue(species, weight);
    if (!(speciesId in next.collection)) {
      if (!newSpecies.includes(speciesId)) newSpecies.push(speciesId);
      next.collection[speciesId] = weight;
    } else {
      next.collection[speciesId] = Math.max(next.collection[speciesId], weight);
    }
    next.stats.caught += 1;
  }
  next.coins += coins;
  next.stats.casts += 1;
  return { state: next, coins, newSpecies };
}

export function idleEarnings(state, now, speciesById) {
  const none = { minutes: 0, coins: 0, fish: 0 };
  if (state.lastSeen == null || now <= state.lastSeen) return none;
  const known = Object.keys(state.collection).map(id => speciesById[id]).filter(Boolean);
  const perMinute = derived(state).crewPerMinute;
  if (!known.length || perMinute <= 0) return none;
  const minutes = Math.min(ECONOMY.idleCapMinutes, Math.floor((now - state.lastSeen) / MINUTE));
  const fish = Math.floor(minutes * perMinute);
  const average = known.reduce((sum, s) => sum + fishValue(s, (s.weightMin + s.weightMax) / 2), 0) / known.length;
  return { minutes, coins: Math.round(fish * average), fish };
}

export function collectIdle(state, now, speciesById) {
  const { coins } = idleEarnings(state, now, speciesById);
  const next = clone(state);
  next.coins += coins;
  next.lastSeen = now;
  return next;
}

export function touch(state, now) {
  const next = clone(state);
  next.lastSeen = now;
  return next;
}

function read(storage, key) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(storage, key, value) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Storage blocked: the game keeps running in memory only.
  }
}

export function save(storage, state) {
  write(storage, SAVE_KEY, JSON.stringify(state));
}

export function load(storage) {
  const raw = read(storage, SAVE_KEY);
  if (raw === null) return createState();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (!parsed || parsed.version !== VERSION) {
    write(storage, `${SAVE_KEY}.bak`, raw);
    return createState();
  }
  const fresh = createState();
  return { ...fresh, ...parsed, levels: { ...fresh.levels, ...parsed.levels }, stats: { ...fresh.stats, ...parsed.stats } };
}

export function reset(storage) {
  const raw = read(storage, SAVE_KEY);
  if (raw !== null) write(storage, `${SAVE_KEY}.bak`, raw);
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {
    // Storage blocked: nothing to clear.
  }
}
