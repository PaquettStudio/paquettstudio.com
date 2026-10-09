import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFishAsset, parseHeld, selectSpecies, ZONES } from '../scripts/extract-fish.mjs';

const VENT_ANEMONE = `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!114 &11400000
MonoBehaviour:
  m_Name: Abyssal_Anglerfish
  m_EditorClassIdentifier: Assembly-CSharp::FishData
  fishName: Vent Anemone
  sprite: {fileID: 0}
  rarity: 1
  tint: {r: 0.14901961, g: 0.6509804, b: 0.6039216, a: 1}
  baseValue: 3959
  weightMin: 0.0675
  weightMax: 0.285
  depthMin: 937.8
  depthMax: 979.8
  swimSpeed: 1.23
  swimRangeX: 3.4
`;

const ROSTER = `
    private static readonly Dictionary<string, string> Held = new()
    {
        // comment
        { "Hagfish",             "corp șerpuit — nu se poate felia" },
        { "Vampire Squid",       "vedere frontală — nimic de animat" },
    };
    public static bool Other = true;
`;

test('parseFishAsset reads the fields of a real fish asset', () => {
  assert.deepEqual(parseFishAsset(VENT_ANEMONE), {
    fishName: 'Vent Anemone', rarity: 1, baseValue: 3959, weightMin: 0.0675, weightMax: 0.285,
    depthMin: 937.8, depthMax: 979.8, swimSpeed: 1.23, tint: '#26a69a',
  });
});

test('parseFishAsset ignores assets that are not fish', () => {
  assert.equal(parseFishAsset('MonoBehaviour:\n  m_Name: Something\n  value: 3\n'), null);
});

test('parseHeld lists the held-back species', () => {
  const held = parseHeld(ROSTER);
  assert.ok(held.has('Hagfish'));
  assert.ok(held.has('Vampire Squid'));
  assert.equal(held.size, 2);
});

// 40 records per zone: 16 common, 12 uncommon, 6 rare, 3 epic, 2 legendary, 1 mythic.
function makeRecords({ withoutTopRarityIn = null } = {}) {
  const mix = [16, 12, 6, 3, 2, 1];
  const out = [];
  for (const zone of ZONES) {
    let n = 0;
    mix.forEach((count, rarity) => {
      if (zone.id === withoutTopRarityIn && rarity >= 4) return;
      for (let i = 0; i < count; i++, n++) {
        const mid = zone.top + ((n + 0.5) / 40) * (zone.bottom - zone.top);
        out.push({ fishName: `${zone.id} fish ${rarity}-${i}`, rarity, baseValue: 10 + n, weightMin: 1, weightMax: 2,
          depthMin: mid - 5, depthMax: mid + 5, swimSpeed: 1, tint: '#336699' });
      }
    });
  }
  return out;
}

const options = (extra = {}) => ({ zones: ZONES, held: new Set(), hasArt: () => true, ...extra });

test('selectSpecies picks 12 species per zone with the 5/4/2/1 rarity mix', () => {
  const species = selectSpecies(makeRecords(), options());
  assert.equal(species.length, 36);
  for (const zone of ZONES) {
    const inZone = species.filter(s => s.zone === zone.id);
    assert.equal(inZone.length, 12, zone.id);
    const count = test => inZone.filter(s => test(s.rarity)).length;
    assert.deepEqual([count(r => r === 0), count(r => r === 1), count(r => r === 2 || r === 3), count(r => r >= 4)], [5, 4, 2, 1], zone.id);
  }
});

test('selectSpecies skips held-back species and species without art', () => {
  const records = makeRecords();
  const held = new Set(['sunlit fish 0-0', 'twilight fish 1-0']);
  const species = selectSpecies(records, options({ held, hasArt: name => name !== 'abyss fish 0-1' }));
  const names = new Set(species.map(s => s.name));
  assert.ok(!names.has('sunlit fish 0-0'));
  assert.ok(!names.has('twilight fish 1-0'));
  assert.ok(!names.has('abyss fish 0-1'));
  assert.equal(species.length, 36);
});

test('selectSpecies is deterministic', () => {
  assert.deepEqual(selectSpecies(makeRecords(), options()), selectSpecies(makeRecords(), options()));
});

test('a zone without legendary fish fills the gap from the rarer groups below', () => {
  const species = selectSpecies(makeRecords({ withoutTopRarityIn: 'abyss' }), options());
  assert.equal(species.filter(s => s.zone === 'abyss').length, 12);
});

test('selected species carry web-ready fields clamped to their zone', () => {
  const [first] = selectSpecies(makeRecords(), options());
  assert.match(first.id, /^[a-z0-9-]+$/);
  assert.equal(first.art, `assets/img/play/fish/${first.id}.webp`);
  const zone = ZONES.find(z => z.id === first.zone);
  assert.ok(first.depthMin >= zone.top && first.depthMax <= zone.bottom);
});
