import type { Range } from './star-classes.ts'

export type { Range }

export const DWARF_PLANET_TYPES = ['icy', 'rocky', 'hybrid'] as const

export type DwarfPlanetType = (typeof DWARF_PLANET_TYPES)[number]

export interface DwarfPlanetTypeProfile {
  type: DwarfPlanetType
  radiusKm: Range
  gravityG: Range
  meanTempC: Range
  hasAtmosphere: boolean
  maxMoonCount: number
  traits: string[]
}

export const DWARF_PLANET_TYPE_PROFILES: Record<DwarfPlanetType, DwarfPlanetTypeProfile> = {
  icy: {
    type: 'icy',
    radiusKm: { min: 200, max: 1500 },
    gravityG: { min: 0.01, max: 0.3 },
    meanTempC: { min: -240, max: -50 },
    hasAtmosphere: false,
    maxMoonCount: 5,
    traits: ['water ice mantle', 'possible subsurface ocean', 'Kuiper belt origin'],
  },
  rocky: {
    type: 'rocky',
    radiusKm: { min: 200, max: 1000 },
    gravityG: { min: 0.02, max: 0.4 },
    meanTempC: { min: -100, max: 200 },
    hasAtmosphere: false,
    maxMoonCount: 2,
    traits: ['silicate composition', 'differentiated interior', 'asteroid belt origin'],
  },
  hybrid: {
    type: 'hybrid',
    radiusKm: { min: 300, max: 1800 },
    gravityG: { min: 0.02, max: 0.5 },
    meanTempC: { min: -200, max: 50 },
    hasAtmosphere: true,
    maxMoonCount: 3,
    traits: ['mixed ice-rock composition', 'tenuous atmosphere', 'transitional object'],
  },
}