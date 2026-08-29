import type { Range } from './star-classes.ts'

export type { Range }

export const ASTEROID_TYPES = ['rocky', 'metallic', 'icy', 'carbonaceous'] as const

export type AsteroidType = (typeof ASTEROID_TYPES)[number]

export interface AsteroidTypeProfile {
  type: AsteroidType
  radiusKm: Range
  massKg: Range
  albedo: Range
  rotationPeriodHours: Range
  traits: string[]
}

export const ASTEROID_TYPE_PROFILES: Record<AsteroidType, AsteroidTypeProfile> = {
  rocky: {
    type: 'rocky',
    radiusKm: { min: 0.5, max: 500 },
    massKg: { min: 1e12, max: 1e20 },
    albedo: { min: 0.1, max: 0.3 },
    rotationPeriodHours: { min: 0.5, max: 100 },
    traits: ['silicate composition', 'cratered surface', 'common in inner belt'],
  },
  metallic: {
    type: 'metallic',
    radiusKm: { min: 0.5, max: 200 },
    massKg: { min: 1e13, max: 1e20 },
    albedo: { min: 0.1, max: 0.2 },
    rotationPeriodHours: { min: 0.5, max: 50 },
    traits: ['iron-nickel core', 'high density', 'remnants of protoplanet cores'],
  },
  icy: {
    type: 'icy',
    radiusKm: { min: 1, max: 1000 },
    massKg: { min: 1e12, max: 1e21 },
    albedo: { min: 0.05, max: 0.6 },
    rotationPeriodHours: { min: 1, max: 200 },
    traits: ['water ice dominant', 'volatile-rich', 'common in outer belt'],
  },
  carbonaceous: {
    type: 'carbonaceous',
    radiusKm: { min: 1, max: 800 },
    massKg: { min: 1e12, max: 1e21 },
    albedo: { min: 0.02, max: 0.1 },
    rotationPeriodHours: { min: 2, max: 100 },
    traits: ['dark carbon-rich', 'organic compounds', 'primitive solar system material'],
  },
}