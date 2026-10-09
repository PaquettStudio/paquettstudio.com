// Abyss Angler Idle — one cast: the lure falls to the end of the line, then you steer it back up
// and fish bite on the way up (so deep species are reachable). Pure: no DOM; time and input come in.
import { derived, unlockedZoneIds, sell, ECONOMY } from './state.js';

export const WORLD_WIDTH = 60; // metres; depth grows downward in metres
const EDGE = 2;
const MAX_DT = 0.05;
const SPAWN_AHEAD = 70; // metres of water populated ahead of the hook
const SLICE = 6; // about one fish per 6 m of depth
const ZONE_RANGES = { sunlit: [0, 320], twilight: [320, 1300], abyss: [1300, 2500] };
const SHARK_FROM = 320;
const SHARK_EVERY = 150; // metres of descent between sharks, on average
const SHARK_SCARE = 12; // shark-to-hook distance that frightens fish
const SCARE_RADIUS = 15;
const SCARE_SECONDS = 1.5;

// mulberry32: small, fast, good enough for a game.
export function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSession() {
  return { cast: null };
}

export function requestCast(session, state, species, rng, { instant = false } = {}) {
  if (session.cast && session.cast.phase !== 'done') return false;
  const zones = unlockedZoneIds(state);
  session.cast = {
    phase: 'sinking',
    hook: { x: WORLD_WIDTH / 2, depth: 0 },
    caught: [],
    fish: [],
    sharks: [],
    limits: derived(state),
    eligible: species.filter(s => zones.includes(s.zone)),
    instant,
    time: 0,
    spawnedTo: 0,
    nextSharkAt: SHARK_FROM + rng() * SHARK_EVERY,
    nextId: 1,
  };
  return true;
}

const clampX = x => Math.min(WORLD_WIDTH - EDGE, Math.max(EDGE, x));
const zoneAt = depth => Object.keys(ZONE_RANGES).find(id => depth >= ZONE_RANGES[id][0] && depth < ZONE_RANGES[id][1]);

function pickSpecies(cast, depth, rng) {
  const zone = zoneAt(depth);
  const candidates = cast.eligible.filter(s => s.zone === zone);
  if (!candidates.length) return null;
  const weights = candidates.map(s => {
    const inRange = depth >= s.depthMin && depth <= s.depthMax;
    if (!inRange && s.rarity >= 2) return 0;
    return ECONOMY.rarityWeights[s.rarity] * (1 + ECONOMY.luckPerLevel * cast.limits.luck * s.rarity) * (inRange ? ECONOMY.inRangeBonus : 1);
  });
  if (!weights.some(w => w > 0)) return null;
  let roll = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

function spawnAhead(cast, rng) {
  const limit = Math.min(cast.limits.maxDepth, cast.hook.depth + SPAWN_AHEAD);
  while (cast.spawnedTo + SLICE <= limit) {
    const depth = cast.spawnedTo + rng() * SLICE;
    cast.spawnedTo += SLICE;
    const species = pickSpecies(cast, depth, rng);
    if (!species) continue;
    const dir = rng() < 0.5 ? -1 : 1;
    cast.fish.push({
      id: cast.nextId++,
      speciesId: species.id,
      x: EDGE + rng() * (WORLD_WIDTH - 2 * EDGE),
      depth,
      vx: dir * (2 + species.swimSpeed * 2),
      scaredUntil: 0,
    });
  }
}

function spawnSharks(cast, rng) {
  while (cast.hook.depth >= cast.nextSharkAt && cast.nextSharkAt < cast.limits.maxDepth) {
    const fromLeft = rng() < 0.5;
    cast.sharks.push({
      x: fromLeft ? -6 : WORLD_WIDTH + 6,
      depth: cast.hook.depth + 10 + rng() * 30,
      vx: (fromLeft ? 1 : -1) * (9 + rng() * 4),
    });
    cast.nextSharkAt += SHARK_EVERY * (0.6 + rng() * 0.8);
  }
}

function moveSharks(cast, dt) {
  for (const shark of cast.sharks) {
    shark.x += shark.vx * dt;
    if (Math.hypot(shark.x - cast.hook.x, shark.depth - cast.hook.depth) < SHARK_SCARE) {
      for (const fish of cast.fish) {
        if (Math.hypot(fish.x - shark.x, fish.depth - shark.depth) < SCARE_RADIUS) {
          fish.scaredUntil = cast.time + SCARE_SECONDS;
          fish.vx = Math.sign(fish.x - shark.x || 1) * 8;
        }
      }
    }
  }
  cast.sharks = cast.sharks.filter(s => s.x > -10 && s.x < WORLD_WIDTH + 10);
}

function moveFish(cast, dt) {
  for (const fish of cast.fish) {
    fish.x += fish.vx * dt;
    if (fish.x < 1 || fish.x > WORLD_WIDTH - 1) {
      fish.vx = -fish.vx;
      fish.x = Math.min(WORLD_WIDTH - 1, Math.max(1, fish.x));
    }
    if (fish.scaredUntil && cast.time > fish.scaredUntil) {
      fish.scaredUntil = 0;
      fish.vx = Math.sign(fish.vx) * 3;
    }
  }
}

function catchFish(cast, rng) {
  if (cast.phase !== 'reeling') return; // a falling lure is too fast to bite
  const { reach, holdSize } = cast.limits;
  cast.fish = cast.fish.filter(fish => {
    if (cast.caught.length >= holdSize) return true;
    if (Math.hypot(fish.x - cast.hook.x, fish.depth - cast.hook.depth) >= reach) return true;
    const species = cast.eligible.find(s => s.id === fish.speciesId);
    const weight = species ? species.weightMin + rng() * (species.weightMax - species.weightMin) : 0;
    cast.caught.push({ speciesId: fish.speciesId, weight });
    return false;
  });
}

export function stepCast(cast, dt, { targetX }, rng) {
  if (cast.phase === 'done') return;
  dt = Math.min(MAX_DT, Math.max(0, dt));
  cast.time += dt;
  const target = clampX(targetX);
  cast.hook.x = clampX(cast.instant ? target : cast.hook.x + (target - cast.hook.x) * Math.min(1, dt * 6));

  if (cast.phase === 'sinking') {
    cast.hook.depth = Math.min(cast.limits.maxDepth, cast.hook.depth + cast.limits.sinkSpeed * dt);
  } else {
    cast.hook.depth = Math.max(0, cast.hook.depth - cast.limits.reelSpeed * dt);
  }

  spawnAhead(cast, rng);
  spawnSharks(cast, rng);
  moveFish(cast, dt);
  moveSharks(cast, dt);
  catchFish(cast, rng);

  if (cast.phase === 'sinking' && cast.hook.depth >= cast.limits.maxDepth) {
    cast.phase = 'reeling';
  } else if (cast.phase === 'reeling' && cast.hook.depth <= 0) {
    cast.phase = 'done';
  }
}

// Tap again while the lure falls: it turns around and starts fishing on the way up.
export function reelIn(cast) {
  if (!cast || cast.phase !== 'sinking') return false;
  cast.phase = 'reeling';
  return true;
}

export function finishCast(state, cast, speciesById) {
  return sell(state, cast.caught, speciesById);
}
