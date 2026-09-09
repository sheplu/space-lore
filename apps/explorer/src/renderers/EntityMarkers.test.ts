// Tests for entity marker collection (pure data: no WebGL, no canvas).
import { describe, it, expect } from 'vitest';
import { collectEntityMarkers } from '@/renderers/GalaxyRendererSimple';
import type { StarSystem } from '@/types/galaxy';

function makeSystem(id: string): StarSystem {
  return {
    id,
    name: id,
    description: 'test system',
    tags: [],
    galaxyId: 'gal-test',
    coordinates: { x: 1000, y: 0, z: 0 },
    ageBillionYears: 5,
    stars: [],
    starOrbits: [],
    planets: [{ id: 'plnt-1', name: 'P', description: '', tags: [], orbitIndex: 1, orbitalDistanceAu: 1, type: 'rocky', radiusEarth: 1, gravityG: 1, meanTempC: 0, atmosphereDensity: 0, hasRings: false, life: 'none', moons: [] }],
    dwarfPlanets: [],
    asteroids: [],
    belts: [],
    comets: [],
    planetNameMapping: {},
  } as unknown as StarSystem;
}

describe('collectEntityMarkers', () => {
  it('marks nebulae, clusters, snrs and bound anomalies', () => {
    const items = collectEntityMarkers({
      systems: new Map([['sys-1', makeSystem('sys-1')]]),
      nebulae: [{ id: 'neb-1', name: 'N', description: '', tags: [], galaxyId: 'gal-test', type: 'emission', coordinates: { x: 1, y: 0, z: 0 }, radiusLy: 5, temperatureK: 1, densityCm3: 1, massSol: 1, ionizationLevel: 0.5, magneticFieldMicroG: 1, composition: [], containedSystemIds: [], starFormationActivity: 'moderate', colorPalette: [], observedEffects: [], dangerLevel: 'low' }],
      clusters: [{ id: 'clu-1', name: 'C', description: '', tags: [], galaxyId: 'gal-test', type: 'open', coordinates: { x: 2, y: 0, z: 0 }, ageGyr: 0.1, massSol: 1, coreRadiusLy: 1, tidalRadiusLy: 5, metallicityFeH: 0, concentration: 1, velocityDispersionKms: 1, stellarDensityCore: 1, stellarDensityHalfMass: 1, memberSystemIds: [], traits: [], observedEffects: [] }],
      snrs: [{ id: 'snr-1', name: 'S', description: '', tags: [], galaxyId: 'gal-test', type: 'old', coordinates: { x: 3, y: 0, z: 0 }, ageYr: 50000, radiusLy: 80, expansionVelocityKms: 1, temperatureK: 1, luminosityXrayErgs: 1, luminosityRadioErgs: 1, magneticFieldMicroG: 1, densityCm3: 1, sweptUpMassSol: 1, ejectaMassSol: 1, composition: [], shockStage: 'radiative', hasPulsar: false, hasPwn: false, traits: [], observedEffects: [], dangerLevel: 'low' }],
      anomalies: [
        { id: 'anom-1', name: 'A1', description: '', tags: [], category: 'spatial', dangerLevel: 'low', location: { scope: 'galaxy', coordinates: { x: 4, y: 0, z: 0 } }, observedEffects: [], containmentPossible: true },
        { id: 'anom-2', name: 'A2', description: '', tags: [], category: 'temporal', dangerLevel: 'high', location: { scope: 'system', systemId: 'sys-1' }, observedEffects: [], containmentPossible: false },
        { id: 'anom-3', name: 'A3', description: '', tags: [], category: 'energy', dangerLevel: 'moderate', location: { scope: 'planet', planetId: 'plnt-1' }, observedEffects: [], containmentPossible: true },
        { id: 'anom-4', name: 'A4', description: '', tags: [], category: 'spatial', dangerLevel: 'low', location: { scope: 'system', systemId: 'sys-missing' }, observedEffects: [], containmentPossible: true },
      ],
    });
    // 1 nebula + 1 cluster + 1 snr + 3 bound anomalies (dangling one skipped).
    expect(items).toHaveLength(6);
    expect(items.map((i) => i.kind)).toEqual(['nebula', 'cluster', 'snr', 'anomaly', 'anomaly', 'anomaly']);
    // Bound anomalies resolve through the parent system position.
    expect(items.filter((i) => i.kind === 'anomaly').map((i) => i.x)).toEqual([4, 1000, 1000]);
  });

  it('returns no markers when there are no entities', () => {
    const items = collectEntityMarkers({
      systems: new Map(),
      nebulae: [],
      clusters: [],
      snrs: [],
      anomalies: [],
    });
    expect(items).toEqual([]);
  });
});
