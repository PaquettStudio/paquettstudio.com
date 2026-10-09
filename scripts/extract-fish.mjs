// Picks the 36 species of Abyss Angler Idle from the Unity project (read only) and
// writes assets/data/fish.json.
//
//   node scripts/extract-fish.mjs --src "E:/Games/Abyss/Abyss 2D/Assets"
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The game's ten biomes (Scripts/Core/Biomes.cs) grouped into three playable zones.
export const ZONES = [
  { id: 'sunlit', name: 'Sunlit Lagoon', top: 0, bottom: 320 },
  { id: 'twilight', name: 'Twilight Trench', top: 320, bottom: 1300 },
  { id: 'abyss', name: 'The Abyss', top: 1300, bottom: 2500 },
];

const PER_ZONE = 12;
// Rarity enum in the game: 0 Common, 1 Uncommon, 2 Rare, 3 Epic, 4 Legendary, 5 Mythic.
const GROUPS = [
  { rarities: [0], want: 5 },
  { rarities: [1], want: 4 },
  { rarities: [2, 3], want: 2 },
  { rarities: [4, 5], want: 1 },
];

const NUMBER_FIELDS = ['rarity', 'baseValue', 'weightMin', 'weightMax', 'depthMin', 'depthMax', 'swimSpeed'];

export function parseFishAsset(text) {
  const field = name => text.match(new RegExp(`^\\s*${name}:\\s*(.+)$`, 'm'))?.[1]?.trim();
  const fishName = field('fishName');
  if (!fishName) return null;
  const record = { fishName };
  for (const name of NUMBER_FIELDS) record[name] = Number(field(name));
  const tint = text.match(/^\s*tint:\s*\{r:\s*([\d.]+),\s*g:\s*([\d.]+),\s*b:\s*([\d.]+)/m);
  record.tint = tint
    ? '#' + tint.slice(1, 4).map(c => Math.round(Number(c) * 255).toString(16).padStart(2, '0')).join('')
    : '#ffffff';
  return record;
}

export function parseHeld(rosterCs) {
  const block = rosterCs.match(/Held\s*=\s*new\(\)\s*\{([\s\S]*?)\n\s*\};/)?.[1] ?? '';
  return new Set([...block.matchAll(/\{\s*"([^"]+)"\s*,\s*"/g)].map(m => m[1]));
}

const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const mid = r => (r.depthMin + r.depthMax) / 2;
const byDepth = (a, b) => mid(a) - mid(b) || a.fishName.localeCompare(b.fishName);

// k items spread evenly across a depth-sorted pool, so a zone covers its whole range.
function pickSpread(pool, k) {
  if (k >= pool.length) return [...pool];
  return Array.from({ length: k }, (_, i) => pool[Math.floor(((i + 0.5) * pool.length) / k)]);
}

function selectZone(candidates, zone) {
  const pools = GROUPS.map(g => candidates.filter(r => g.rarities.includes(r.rarity)).sort(byDepth));
  const picked = GROUPS.map((g, i) => pickSpread(pools[i], g.want));
  const remaining = pools.map((pool, i) => pool.filter(r => !picked[i].includes(r)));
  GROUPS.forEach((g, i) => {
    let deficit = g.want - picked[i].length;
    // Fill from the next-lower rarity group first, then from the higher ones.
    const fallbacks = [...Array.from({ length: i }, (_, k) => i - 1 - k), ...Array.from({ length: GROUPS.length - i - 1 }, (_, k) => i + 1 + k)];
    for (const j of fallbacks) {
      if (deficit <= 0) break;
      const extra = pickSpread(remaining[j], deficit);
      remaining[j] = remaining[j].filter(r => !extra.includes(r));
      picked[i].push(...extra);
      deficit -= extra.length;
    }
  });
  const chosen = picked.flat().sort(byDepth);
  if (chosen.length < PER_ZONE) throw new Error(`Zone ${zone.id} has only ${chosen.length} eligible species`);
  return chosen;
}

export function selectSpecies(records, { zones, held, hasArt }) {
  const seen = new Set();
  const eligible = records.filter(r => {
    if (held.has(r.fishName) || !hasArt(r.fishName) || seen.has(r.fishName)) return false;
    seen.add(r.fishName);
    return true;
  });
  return zones.flatMap(zone => {
    const candidates = eligible.filter(r => mid(r) >= zone.top && mid(r) < zone.bottom);
    return selectZone(candidates, zone).map(r => ({
      id: slug(r.fishName),
      name: r.fishName,
      zone: zone.id,
      rarity: r.rarity,
      value: r.baseValue,
      weightMin: r.weightMin,
      weightMax: r.weightMax,
      depthMin: Math.max(r.depthMin, zone.top),
      depthMax: Math.min(r.depthMax, zone.bottom),
      swimSpeed: r.swimSpeed,
      tint: r.tint,
      art: `assets/img/play/fish/${slug(r.fishName)}.webp`,
    }));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const flag = process.argv.indexOf('--src');
  if (flag < 0) throw new Error('Usage: node scripts/extract-fish.mjs --src <Unity Assets folder>');
  const src = resolve(process.argv[flag + 1]);
  const fishDir = join(src, 'Resources/Fish');
  const records = [];
  for (const file of (await readdir(fishDir)).filter(f => f.endsWith('.asset'))) {
    const record = parseFishAsset(await readFile(join(fishDir, file), 'utf8'));
    if (record) records.push(record);
  }
  const held = parseHeld(await readFile(join(src, 'Scripts/Core/Roster.cs'), 'utf8'));
  const art = new Set((await readdir(join(src, 'Resources/FishArt'))).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)));
  const species = selectSpecies(records, { zones: ZONES, held, hasArt: name => art.has(name) });
  const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets/data/fish.json');
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify({ zones: ZONES, species }, null, 2) + '\n');
  console.log(`${records.length} fish read, ${held.size} held back, ${art.size} with art → ${species.length} species written`);
}
