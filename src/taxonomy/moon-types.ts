import type { Range } from './star-classes.ts'

export type { Range }

export const MOON_TYPES = [
  'rocky',
  'icy',
  'volcanic',
  'captured-asteroid',
  'shepherd',
] as const

export type MoonType = (typeof MOON_TYPES)[number]

export interface MoonTypeProfile {
  type: MoonType
  radiusKm: Range
  gravityG: Range
  orbitalDistanceKm: Range
  hasAtmosphere: boolean
  traits: string[]
}

export const MOON_TYPE_PROFILES: Record<MoonType, MoonTypeProfile> = {
  rocky: {
    type: 'rocky',
    radiusKm: { min: 10, max: 2000 },
    gravityG: { min: 0.001, max: 0.3 },
    orbitalDistanceKm: { min: 5000, max: 2000000 },
    hasAtmosphere: false,
    traits: ['cratered highlands', 'regolith plains', 'ancient impact basins'],
  },
  icy: {
    type: 'icy',
    radiusKm: { min: 50, max: 3000 },
    gravityG: { min: 0.001, max: 0.4 },
    orbitalDistanceKm: { min: 10000, max: 3000000 },
    hasAtmosphere: false,
    traits: ['fractured ice shell', 'subsurface ocean possible', 'cryovolcanic plumes'],
  },
  volcanic: {
    type: 'volcanic',
    radiusKm: { min: 100, max: 2500 },
    gravityG: { min: 0.01, max: 0.5 },
    orbitalDistanceKm: { min: 10000, max: 1000000 },
    hasAtmosphere: true,
    traits: ['active lava flows', 'sulfur dioxide atmosphere', 'tidal heating'],
  },
  'captured-asteroid': {
    type: 'captured-asteroid',
    radiusKm: { min: 5, max: 300 },
    gravityG: { min: 0.0001, max: 0.05 },
    orbitalDistanceKm: { min: 5000, max: 5000000 },
    hasAtmosphere: false,
    traits: ['irregular shape', 'carbonaceous surface', 'retrograde orbit common'],
  },
  shepherd: {
    type: 'shepherd',
    radiusKm: { min: 5, max: 200 },
    gravityG: { min: 0.0001, max: 0.02 },
    orbitalDistanceKm: { min: 1000, max: 200000 },
    hasAtmosphere: false,
    traits: ['gap-creating resonance', 'sharp ring edges', 'small and elongated'],
  },
}