// Unit tests for the client-side search index (pure data, no DOM).
import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { buildSearchIndex, searchEntries, type SearchEntry } from './searchIndex';
import type { StarSystem } from '@/types/galaxy';

function systemFixture(
  id: string,
  name: string,
  tags: string[],
  planets: Array<{ id: string; name: string; type: string; tags?: string[] }>,
): StarSystem {
  return {
    id,
    name,
    description: 'fixture system',
    tags,
    galaxyId: 'gal-00000000',
    coordinates: { x: 0, y: 0, z: 0 },
    ageBillionYears: 5,
    stars: [],
    starOrbits: [],
    planets: planets.map((p, i) => ({
      id: p.id,
      name: p.name,
      description: 'fixture planet',
      tags: p.tags ?? [],
      orbitIndex: i + 1,
      orbitalDistanceAu: i + 1,
      type: p.type,
      radiusEarth: 1,
      gravityG: 1,
      meanTempC: 10,
      atmosphereDensity: 1,
      hasRings: false,
      life: 'none',
      moons: [],
    })),
    dwarfPlanets: [],
    asteroids: [],
    belts: [],
    comets: [],
    planetNameMapping: {},
  } as unknown as StarSystem;
}

const SYSTEMS = [
  systemFixture('sys-aaaaaaaa', 'Halcyon Reach', ['surveyed'], [
    { id: 'plnt-aaaa0001', name: 'Kilnmark', type: 'rocky' },
    { id: 'plnt-aaaa0002', name: 'Meridian Deep', type: 'oceanic', tags: ['water'] },
  ]),
  systemFixture('sys-bbbbbbbb', 'Emberwatch', ['sealed'], [
    { id: 'plnt-bbbb0001', name: 'Rustfall', type: 'desert' },
  ]),
];

function names(results: SearchEntry[]): string[] {
  return results.map((r) => r.name);
}

describe('buildSearchIndex', () => {
  it('emits one entry per system plus one per planet', () => {
    const entries = buildSearchIndex({ systems: SYSTEMS });
    assert.equal(entries.length, 5);
    assert.deepEqual(entries.map((e) => e.kind), ['system', 'planet', 'planet', 'system', 'planet']);
  });

  it('links planets to their parent system', () => {
    const entries = buildSearchIndex({ systems: SYSTEMS });
    const rustfall = entries.find((e) => e.name === 'Rustfall');
    assert.equal(rustfall?.systemId, 'sys-bbbbbbbb');
    assert.equal(rustfall?.planetId, 'plnt-bbbb0001');
  });

  it('indexes nebulae, clusters, snrs and anomalies with fly-to targets', () => {
    const entries = buildSearchIndex({
      systems: SYSTEMS,
      nebulae: [
        {
          id: 'neb-1', name: 'Veil Shroud', description: '', tags: ['dusty'], galaxyId: 'gal-0',
          type: 'emission', coordinates: { x: 100, y: 0, z: 0 }, radiusLy: 25,
          temperatureK: 1, densityCm3: 1, massSol: 1, ionizationLevel: 0.5,
          magneticFieldMicroG: 1, composition: [], containedSystemIds: [],
          starFormationActivity: 'moderate', colorPalette: [], observedEffects: [], dangerLevel: 'moderate',
        },
      ],
      clusters: [
        {
          id: 'clu-1', name: 'Cinder Swarm', description: '', tags: [], galaxyId: 'gal-0',
          type: 'globular', coordinates: { x: 0, y: 200, z: 0 }, ageGyr: 12, massSol: 200000,
          coreRadiusLy: 3, tidalRadiusLy: 80, metallicityFeH: -1.5, concentration: 1.5,
          velocityDispersionKms: 10, stellarDensityCore: 1, stellarDensityHalfMass: 1,
          memberSystemIds: [], traits: [], observedEffects: [],
        },
      ],
      snrs: [
        {
          id: 'snr-1', name: 'Ashen Ring', description: '', tags: [], galaxyId: 'gal-0',
          type: 'young', coordinates: { x: 0, y: 0, z: 300 }, ageYr: 500, radiusLy: 3,
          expansionVelocityKms: 1, temperatureK: 1, luminosityXrayErgs: 1, luminosityRadioErgs: 1,
          magneticFieldMicroG: 1, densityCm3: 1, sweptUpMassSol: 1, ejectaMassSol: 1,
          composition: [], shockStage: 'free-expansion', hasPulsar: false, hasPwn: false,
          traits: [], observedEffects: [], dangerLevel: 'high',
        },
      ],
      anomalies: [
        {
          id: 'anom-1', name: 'Slow Door', description: '', tags: [], category: 'temporal',
          dangerLevel: 'extreme', location: { scope: 'galaxy', coordinates: { x: 1, y: 2, z: 3 } },
          observedEffects: [], containmentPossible: false,
        },
        {
          id: 'anom-2', name: 'Ember Knot', description: '', tags: [], category: 'spatial',
          dangerLevel: 'low', location: { scope: 'system', systemId: 'sys-bbbbbbbb' },
          observedEffects: [], containmentPossible: true,
        },
        {
          id: 'anom-3', name: 'Kiln Echo', description: '', tags: [], category: 'energy',
          dangerLevel: 'moderate', location: { scope: 'planet', planetId: 'plnt-aaaa0001' },
          observedEffects: [], containmentPossible: true,
        },
      ],
    });
    const byName = new Map(entries.map((e) => [e.name, e]));
    assert.deepEqual(byName.get('Veil Shroud')?.point, { x: 100, y: 0, z: 0 });
    assert.equal(byName.get('Cinder Swarm')?.detail, 'globular cluster · 200,000 M☉');
    assert.equal(byName.get('Ashen Ring')?.detail, 'young remnant · 500 yr old');
    assert.deepEqual(byName.get('Slow Door')?.point, { x: 1, y: 2, z: 3 });
    // System/planet-bound anomalies resolve through the parent system position.
    assert.deepEqual(byName.get('Ember Knot')?.point, { x: 0, y: 0, z: 0 });
    assert.deepEqual(byName.get('Kiln Echo')?.point, { x: 0, y: 0, z: 0 });
  });

  it('skips anomalies whose parent is not loaded', () => {
    const entries = buildSearchIndex({
      systems: SYSTEMS,
      anomalies: [
        {
          id: 'anom-9', name: 'Lost Rift', description: '', tags: [], category: 'spatial',
          dangerLevel: 'low', location: { scope: 'system', systemId: 'sys-missing' },
          observedEffects: [], containmentPossible: true,
        },
      ],
    });
    assert.equal(entries.find((e) => e.name === 'Lost Rift'), undefined);
  });
});

describe('searchEntries', () => {
  const entries = buildSearchIndex({ systems: SYSTEMS });

  it('ranks name-prefix matches first', () => {
    // Rustfall follows via its detail text ("desert planet · Emberwatch").
    assert.deepEqual(names(searchEntries(entries, 'ember')), ['Emberwatch', 'Rustfall']);
  });

  it('matches case-insensitively and by substring', () => {
    assert.deepEqual(names(searchEntries(entries, 'RUSTFALL')), ['Rustfall']);
    // Planets follow via their parent system name in the detail text.
    assert.deepEqual(names(searchEntries(entries, 'reach')), ['Halcyon Reach', 'Kilnmark', 'Meridian Deep']);
  });

  it('matches planet type via detail text', () => {
    assert.deepEqual(names(searchEntries(entries, 'oceanic')), ['Meridian Deep']);
  });

  it('matches tags via keywords', () => {
    assert.deepEqual(names(searchEntries(entries, 'water')), ['Meridian Deep']);
    assert.deepEqual(names(searchEntries(entries, 'sealed')), ['Emberwatch', 'Rustfall']);
  });

  it('requires every token to match', () => {
    assert.deepEqual(names(searchEntries(entries, 'rust desert')), ['Rustfall']);
    assert.deepEqual(searchEntries(entries, 'rust oceanic'), []);
  });

  it('returns empty for blank queries and unknown text', () => {
    assert.deepEqual(searchEntries(entries, '   '), []);
    assert.deepEqual(searchEntries(entries, 'zzz-no-such-world'), []);
  });

  it('respects the result limit', () => {
    assert.equal(searchEntries(entries, 'a', 2).length, 2);
  });

  it('finds point entities by type, category and danger', () => {
    const mixed = buildSearchIndex({
      systems: SYSTEMS,
      nebulae: [
        {
          id: 'neb-1', name: 'Veil Shroud', description: '', tags: [], galaxyId: 'gal-0',
          type: 'dark', coordinates: { x: 1, y: 0, z: 0 }, radiusLy: 10,
          temperatureK: 1, densityCm3: 1, massSol: 1, ionizationLevel: 0.1,
          magneticFieldMicroG: 1, composition: [], containedSystemIds: [],
          starFormationActivity: 'high', colorPalette: [], observedEffects: [], dangerLevel: 'low',
        },
      ],
      anomalies: [
        {
          id: 'anom-1', name: 'Slow Door', description: '', tags: [], category: 'temporal',
          dangerLevel: 'extreme', location: { scope: 'galaxy', coordinates: { x: 1, y: 2, z: 3 } },
          observedEffects: [], containmentPossible: false,
        },
      ],
    });
    assert.deepEqual(names(searchEntries(mixed, 'dark')), ['Veil Shroud']);
    assert.deepEqual(names(searchEntries(mixed, 'temporal')), ['Slow Door']);
    assert.deepEqual(names(searchEntries(mixed, 'extreme')), ['Slow Door']);
  });
});
