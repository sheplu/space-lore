import type { Range } from './star-classes.ts'

export type { Range }

export const PLANET_TYPES = [
  'rocky',
  'oceanic',
  'gas-giant',
  'ice-giant',
  'desert',
  'volcanic',
  'frozen',
  'terrestrial',
] as const

export type PlanetType = (typeof PLANET_TYPES)[number]

export const LIFE_LEVELS = ['none', 'microbial', 'simple', 'complex', 'intelligent'] as const

export type LifeLevel = (typeof LIFE_LEVELS)[number]

const LIFE_RANK: Record<LifeLevel, number> = {
  none: 0,
  microbial: 1,
  simple: 2,
  complex: 3,
  intelligent: 4,
}

export function lifeRank(level: LifeLevel): number {
  return LIFE_RANK[level]
}

export type RingsLikelihood = 'none' | 'possible' | 'common'

export interface PlanetTypeProfile {
  type: PlanetType
  radiusEarth: Range
  gravityG: Range
  meanTempC: Range
  atmosphereDensity: Range
  moonCount: Range
  ringsLikelihood: RingsLikelihood
  lifeCeiling: LifeLevel
  traits: string[]
}

export const PLANET_TYPE_PROFILES: Record<PlanetType, PlanetTypeProfile> = {
  rocky: {
    type: 'rocky',
    radiusEarth: { min: 0.3, max: 1.6 },
    gravityG: { min: 0.2, max: 1.6 },
    meanTempC: { min: -80, max: 150 },
    atmosphereDensity: { min: 0, max: 3 },
    moonCount: { min: 0, max: 3 },
    ringsLikelihood: 'none',
    lifeCeiling: 'microbial',
    traits: ['cratered silent surfaces', 'thin or absent skies'],
  },
  oceanic: {
    type: 'oceanic',
    radiusEarth: { min: 0.8, max: 2.5 },
    gravityG: { min: 0.6, max: 1.8 },
    meanTempC: { min: -10, max: 60 },
    atmosphereDensity: { min: 0.5, max: 5 },
    moonCount: { min: 0, max: 4 },
    ringsLikelihood: 'possible',
    lifeCeiling: 'intelligent',
    traits: ['planet-wide seas', 'storm-swept swells', 'abyssal trenches'],
  },
  'gas-giant': {
    type: 'gas-giant',
    radiusEarth: { min: 4, max: 13 },
    gravityG: { min: 0.6, max: 3 },
    meanTempC: { min: -180, max: 120 },
    atmosphereDensity: { min: 50, max: 1000 },
    moonCount: { min: 0, max: 80 },
    ringsLikelihood: 'common',
    lifeCeiling: 'microbial',
    traits: ['banded cloud decks', 'century-old storms', 'swarms of icy moons'],
  },
  'ice-giant': {
    type: 'ice-giant',
    radiusEarth: { min: 2.5, max: 6 },
    gravityG: { min: 0.6, max: 2 },
    meanTempC: { min: -220, max: -100 },
    atmosphereDensity: { min: 20, max: 500 },
    moonCount: { min: 0, max: 30 },
    ringsLikelihood: 'possible',
    lifeCeiling: 'microbial',
    traits: ['methane-blue haze', 'supersonic cold winds'],
  },
  desert: {
    type: 'desert',
    radiusEarth: { min: 0.3, max: 1.8 },
    gravityG: { min: 0.2, max: 1.5 },
    meanTempC: { min: -50, max: 200 },
    atmosphereDensity: { min: 0, max: 2 },
    moonCount: { min: 0, max: 4 },
    ringsLikelihood: 'possible',
    lifeCeiling: 'microbial',
    traits: ['endless dune belts', 'rust-colored canyons', 'rare flash floods'],
  },
  volcanic: {
    type: 'volcanic',
    radiusEarth: { min: 0.3, max: 2 },
    gravityG: { min: 0.2, max: 1.7 },
    meanTempC: { min: 100, max: 900 },
    atmosphereDensity: { min: 0, max: 8 },
    moonCount: { min: 0, max: 4 },
    ringsLikelihood: 'none',
    lifeCeiling: 'microbial',
    traits: ['lava plains glowing at night', 'ash-choked skies', 'sulfur geysers'],
  },
  frozen: {
    type: 'frozen',
    radiusEarth: { min: 0.2, max: 2 },
    gravityG: { min: 0.1, max: 1.5 },
    meanTempC: { min: -240, max: -60 },
    atmosphereDensity: { min: 0, max: 2 },
    moonCount: { min: 0, max: 6 },
    ringsLikelihood: 'possible',
    lifeCeiling: 'microbial',
    traits: ['kilometer-deep ice shells', 'cryovolcanic plumes'],
  },
  terrestrial: {
    type: 'terrestrial',
    radiusEarth: { min: 0.7, max: 1.6 },
    gravityG: { min: 0.5, max: 1.5 },
    meanTempC: { min: -40, max: 60 },
    atmosphereDensity: { min: 0.3, max: 3 },
    moonCount: { min: 0, max: 5 },
    ringsLikelihood: 'possible',
    lifeCeiling: 'intelligent',
    traits: ['breathable skies', 'open water and green land', 'seasonal cycles'],
  },
}
