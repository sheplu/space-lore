// Headless tests for the quadrant zoom layer: classification fallback,
// centroids, framing distances, and nearest-quadrant travel targeting.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { QuadrantOverlay } from '@/renderers/QuadrantOverlay';
import type { Galaxy, StarSystem } from '@/types/galaxy';

function makeSystem(id: string, x: number, y: number, z: number): StarSystem {
  return {
    id,
    name: id,
    description: 'test system',
    tags: [],
    galaxyId: 'gal-test',
    coordinates: { x, y, z },
    ageBillionYears: 5,
    stars: [],
    starOrbits: [],
    planets: [],
    dwarfPlanets: [],
    asteroids: [],
    belts: [],
    comets: [],
    planetNameMapping: {},
  };
}

const galaxy = {
  id: 'gal-test',
  name: 'Test',
  description: 'test galaxy',
  tags: [],
  type: 'spiral',
  diameterLy: 80000,
  thicknessLy: 1000,
  estimatedStarCount: 100,
} satisfies Galaxy;

describe('QuadrantOverlay', () => {
  it('classifies systems by radial fallback when no mappings exist', () => {
    const scene = new THREE.Scene();
    const overlay = new QuadrantOverlay(scene, {
      galaxy,
      systems: new Map([
        ['sys-core', makeSystem('sys-core', 100, 0, 100)],
        ['sys-inner', makeSystem('sys-inner', 10000, 0, 0)],
        ['sys-outer', makeSystem('sys-outer', 25000, 0, 0)],
        ['sys-halo', makeSystem('sys-halo', 0, 8000, 0)],
      ]),
      quadrantMappings: new Map(),
    });
    overlay.build();

    expect(overlay.classify('sys-core')).toBe('core');
    expect(overlay.classify('sys-inner')).toBe('inner-arm');
    expect(overlay.classify('sys-outer')).toBe('outer-arm');
    expect(overlay.classify('sys-halo')).toBe('halo');
    overlay.dispose();
  });

  it('prefers explicit content mappings over the radial fallback', () => {
    const scene = new THREE.Scene();
    const overlay = new QuadrantOverlay(scene, {
      galaxy,
      systems: new Map([['sys-far', makeSystem('sys-far', 30000, 0, 0)]]),
      quadrantMappings: new Map([['core', { systems: { 'sys-far': 'Core' } }]]),
    });
    overlay.build();

    expect(overlay.classify('sys-far')).toBe('core');
    expect(overlay.systemsIn('core')).toHaveLength(1);
    expect(overlay.systemsIn('outer-arm')).toHaveLength(0);
    overlay.dispose();
  });

  it('targets the nearest quadrant and returns sane framing distances', () => {
    const scene = new THREE.Scene();
    const overlay = new QuadrantOverlay(scene, {
      galaxy,
      systems: new Map([
        ['sys-core', makeSystem('sys-core', 100, 0, 100)],
        ['sys-inner', makeSystem('sys-inner', 10000, 0, 0)],
        ['sys-outer', makeSystem('sys-outer', 25000, 0, 0)],
        ['sys-halo', makeSystem('sys-halo', 0, 9000, 0)],
      ]),
      quadrantMappings: new Map(),
    });
    overlay.build();

    expect(overlay.nearestQuadrant(new THREE.Vector3(100, 0, 100))).toBe('core');
    expect(overlay.nearestQuadrant(new THREE.Vector3(25000, 0, 0))).toBe('outer-arm');
    const dist = overlay.focusDistance('outer-arm');
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(galaxy.diameterLy);
    expect(overlay.centroidOf('outer-arm').x).toBeCloseTo(25000);
    overlay.dispose();
  });
});
