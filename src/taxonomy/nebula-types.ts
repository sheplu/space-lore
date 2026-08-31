import type { Range } from './star-classes.ts'

export type { Range }

export const NEBULA_TYPES = [
  'emission',
  'reflection',
  'dark',
  'planetary',
  'supernova-remnant',
  'molecular-cloud',
  'hii-region',
] as const

export type NebulaType = (typeof NEBULA_TYPES)[number]

export interface NebulaTypeProfile {
  type: NebulaType
  temperatureK: Range
  densityCm3: Range
  radiusLy: Range
  massSol: Range
  ionizationLevel: Range
  magneticFieldMicroG: Range
  composition: string[]
  traits: string[]
  starFormationActivity: 'none' | 'low' | 'moderate' | 'high' | 'extreme'
  colorPalette: string[]
}

export const NEBULA_TYPE_PROFILES: Record<NebulaType, NebulaTypeProfile> = {
  emission: {
    type: 'emission',
    temperatureK: { min: 8000, max: 15000 },
    densityCm3: { min: 10, max: 10000 },
    radiusLy: { min: 1, max: 100 },
    massSol: { min: 10, max: 100000 },
    ionizationLevel: { min: 0.1, max: 0.9 },
    magneticFieldMicroG: { min: 1, max: 50 },
    composition: ['hydrogen', 'helium', 'oxygen', 'nitrogen', 'sulfur'],
    traits: ['glowing ionized gas', 'energized by nearby hot stars', 'H-alpha red emission', 'star-forming regions'],
    starFormationActivity: 'moderate',
    colorPalette: ['#ff3300', '#ff6600', '#cc2200', '#ff4400', '#aa1100'],
  },
  reflection: {
    type: 'reflection',
    temperatureK: { min: 10, max: 100 },
    densityCm3: { min: 100, max: 10000 },
    radiusLy: { min: 0.5, max: 50 },
    massSol: { min: 10, max: 50000 },
    ionizationLevel: { min: 0.0, max: 0.05 },
    magneticFieldMicroG: { min: 0.5, max: 20 },
    composition: ['dust', 'hydrogen', 'helium', 'carbon', 'silicates'],
    traits: ['scattered starlight', 'blueish glow from dust', 'cold and dense', 'often near young stars'],
    starFormationActivity: 'low',
    colorPalette: ['#4466ff', '#6688ff', '#2244cc', '#88aaff', '#1133aa'],
  },
  dark: {
    type: 'dark',
    temperatureK: { min: 5, max: 20 },
    densityCm3: { min: 1000, max: 1000000 },
    radiusLy: { min: 0.5, max: 200 },
    massSol: { min: 100, max: 1000000 },
    ionizationLevel: { min: 0.0, max: 0.01 },
    magneticFieldMicroG: { min: 5, max: 100 },
    composition: ['dust', 'molecular hydrogen', 'helium', 'CO', 'ices'],
    traits: ['opaque dust lanes', 'blocks background light', 'coldest nebulae', 'stellar nurseries', 'high extinction'],
    starFormationActivity: 'high',
    colorPalette: ['#0a0a0a', '#1a1a1a', '#0d0d0d', '#151515', '#080808'],
  },
  planetary: {
    type: 'planetary',
    temperatureK: { min: 8000, max: 30000 },
    densityCm3: { min: 100, max: 10000 },
    radiusLy: { min: 0.05, max: 2 },
    massSol: { min: 0.1, max: 1 },
    ionizationLevel: { min: 0.3, max: 0.8 },
    magneticFieldMicroG: { min: 1, max: 30 },
    composition: ['hydrogen', 'helium', 'oxygen', 'nitrogen', 'carbon', 'neon'],
    traits: ['expanding shell from dying star', 'central white dwarf', 'symmetrical rings or bipolar', 'short-lived ~10-50 kyr'],
    starFormationActivity: 'none',
    colorPalette: ['#00ffff', '#00cccc', '#009999', '#33ffff', '#66ffff'],
  },
  'supernova-remnant': {
    type: 'supernova-remnant',
    temperatureK: { min: 100000, max: 10000000 },
    densityCm3: { min: 0.01, max: 1000 },
    radiusLy: { min: 5, max: 100 },
    massSol: { min: 1, max: 100 },
    ionizationLevel: { min: 0.5, max: 1.0 },
    magneticFieldMicroG: { min: 10, max: 1000 },
    composition: ['hydrogen', 'helium', 'oxygen', 'silicon', 'iron', 'nickel'],
    traits: ['expanding shockwave', 'X-ray and radio emission', 'contains neutron star or black hole', 'cosmic ray accelerator', 'filamentary structure'],
    starFormationActivity: 'none',
    colorPalette: ['#ff00ff', '#cc00cc', '#990099', '#ff33ff', '#ff66ff'],
  },
  'molecular-cloud': {
    type: 'molecular-cloud',
    temperatureK: { min: 10, max: 50 },
    densityCm3: { min: 100, max: 1000000 },
    radiusLy: { min: 10, max: 500 },
    massSol: { min: 1000, max: 10000000 },
    ionizationLevel: { min: 0.0, max: 0.01 },
    magneticFieldMicroG: { min: 5, max: 200 },
    composition: ['H2', 'helium', 'CO', 'dust', 'complex organics'],
    traits: ['giant molecular cloud', 'primary star formation sites', 'cold and dense cores', 'filamentary and clumpy', 'CO emission tracers'],
    starFormationActivity: 'extreme',
    colorPalette: ['#1a1a2e', '#16213e', '#0f3460', '#2e2e4e', '#0a0a1a'],
  },
  'hii-region': {
    type: 'hii-region',
    temperatureK: { min: 7000, max: 12000 },
    densityCm3: { min: 10, max: 10000 },
    radiusLy: { min: 1, max: 200 },
    massSol: { min: 100, max: 100000 },
    ionizationLevel: { min: 0.5, max: 1.0 },
    magneticFieldMicroG: { min: 1, max: 50 },
    composition: ['ionized hydrogen', 'helium', 'oxygen', 'nitrogen', 'sulfur'],
    traits: ['massive star ionization', 'bright H-alpha emission', 'associated with OB associations', 'expanding ionization fronts', 'triggered star formation at edges'],
    starFormationActivity: 'high',
    colorPalette: ['#ff0044', '#cc0033', '#ff3366', '#aa0022', '#ff6688'],
  },
}

export const NEBULA_TYPES_LIST = Object.keys(NEBULA_TYPE_PROFILES) as NebulaType[]

export function getNebulaProfile(type: NebulaType): NebulaTypeProfile {
  return NEBULA_TYPE_PROFILES[type]
}