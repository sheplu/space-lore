#!/usr/bin/env node
/**
 * Bulk system seeder — a deterministic, programmatic equivalent of the
 * /star-system skill for demo density (20-30 systems).
 *
 * It reads the same contract the skills obey (data/taxonomy.json ranges +
 * position-derived ids), writes content/<galaxy>/systems/sys-*.json files and
 * merges quadrant mappings, then leaves validation to `npm run validate`.
 *
 * Lore is assembled from curated fragment banks (invented proper nouns,
 * 3-sentence descriptions, 2-4 tags) — good enough for a demo backdrop;
 * hand-crafted hero systems still belong to the /star-system skill.
 *
 * Run with: node scripts/seed-systems.mjs [--seed <string>] [--galaxy <galaxyId>] [--dry-run] [--prune]
 *
 * --prune removes system files (and their quadrant refs) that this run did not
 * produce — useful after changing the script, which shifts the RNG stream and
 * orphans earlier files. Do NOT use it in galaxies with hand-crafted systems
 * unless those ids are also produced by the current seed.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

const ID_PREFIX = {
  starSystem: 'sys', star: 'star', planet: 'plnt', moon: 'moon', asteroid: 'ast',
  belt: 'belt', dwarfPlanet: 'dwpl', comet: 'com',
};

function deriveId(kind, ...parts) {
  if (parts.length === 0) throw new Error(`deriveId(${kind}) needs position parts`);
  const hash = createHash('sha256').update(parts.map(String).join('|'), 'utf8').digest('hex').slice(0, 8);
  return `${ID_PREFIX[kind]}-${hash}`;
}

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
const uniform = (rnd, min, max) => min + rnd() * (max - min);
const logUniform = (rnd, min, max) => Math.exp(uniform(rnd, Math.log(min), Math.log(max)));
const inRange = (rnd, range) => {
  const { min, max } = range;
  // Log-uniform only for strictly positive ranges spanning 2+ orders of magnitude.
  const v = min > 0 && max / min > 100 ? logUniform(rnd, min, max) : uniform(rnd, min, max);
  return Math.min(max, Math.max(min, v));
};
const roundSig = (v, sig = 4) => {
  if (v === 0) return 0;
  const p = Math.pow(10, sig - Math.ceil(Math.log10(Math.abs(v))));
  return Math.round(v * p) / p;
};
function weighted(rnd, entries) {
  let r = rnd();
  for (const [value, weight] of entries) {
    r -= weight;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

// ---------------------------------------------------------------------------
// Lore banks (invented proper nouns; no Earth mythology or trademarks)
// ---------------------------------------------------------------------------

const SYS_A = ['Vel', 'Kor', 'Thal', 'Dus', 'Ember', 'Hal', 'isen', 'Mar', 'Ost', 'Rhen', 'Sar', 'Thess', 'Ul', 'Vire', 'Wex', 'Xan', 'Ysol', 'Zeth', 'Cal', 'Dra', 'Fen', 'Gal', 'Hes', 'Iri', 'Jor', 'Kel', 'Lyr', 'Mor', 'Neth', 'Oph', 'Pel', 'Quen', 'Ras', 'Sel', 'Tor', 'Vann'];
const SYS_B = ['mora', 'thil', 'dara', 'kwatch', 'fall', 'reach', 'garde', 'holme', 'spire', 'ward', 'light', 'deep', 'mark', 'shore', 'vale', 'wake', 'borne', 'fell', 'haven', 'mere', 'nost', 'quel', 'rost', 'sarn', 'thwaite', 'vost', 'wren', 'yx', 'zar', 'delle', 'fane', 'garr', 'host', 'ilmar', 'ost', 'quil'];
const STAR_A = ['Ashen', 'Pale', 'Red', 'Hollow', 'Bright', 'Still', 'Far', 'Cold', 'Last', 'First', 'Low', 'High', 'New', 'Old', 'Grim', 'Kind', 'Lone', 'Twin', 'Veiled', 'Waking'];
const STAR_B = ['Cinder', 'Lantern', 'Ember', 'Taper', 'Brand', 'Torch', 'Signal', 'Beacon', 'Eye', 'Crown', 'Thorn', 'Anvil', 'Hammer', 'Drum', 'Bell', 'Choir', 'Hearth', 'Pyre', 'Moth', 'Wick'];
const WORLD_A = ['Kiln', 'Rust', 'Meridian', 'Broad', 'Pale', 'Ash', 'Bitter', 'Calm', 'Drowned', 'Gilded', 'Hollow', 'Iron', 'Shallow', 'Silent', 'Glass', 'Moss', 'Cinder', 'Frost', 'Storm', 'Vapor', 'Obsidian', 'Quartz', 'Tide', 'Umber'];
const WORLD_B = ['mark', 'fall', 'deep', 'ward', 'shallows', 'reach', 'holm', 'garde', 'mere', 'fell', 'crest', 'hollow', 'bank', 'field', 'rock', 'spire', 'vast', 'wold', 'moor', 'fen'];
const ROCK_A = ['Crag', 'Shard', 'Rubble', 'Gravel', 'Scree', 'Boulder', 'Pebble', 'Flint', 'Slate', 'Basalt', 'Granite', 'Pumice'];
const COMET_A = ['Long', 'Late', 'Lost', 'Lone', 'Returning', 'Wandering', 'Silent', 'Swift', 'Winter', 'Hollow', 'Pale', 'Grey'];
const COMET_B = ['Tear', 'Omen', 'Herald', 'Pilgrim', 'Mourner', 'Stranger', 'Lantern', 'Veil', 'Shroud', 'Thread', 'Needle', 'Promise'];

const SYS_HEAD = [
  '{sys} burns at the edge of charted space, its light reaching survey scopes long before any hull.',
  'Few charts agree on {sys}, whose primary casts a {glow} glare across the local dark.',
  '{sys} hangs {where}, a compact court of worlds bound to a {glow} heart.',
  'Long-range scopes flagged {sys} for its {glow} signature, brighter than its mass allows.',
  '{sys} is a {where2} system, steady enough for beacons and strange enough for rumors.',
  'The {glow} light of {sys} has guided three generations of drift miners and twice as many ghosts.',
];
const SYS_MID = [
  'Its worlds formed late from enriched debris, and their crusts still carry the ratio of that violent birth.',
  'A shepherd belt divides the inner rock from the outer ice, and both sides show old impact gardens.',
  'Survey crews logged eccentric comets and a trojan swarm before moving on to richer claims.',
  'Tidal kneading keeps the inner planets restless, and quake swarms punctuate the long quiet.',
  'The outer dark holds dwarf worlds nobody bothered to name, each colder than the last.',
  'Old claim buoys tumble here, their registries expired and their owners gone.',
  'Resonant chains lock the middle planets into a slow stately dance visible over decades.',
  'A sungrazer returns on schedule, brightening the inner system like a festival lantern.',
];
const SYS_HOOK = [
  'Something in the belt reflects too regularly, and the guild pays for a second look.',
  'One moon occults on a schedule that matches no ephemeris, and navigators plan around it.',
  'A derelict relay drifts at the edge, still warm, still broadcasting nothing.',
  'Claim jumpers whisper about a world that charts itself differently every survey.',
  'The guild maintains a listening post here, though no report has ever named its purpose.',
  'Salvage crews swear the comets arrive in formation, and the math almost agrees.',
  'A standing bounty covers any intact core sample from the second planet outward.',
  'Pilots time their burns to the pulsar remnant next door, when the static clears.',
];

const STAR_DESC = {
  'main-sequence': ['A {c} star burning {m}, the dependable engine of its court.', 'Its {c} light has shone unchanged through every survey record.', 'Surface granulation churns visibly, and flare seasons come like clockwork.'],
  'white-dwarf': ['A stellar cinder no larger than a world, cooling through the ages.', 'Its fierce surface belies a dead core of crystallizing carbon.', 'Planets here huddle close to catch the last of the warmth.'],
  'neutron-star': ['A city-sized remnant spinning impossibly fast, sweeping beams across the dark.', 'Its magnetic field sculpts the whole system, and compasses are ornaments here.', 'Accretion flickers at the poles where stray gas spirals down.'],
  'black-hole': ['A silent mass that bends the sky into rings, felt but never seen.', 'The accretion flow burns hotter than most stars while the center stays perfectly dark.', 'Clocks run slow near it, and probes return older than they should.'],
  'brown-dwarf': ['A failed star glowing dull magenta, more ember than sun.', 'It radiates leftover formation heat, cooling a fraction each century.', 'Its planets know only twilight, lit faintly from above.'],
  supergiant: ['A bloated giant whose photosphere could swallow the inner orbits whole.', 'It sheds mass in great slow gusts that feed the local nebula.', 'Every scope agrees it will not survive the next million years.'],
  hypergiant: ['One of the most luminous things in the sector, violent and brief.', 'Eruptions strip its outer layers in sheets visible across the arm.', 'Navigators give it a wide berth and use it as a bearing instead.'],
};

const PLANET_DESC = {
  rocky: ['Cracked highlands sprawl beneath a thin sky, every crater a kept record.', 'Dust devils wander the basins, and the night side glitters with ice.', 'Mining cuts stripe the equator where the crust proved thinnest.'],
  oceanic: ['A world-spanning sea hides all but a scatter of basalt teeth.', 'Storms the size of continents roll unbroken around the equator.', 'Bioluminescent tides mark the shallows where the water runs warm.'],
  'gas-giant': ['Banded clouds race around a deep crushing interior of metallic hydrogen.', 'Storm ovals larger than worlds spin for centuries without fading.', 'Its ring shepherds keep the lanes clear and the rumors plentiful.'],
  'ice-giant': ['Methane haze wraps a slushy mantle, cold and blue and utterly calm.', 'Diamond rain is theorized below, though no probe has returned to confirm.', 'Faint rings tilt at an angle that bothers the mathematicians.'],
  desert: ['Dune seas bury everything but the oldest basalt spires.', 'The wind never stops, and the sand sings at dusk through the canyons.', 'Water exists only as deep brine the drills have yet to reach.'],
  volcanic: ['Lava lakes breathe through a fractured crust, resurfacing yearly.', 'Sulfur frost rims the high ground between the glowing rifts.', 'The air itself is a hazard the suits filter with complaint.'],
  frozen: ['Nitrogen glaciers creep under a sky the color of old bone.', 'Geysers of sublimating ice erupt along the terminator line.', 'Subsurface warmth is rumored, and twice confirmed, and never shared.'],
  terrestrial: ['Temperate bands of green and gold suggest a biosphere in full swing.', 'Rain follows the mountain ranges, and rivers braid the lowlands.', 'Settlement charters queue for landing windows every season.'],
};

const MOON_DESC = [
  'A battered companion keeping patient orbit through the ages.',
  'Tidal stress warms its interior, and frost cracks map the strain.',
  'Its surface records every era of bombardment the system ever knew.',
  'Shepherd resonances with the rings betray a denser core than expected.',
  'Outgassing vents frost the trailing face a little more each orbit.',
];
const BELT_DESC = [
  'Countless fragments grind slowly against each other in a broad torus.',
  'Collisional dust hazes the lane, and larger bodies keep eccentric courts.',
  'Old mining claims dot the denser knots, most of them long expired.',
];
const AST_DESC = [
  'A tumbling rock with a scarred face and a patient spin.',
  'Its regolith hides metal concentrations the assays prize.',
  'Outgassing cracks suggest ice beneath the dust mantle.',
];
const COMET_DESC = [
  'A dirty snowball falling sunward on its long appointed round.',
  'Each passage sheds glittering debris the scopes track for seasons.',
  'Its tail leans away from the star like a banner in a gale.',
];
const DWARF_DESC = [
  'A small cold world holding its round shape against the dark.',
  'Frost plains stretch unbroken to a horizon that curves too soon.',
  'Its thin story is written entirely in impact craters.',
];

const STAR_HOOK = [
  'Its wind shapes every orbit in the system, and the weather follows it.',
  'Ephemeris updates track its slow variability across the decades.',
  'Shielding ratings for the inner worlds are set by its worst recorded outburst.',
  'Its light curve is a calibration standard for the whole sector.',
  'Long-baseline scopes watch it for the cycle that precedes its next active phase.',
  'Every chart in the arm uses it as a bearing star, willing or not.',
];
const SYS_TAGS = ['surveyed', 'remote', 'quiet', 'bright', 'old', 'young', 'dusty', 'stable', 'eccentric', 'borderline'];
const MOOD = ['silent', 'patient', 'restless', 'cold', 'bright', 'hollow', 'deep', 'far', 'still', 'wan'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadTaxonomy() {
  return JSON.parse(readFileSync(join(REPO_ROOT, 'data', 'taxonomy.json'), 'utf8'));
}

function loadGalaxy(galaxyId) {
  const dirs = readdirSync(join(REPO_ROOT, 'content'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const dir of dirs) {
    const path = join(REPO_ROOT, 'content', dir, 'galaxy.json');
    if (!existsSync(path)) continue;
    const galaxy = JSON.parse(readFileSync(path, 'utf8'));
    if (!galaxyId || galaxy.id === galaxyId) return { galaxy, dir };
  }
  throw new Error(`galaxy ${galaxyId ?? '(any)'} not found under content/`);
}

function desc3(rnd, head, mid, hook, vars = {}) {
  const fill = (s) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
  const text = `${fill(pick(rnd, head))} ${fill(pick(rnd, mid))} ${fill(pick(rnd, hook))}`;
  if (text.length < 80 || text.length > 2000) throw new Error(`description out of bounds (${text.length})`);
  return text;
}

function tags(rnd, ...pools) {
  const out = new Set();
  for (const pool of pools) if (pool.length > 0 && rnd() < 0.9) out.add(pick(rnd, pool));
  while (out.size < 2) out.add(pick(rnd, MOOD));
  return [...out].slice(0, 4);
}

function uniqName(rnd, used, gen) {
  for (let i = 0; i < 200; i++) {
    const name = gen();
    if (!used.has(name) && name.length >= 3 && name.length <= 60) {
      used.add(name);
      return name;
    }
  }
  throw new Error('name space exhausted');
}

// ---------------------------------------------------------------------------
// Builders (all stats sampled inside taxonomy ranges, ids position-derived)
// ---------------------------------------------------------------------------

function buildStar(rnd, tax, sysId, index, used) {
  const starTypes = ['main-sequence', ...tax.starTypes.map((t) => t.type)];
  const type = weighted(rnd, [
    ['main-sequence', 0.62], ['white-dwarf', 0.1], ['brown-dwarf', 0.1],
    ['neutron-star', 0.07], ['black-hole', 0.05], ['supergiant', 0.04], ['hypergiant', 0.02],
  ]);
  if (!starTypes.includes(type)) throw new Error(`unknown star type ${type}`);
  const id = deriveId('star', sysId, index);
  const name = uniqName(rnd, used, () => `${pick(rnd, STAR_A)} ${pick(rnd, STAR_B)}`);
  const base = { id, name, tags: tags(rnd, [type]) };

  if (type === 'main-sequence') {
    const classes = tax.starClasses;
    let acc = 0;
    const roll = rnd();
    let cls = classes[classes.length - 1];
    for (const c of classes) {
      acc += c.fraction;
      if (roll <= acc) {
        cls = c;
        break;
      }
    }
    const star = {
      ...base, type, class: cls.class,
      temperatureK: Math.round(inRange(rnd, cls.temperatureK)),
      massSol: roundSig(inRange(rnd, cls.massSol)),
      radiusSol: roundSig(inRange(rnd, cls.radiusSol)),
      luminositySol: roundSig(inRange(rnd, cls.luminositySol)),
    };
    star.description = desc3(rnd, [`A ${cls.class}-class star burning ${cls.color}, the dependable engine of its court.`], STAR_DESC['main-sequence'].slice(1), STAR_HOOK, {});
    return star;
  }

  const profile = tax.starTypes.find((t) => t.type === type);
  // Core stats must satisfy BOTH the base type profile and the subtype
  // profile (validation checks both). Sample from their intersection.
  // NOTE: 'microquasar' is excluded for neutron stars — its mass range
  // [3,15] cannot intersect the base neutron-star range [1.1,2.5].
  const intersectCore = (sub) => {
    const cut = (field) => {
      const r = { min: Math.max(profile[field].min, sub[field].min), max: Math.min(profile[field].max, sub[field].max) };
      if (r.min > r.max) throw new Error(`empty ${field} intersection for ${type}/${sub.subtype}`);
      return r;
    };
    return {
      temperatureK: Math.round(inRange(rnd, cut('temperatureK'))),
      massSol: roundSig(inRange(rnd, cut('massSol'))),
      radiusSol: roundSig(inRange(rnd, cut('radiusSol'))),
      luminositySol: roundSig(inRange(rnd, cut('luminositySol'))),
    };
  };
  const baseCore = () => ({
    temperatureK: type === 'black-hole' ? 0 : Math.round(inRange(rnd, profile.temperatureK)),
    massSol: roundSig(inRange(rnd, profile.massSol)),
    radiusSol: type === 'black-hole' ? 0 : roundSig(inRange(rnd, profile.radiusSol)),
    luminositySol: type === 'black-hole' ? 0 : roundSig(inRange(rnd, profile.luminositySol)),
  });
  const core = baseCore();
  const head = type === 'neutron-star' || type === 'black-hole'
    ? [`A stellar remnant of ${core.massSol} solar masses, {kind} and unquiet.`]
    : [`A ${type} of ${core.massSol} solar masses, {kind} against the dark.`];
  const descVars = { kind: pick(rnd, profile.traits) };

  if (type === 'neutron-star') {
    const useXrb = rnd() < 0.25;
    if (useXrb) {
      const sub = pick(rnd, tax.xrbSubtypes.filter((s) => s.subtype !== 'microquasar'));
      const star = {
        ...base, type, subtype: sub.subtype, ...intersectCore(sub),
        xrayLuminosityErgs: roundSig(inRange(rnd, sub.xrayLuminosityErgs)),
        accretionRateEddington: roundSig(inRange(rnd, sub.accretionRateEddington)),
        diskTemperatureK: Math.round(inRange(rnd, sub.diskTemperatureK)),
        hasJets: sub.hasJets,
        jetPowerErgs: roundSig(inRange(rnd, sub.jetPowerErgs)),
      };
      star.description = desc3(rnd, head, STAR_DESC[type].slice(0, 2), STAR_HOOK, descVars);
      return star;
    }
    const sub = weighted(rnd, [['normal', 0.35], ['radio-pulsar', 0.3], ['magnetar', 0.15], ['x-ray-pulsar', 0.2]]);
    const prof = tax.neutronStarSubtypes.find((t) => t.subtype === sub);
    const star = {
      ...base, type, subtype: sub, ...intersectCore(prof),
      periodSeconds: roundSig(inRange(rnd, prof.periodSeconds)),
      periodDerivative: roundSig(inRange(rnd, prof.periodDerivative)),
      magneticFieldGauss: roundSig(inRange(rnd, prof.magneticFieldGauss)),
    };
    star.description = desc3(rnd, head, STAR_DESC[type].slice(0, 2), STAR_HOOK, descVars);
    return star;
  }

  if (type === 'black-hole') {
    const subtype = rnd() < 0.3 ? 'xrb' : 'normal';
    const prof = tax.blackHoleSubtypes.find((t) => t.subtype === subtype);
    const star = { ...base, type, subtype, ...intersectCore(prof) };
    if (subtype === 'xrb' || rnd() < 0.3) {
      star.xrayLuminosityErgs = roundSig(inRange(rnd, prof.xrayLuminosityErgs));
      star.accretionRateEddington = roundSig(inRange(rnd, prof.accretionRateEddington));
      star.diskTemperatureK = Math.round(inRange(rnd, prof.diskTemperatureK));
      star.hasJets = prof.hasJets;
      star.jetPowerErgs = roundSig(inRange(rnd, prof.jetPowerErgs));
    }
    star.description = desc3(rnd, head, STAR_DESC[type].slice(0, 2), STAR_HOOK, descVars);
    return star;
  }

  const star = { ...base, type, ...core };
  star.description = desc3(rnd, head, STAR_DESC[type].slice(0, 2), STAR_HOOK, descVars);
  return star;
}

function buildPlanet(rnd, tax, sysId, orbit, distAu, used, sysTags) {
  const profile = pick(rnd, tax.planetTypes);
  const id = deriveId('planet', sysId, orbit);
  const lifeLevels = tax.lifeLevels.map((l) => l.level);
  const ceiling = lifeLevels.indexOf(profile.lifeCeiling);
  const life = weighted(rnd, lifeLevels.slice(0, ceiling + 1).map((l, i) => [l, [0.55, 0.25, 0.12, 0.06, 0.02][i] ?? 0.01]));
  const name = uniqName(rnd, used, () =>
    rnd() < 0.12 ? `The ${pick(rnd, WORLD_A)} ${pick(rnd, WORLD_B)}` : `${pick(rnd, WORLD_A)}${pick(rnd, WORLD_B)}`);
  const rings = profile.ringsLikelihood === 'common' ? rnd() < 0.7 : profile.ringsLikelihood === 'possible' ? rnd() < 0.12 : false;
  const planet = {
    name,
    description: desc3(rnd, PLANET_DESC[profile.type].slice(0, 1), PLANET_DESC[profile.type].slice(1), SYS_HOOK, {}),
    tags: tags(rnd, [profile.type], profile.traits.map((t) => t.split(' ')[0]), sysTags),
    id, orbitIndex: orbit, orbitalDistanceAu: roundSig(distAu),
    type: profile.type,
    radiusEarth: roundSig(inRange(rnd, profile.radiusEarth)),
    gravityG: roundSig(inRange(rnd, profile.gravityG)),
    meanTempC: Math.round(inRange(rnd, profile.meanTempC)),
    atmosphereDensity: roundSig(inRange(rnd, profile.atmosphereDensity)),
    hasRings: rings, life, moons: [],
  };
  const moonCount = Math.floor(uniform(rnd, 0, 4));
  for (let m = 1; m <= moonCount; m++) {
    planet.moons.push(buildMoon(rnd, tax, sysId, orbit, m, id, used));
  }
  return planet;
}

function buildMoon(rnd, tax, sysId, planetOrbit, moonOrbit, planetId, used) {
  const profile = pick(rnd, tax.moonTypes);
  const name = uniqName(rnd, used, () => `${pick(rnd, WORLD_A)} ${pick(rnd, ROCK_A)} ${pick(rnd, ['I', 'II', 'III', 'IV', 'V'])}`);
  return {
    name,
    description: desc3(rnd, MOON_DESC.slice(0, 1), MOON_DESC.slice(1, 3), MOON_DESC.slice(3), {}),
    tags: tags(rnd, [profile.type]),
    id: deriveId('moon', sysId, planetOrbit, moonOrbit),
    planetId, orbitIndex: moonOrbit,
    orbitalDistanceKm: Math.round(inRange(rnd, profile.orbitalDistanceKm)),
    type: profile.type,
    radiusKm: Math.round(inRange(rnd, profile.radiusKm)),
    gravityG: roundSig(inRange(rnd, profile.gravityG)),
    hasAtmosphere: typeof profile.hasAtmosphere === 'boolean' ? profile.hasAtmosphere : rnd() < 0.1,
  };
}

function buildDwarf(rnd, sysId, orbit, distAu, used) {
  const type = pick(rnd, ['icy', 'rocky', 'hybrid']);
  return {
    name: uniqName(rnd, used, () => `${pick(rnd, WORLD_A)} ${pick(rnd, ['Minor', 'Lesser', 'Outer', 'Nether'])} ${Math.floor(uniform(rnd, 2, 99))}`),
    description: desc3(rnd, DWARF_DESC.slice(0, 1), DWARF_DESC.slice(1, 2), DWARF_DESC.slice(2), {}),
    tags: tags(rnd, [type, 'dwarf']),
    id: deriveId('dwarfPlanet', sysId, orbit),
    orbitIndex: orbit, orbitalDistanceAu: roundSig(distAu), type,
    radiusKm: Math.round(uniform(rnd, 200, 1200)),
    gravityG: roundSig(uniform(rnd, 0.01, 0.08)),
    meanTempC: Math.round(uniform(rnd, -230, -100)),
    hasAtmosphere: rnd() < 0.15,
    moonCount: Math.floor(uniform(rnd, 0, 3)),
  };
}

function buildAsteroid(rnd, sysId, orbit, distAu, used) {
  const radiusKm = roundSig(uniform(rnd, 0.5, 260));
  return {
    name: uniqName(rnd, used, () => `${pick(rnd, ROCK_A)} ${Math.floor(uniform(rnd, 10, 999))}`),
    description: desc3(rnd, AST_DESC.slice(0, 1), AST_DESC.slice(1, 2), AST_DESC.slice(2), {}),
    tags: tags(rnd, ['rocky', 'belt-debris']),
    id: deriveId('asteroid', sysId, orbit),
    orbitIndex: orbit, orbitalDistanceAu: roundSig(distAu),
    type: pick(rnd, ['rocky', 'metallic', 'icy', 'carbonaceous']),
    radiusKm,
    massKg: roundSig((4 / 3) * Math.PI * Math.pow(radiusKm * 1000, 3) * 2200),
    albedo: roundSig(uniform(rnd, 0.03, 0.6)),
    rotationPeriodHours: roundSig(uniform(rnd, 2, 100)),
  };
}

function buildBelt(rnd, sysId, orbit, used, asteroidIds) {
  const zone = pick(rnd, [
    { type: 'main', inner: 2, outer: 4 },
    { type: 'kuiper', inner: 30, outer: 50 },
    { type: 'scattered', inner: 50, outer: 100 },
    { type: 'trojan', inner: 4.5, outer: 6 },
  ]);
  return {
    name: uniqName(rnd, used, () => `${pick(rnd, WORLD_A)} ${zone.type === 'trojan' ? 'Trojans' : pick(rnd, ['Belt', 'Band', 'Swarm'])}`),
    description: desc3(rnd, BELT_DESC.slice(0, 1), BELT_DESC.slice(1, 2), BELT_DESC.slice(2), {}),
    tags: tags(rnd, [zone.type, 'debris']),
    id: deriveId('belt', sysId, orbit),
    orbitIndex: orbit,
    innerEdgeAu: zone.inner, outerEdgeAu: zone.outer,
    type: zone.type,
    totalMassEarth: roundSig(logUniform(rnd, 0.0001, 0.05)),
    ...(asteroidIds.length > 0 && rnd() < 0.5 ? { largestBodyId: pick(rnd, asteroidIds) } : {}),
    composition: [...new Set([pick(rnd, ['rocky', 'metallic', 'icy', 'carbonaceous']), pick(rnd, ['rocky', 'icy', 'carbonaceous'])])],
  };
}

function buildComet(rnd, sysId, orbit, used) {
  const type = pick(rnd, ['short-period', 'long-period', 'sungrazer', 'interstellar']);
  const band = {
    'short-period': { a: [5, 40], e: [0.2, 0.8] },
    'long-period': { a: [50, 500], e: [0.9, 0.99] },
    sungrazer: { a: [20, 200], e: [0.95, 0.999] },
    interstellar: { a: [100, 1000], e: [0.9, 0.99] },
  }[type];
  const a = uniform(rnd, ...band.a);
  const e = uniform(rnd, ...band.e);
  const peri = a * (1 - e);
  const aph = a * (1 + e);
  return {
    name: uniqName(rnd, used, () => {
      const base = `${pick(rnd, COMET_A)} ${pick(rnd, COMET_B)}`;
      return rnd() < 0.3 ? `${base} ${Math.floor(uniform(rnd, 2, 99))}` : base;
    }),
    description: desc3(rnd, COMET_DESC.slice(0, 1), COMET_DESC.slice(1, 2), COMET_DESC.slice(2), {}),
    tags: tags(rnd, [type, 'visitor']),
    id: deriveId('comet', sysId, orbit),
    orbitIndex: orbit,
    semiMajorAxisAu: roundSig(a),
    eccentricity: roundSig(e),
    inclinationDeg: roundSig(uniform(rnd, 0, 180)),
    perihelionAu: roundSig(peri),
    aphelionAu: roundSig(aph),
    orbitalPeriodYears: roundSig(Math.pow(a, 1.5)),
    type,
    nucleusRadiusKm: roundSig(uniform(rnd, 1, 20)),
    isActive: peri < 3 ? true : rnd() < 0.3,
    dustProductionRate: roundSig(uniform(rnd, 0, 500)),
    gasProductionRate: roundSig(uniform(rnd, 0, 200)),
  };
}

function buildSystem(rnd, tax, galaxy, coords, used) {
  const sysId = deriveId('starSystem', galaxy.id, coords.x, coords.y, coords.z);
  const starCount = weighted(rnd, [[1, 0.7], [2, 0.25], [3, 0.05]]);
  const stars = [];
  for (let i = 1; i <= starCount; i++) stars.push(buildStar(rnd, tax, sysId, i, used));
  const starOrbits = starCount === 1
    ? [{ index: 1, starIds: [stars[0].id] }]
    : [{ index: 1, starIds: stars.map((s) => s.id).slice(0, 2) }, ...(starCount === 3 ? [{ index: 2, starIds: [stars[2].id] }] : [])];
  const compact = stars[0].type === 'black-hole' || stars[0].type === 'neutron-star';
  const planetCount = compact ? Math.floor(uniform(rnd, 0, 4)) : Math.floor(uniform(rnd, 0, 9));
  const sysTags = tags(rnd, SYS_TAGS, stars[0].type === 'main-sequence' ? [stars[0].class] : [stars[0].type]);

  let orbit = 0;
  let dist = uniform(rnd, 0.3, 0.9);
  const step = () => {
    orbit += 1;
    dist *= uniform(rnd, 1.35, 1.9);
    return { orbit, dist };
  };
  const planets = [];
  for (let i = 0; i < planetCount; i++) {
    const s = step();
    planets.push(buildPlanet(rnd, tax, sysId, s.orbit, s.dist, used, sysTags));
  }
  const dwarfCount = Math.floor(uniform(rnd, 0, 4));
  const dwarfPlanets = [];
  for (let i = 0; i < dwarfCount; i++) {
    const s = step();
    dwarfPlanets.push(buildDwarf(rnd, sysId, s.orbit, Math.max(s.dist, 12 + i * 8), used));
  }
  const asteroidCount = Math.floor(uniform(rnd, 0, 11));
  const asteroids = [];
  for (let i = 0; i < asteroidCount; i++) {
    const s = step();
    asteroids.push(buildAsteroid(rnd, sysId, s.orbit, s.dist, used));
  }
  const belts = [];
  const beltCount = Math.floor(uniform(rnd, 0, 3));
  for (let i = 0; i < beltCount; i++) belts.push(buildBelt(rnd, sysId, step().orbit, used, asteroids.map((a) => a.id)));
  const comets = [];
  const cometCount = Math.floor(uniform(rnd, 0, 6));
  for (let i = 0; i < cometCount; i++) comets.push(buildComet(rnd, sysId, step().orbit, used));

  const name = uniqName(rnd, used, () => `${pick(rnd, SYS_A)}${pick(rnd, SYS_B)}`);
  const glow = stars[0].type === 'main-sequence' ? `${stars[0].class}-class` : stars[0].type;
  const r = Math.hypot(coords.x, coords.y, coords.z);
  const where = r < 4000 ? 'near the core' : r < 16000 ? 'along the inner arm' : r < 30000 ? 'out on the far arm' : 'in the sparse halo';
  const where2 = r < 4000 ? 'deep-core' : r < 16000 ? 'inner-arm' : r < 30000 ? 'outer-arm' : 'halo';
  const mapping = {};
  for (const p of planets) mapping[p.id] = p.name;
  return {
    name,
    description: desc3(rnd, SYS_HEAD, SYS_MID, SYS_HOOK, { sys: name, glow, where, where2 }),
    tags: sysTags,
    id: sysId, galaxyId: galaxy.id,
    coordinates: { x: Math.round(coords.x), y: Math.round(coords.y), z: Math.round(coords.z) },
    ageBillionYears: roundSig(uniform(rnd, 0.5, 13)),
    stars, starOrbits, planets, dwarfPlanets, asteroids, belts, comets,
    planetNameMapping: mapping,
  };
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

function quadrantFor(r) {
  if (r < 4000) return 'core';
  if (r < 16000) return 'inner-arm';
  if (r < 30000) return 'outer-arm';
  return 'halo';
}

function scatter(rnd, radius, halo) {
  if (halo) {
    const r = uniform(rnd, 30000, 40000);
    const theta = uniform(rnd, 0, Math.PI * 2);
    const phi = Math.acos(uniform(rnd, -1, 1));
    return { x: r * Math.sin(phi) * Math.cos(theta), y: r * Math.cos(phi) * 0.6, z: r * Math.sin(phi) * Math.sin(theta) };
  }
  const r = radius;
  const theta = uniform(rnd, 0, Math.PI * 2);
  return { x: r * Math.cos(theta), y: uniform(rnd, -700, 700), z: r * Math.sin(theta) };
}

function main() {
  const args = process.argv.slice(2);
  const get = (flag, def) => {
    const i = args.indexOf(flag);
    return i >= 0 && args[i + 1] ? args[i + 1] : def;
  };
  if (args.includes('--help')) {
    console.log(`Usage: node scripts/seed-systems.mjs [--seed <string>] [--galaxy <galaxyId>] [--dry-run] [--prune]\n\nDeterministic bulk seeder implementing the /star-system skill contract.\nWrites into content/<galaxy>/systems/ and merges quadrant mappings.\nValidate afterwards with: npm run validate`);
    process.exit(0);
  }
  const seed = get('--seed', 'vireth-demo');
  const galaxyId = get('--galaxy', 'gal-1dcef06b');
  const dryRun = args.includes('--dry-run');
  const rnd = mulberry32(hashSeed(seed));
  const tax = loadTaxonomy();
  const { galaxy, dir } = loadGalaxy(galaxyId);
  const galDir = join(REPO_ROOT, 'content', dir);
  const used = new Set();

  const plan = [
    ...Array.from({ length: 2 }, () => ({ r: uniform(rnd, 500, 3800), halo: false })),
    ...Array.from({ length: 9 }, () => ({ r: uniform(rnd, 4200, 15500), halo: false })),
    ...Array.from({ length: 10 }, () => ({ r: uniform(rnd, 16500, 29500), halo: false })),
    ...Array.from({ length: 3 }, () => ({ r: 0, halo: true })),
  ];
  const systems = plan.map((p) => buildSystem(rnd, tax, galaxy, scatter(rnd, p.r, p.halo), used));

  if (dryRun) {
    for (const s of systems) {
      console.log(`${s.id}  ${s.name}  stars=${s.stars.map((t) => t.type).join('+')} planets=${s.planets.length} dwarfs=${s.dwarfPlanets.length} ast=${s.asteroids.length} belts=${s.belts.length} comets=${s.comets.length}`);
    }
    console.log(`\n${systems.length} systems (dry run, nothing written)`);
    return;
  }

  mkdirSync(join(galDir, 'systems'), { recursive: true });
  const produced = new Set(systems.map((s) => s.id));
  if (args.includes('--prune')) {
    for (const file of readdirSync(join(galDir, 'systems'))) {
      if (file.endsWith('.json') && !produced.has(file.slice(0, -5))) {
        rmSync(join(galDir, 'systems', file));
        console.log(`pruned stale ${file}`);
      }
    }
  }
  for (const s of systems) {
    writeFileSync(join(galDir, 'systems', `${s.id}.json`), `${JSON.stringify(s, null, 2)}\n`, 'utf8');
  }
  // Merge quadrant mappings (existing entries kept).
  const quadrants = { core: {}, 'inner-arm': {}, 'outer-arm': {}, halo: {} };
  for (const [name, map] of Object.entries(quadrants)) {
    const path = join(galDir, name, 'systems.json');
    mkdirSync(join(galDir, name), { recursive: true });
    if (existsSync(path)) Object.assign(map, JSON.parse(readFileSync(path, 'utf8')));
  }
  // Adopt the two pre-existing orphan systems into their radial quadrant.
  const prune = args.includes('--prune');
  for (const file of readdirSync(join(galDir, 'systems'))) {
    if (!file.endsWith('.json')) continue;
    const s = JSON.parse(readFileSync(join(galDir, 'systems', file), 'utf8'));
    const q = quadrantFor(Math.hypot(s.coordinates.x, s.coordinates.y, s.coordinates.z));
    if (!Object.values(quadrants).some((m) => m[s.id])) quadrants[q][s.id] = s.name;
  }
  if (prune) {
    const onDisk = new Set(readdirSync(join(galDir, 'systems')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)));
    for (const map of Object.values(quadrants)) {
      for (const id of Object.keys(map)) if (!onDisk.has(id)) delete map[id];
    }
  }
  for (const [name, map] of Object.entries(quadrants)) {
    writeFileSync(join(galDir, name, 'systems.json'), `${JSON.stringify(map, null, 2)}\n`, 'utf8');
  }

  const counts = { planets: 0, moons: 0, dwarfs: 0, asteroids: 0, belts: 0, comets: 0 };
  for (const s of systems) {
    counts.planets += s.planets.length;
    counts.moons += s.planets.reduce((n, p) => n + p.moons.length, 0);
    counts.dwarfs += s.dwarfPlanets.length;
    counts.asteroids += s.asteroids.length;
    counts.belts += s.belts.length;
    counts.comets += s.comets.length;
  }
  console.log(`wrote ${systems.length} systems into ${galDir}/systems/`);
  console.log(`bodies: ${counts.planets} planets (${counts.moons} moons), ${counts.dwarfs} dwarf planets, ${counts.asteroids} asteroids, ${counts.belts} belts, ${counts.comets} comets`);
  console.log('next: npm run validate');
}

main();
