import type { Range } from './star-classes.ts'

export type { Range }

export const COMET_TYPES = ['short-period', 'long-period', 'sungrazer', 'interstellar'] as const

export type CometType = (typeof COMET_TYPES)[number]

export interface CometTypeProfile {
  type: CometType
  semiMajorAxisAu: Range
  eccentricity: Range
  inclinationDeg: Range
  orbitalPeriodYears: Range
  nucleusRadiusKm: Range
  dustProductionRate: Range
  gasProductionRate: Range
  traits: string[]
}

export const COMET_TYPE_PROFILES: Record<CometType, CometTypeProfile> = {
  'short-period': {
    type: 'short-period',
    semiMajorAxisAu: { min: 3, max: 10 },
    eccentricity: { min: 0.2, max: 0.8 },
    inclinationDeg: { min: 0, max: 30 },
    orbitalPeriodYears: { min: 3, max: 200 },
    nucleusRadiusKm: { min: 0.5, max: 20 },
    dustProductionRate: { min: 1, max: 1000 },
    gasProductionRate: { min: 1, max: 1000 },
    traits: ['Jupiter-family or Halley-type', 'periodic returns', 'depleted volatiles'],
  },
  'long-period': {
    type: 'long-period',
    semiMajorAxisAu: { min: 50, max: 50000 },
    eccentricity: { min: 0.9, max: 0.999 },
    inclinationDeg: { min: 0, max: 180 },
    orbitalPeriodYears: { min: 200, max: 1000000 },
    nucleusRadiusKm: { min: 1, max: 50 },
    dustProductionRate: { min: 10, max: 100000 },
    gasProductionRate: { min: 10, max: 100000 },
    traits: ['Oort cloud origin', 'near-parabolic orbits', 'pristine volatiles'],
  },
  sungrazer: {
    type: 'sungrazer',
    semiMajorAxisAu: { min: 0.5, max: 5 },
    eccentricity: { min: 0.98, max: 0.9999 },
    inclinationDeg: { min: 0, max: 180 },
    orbitalPeriodYears: { min: 0.5, max: 10 },
    nucleusRadiusKm: { min: 0.1, max: 10 },
    dustProductionRate: { min: 100, max: 1000000 },
    gasProductionRate: { min: 100, max: 1000000 },
    traits: ['perihelion < 0.01 AU', 'extreme thermal stress', 'often disintegrate'],
  },
  interstellar: {
    type: 'interstellar',
    semiMajorAxisAu: { min: 1000, max: 100000 },
    eccentricity: { min: 1.0, max: 2.0 },
    inclinationDeg: { min: 0, max: 180 },
    orbitalPeriodYears: { min: 0, max: 0 },
    nucleusRadiusKm: { min: 0.1, max: 1000 },
    dustProductionRate: { min: 0, max: 10000 },
    gasProductionRate: { min: 0, max: 10000 },
    traits: ['hyperbolic trajectory', 'extrasolar origin', 'single passage'],
  },
}