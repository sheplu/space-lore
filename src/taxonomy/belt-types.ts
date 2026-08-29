import type { Range } from './star-classes.ts'

export type { Range }

export const BELT_TYPES = ['main', 'kuiper', 'scattered', 'trojan'] as const

export type BeltType = (typeof BELT_TYPES)[number]

export interface BeltTypeProfile {
  type: BeltType
  innerEdgeAu: Range
  outerEdgeAu: Range
  totalMassEarth: Range
  composition: string[]
  traits: string[]
}

export const BELT_TYPE_PROFILES: Record<BeltType, BeltTypeProfile> = {
  main: {
    type: 'main',
    innerEdgeAu: { min: 1.5, max: 2.5 },
    outerEdgeAu: { min: 3.0, max: 5.0 },
    totalMassEarth: { min: 0.0001, max: 0.01 },
    composition: ['rocky', 'carbonaceous', 'metallic'],
    traits: ['between terrestrial and giant planets', 'Kirkwood gaps', 'collisional families'],
  },
  kuiper: {
    type: 'kuiper',
    innerEdgeAu: { min: 30, max: 45 },
    outerEdgeAu: { min: 45, max: 60 },
    totalMassEarth: { min: 0.01, max: 0.1 },
    composition: ['icy', 'carbonaceous'],
    traits: ['beyond giant planets', 'source of short-period comets', 'dwarf planet population'],
  },
  scattered: {
    type: 'scattered',
    innerEdgeAu: { min: 50, max: 100 },
    outerEdgeAu: { min: 100, max: 1000 },
    totalMassEarth: { min: 0.001, max: 0.05 },
    composition: ['icy', 'carbonaceous'],
    traits: ['highly eccentric orbits', 'Neptune-influenced', 'source of centaurs'],
  },
  trojan: {
    type: 'trojan',
    innerEdgeAu: { min: 4.5, max: 5.5 },
    outerEdgeAu: { min: 4.5, max: 5.5 },
    totalMassEarth: { min: 0.00001, max: 0.001 },
    composition: ['carbonaceous', 'icy', 'rocky'],
    traits: ['L4/L5 Lagrange points', 'co-orbital with giant planet', 'stable reservoirs'],
  },
}