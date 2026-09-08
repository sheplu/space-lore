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
    const entries = buildSearchIndex(SYSTEMS);
    assert.equal(entries.length, 5);
    assert.deepEqual(entries.map((e) => e.kind), ['system', 'planet', 'planet', 'system', 'planet']);
  });

  it('links planets to their parent system', () => {
    const entries = buildSearchIndex(SYSTEMS);
    const rustfall = entries.find((e) => e.name === 'Rustfall');
    assert.equal(rustfall?.systemId, 'sys-bbbbbbbb');
    assert.equal(rustfall?.planetId, 'plnt-bbbb0001');
  });
});

describe('searchEntries', () => {
  const entries = buildSearchIndex(SYSTEMS);

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
});
