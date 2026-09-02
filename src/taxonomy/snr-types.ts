import type { Range } from './star-classes.ts'

export type { Range }

export const SNR_TYPES = [
  'young',
  'middle-aged',
  'old',
  'plerion',
  'thermal-composite',
] as const

export type SnrType = (typeof SNR_TYPES)[number]

export interface SnrTypeProfile {
  type: SnrType
  ageYr: Range
  radiusLy: Range
  expansionVelocityKms: Range
  temperatureK: Range
  luminosityXrayErgs: Range
  luminosityRadioErgs: Range
  magneticFieldMicroG: Range
  densityCm3: Range
  sweptUpMassSol: Range
  ejectaMassSol: Range
  composition: string[]
  traits: string[]
  shockStage: 'free-expansion' | 'sedov-taylor' | 'radiative' | 'plerionic'
  hasPulsar: boolean
  hasPwn: boolean
}

export const SNR_TYPE_PROFILES: Record<SnrType, SnrTypeProfile> = {
  young: {
    type: 'young',
    ageYr: { min: 100, max: 1000 },
    radiusLy: { min: 1, max: 10 },
    expansionVelocityKms: { min: 2000, max: 30000 },
    temperatureK: { min: 1e7, max: 1e9 },
    luminosityXrayErgs: { min: 1e34, max: 1e38 },
    luminosityRadioErgs: { min: 1e25, max: 1e29 },
    magneticFieldMicroG: { min: 50, max: 500 },
    densityCm3: { min: 0.1, max: 10 },
    sweptUpMassSol: { min: 0.1, max: 10 },
    ejectaMassSol: { min: 1, max: 10 },
    composition: ['iron', 'silicon', 'sulfur', 'oxygen', 'neon', 'magnesium'],
    traits: ['free-expansion phase', 'reverse shock heating ejecta', 'bright X-ray line emission', 'cosmic-ray acceleration', 'ejecta-dominated'],
    shockStage: 'free-expansion',
    hasPulsar: false,
    hasPwn: false,
  },
  'middle-aged': {
    type: 'middle-aged',
    ageYr: { min: 1000, max: 20000 },
    radiusLy: { min: 5, max: 50 },
    expansionVelocityKms: { min: 200, max: 2000 },
    temperatureK: { min: 1e6, max: 1e7 },
    luminosityXrayErgs: { min: 1e33, max: 1e36 },
    luminosityRadioErgs: { min: 1e26, max: 1e30 },
    magneticFieldMicroG: { min: 10, max: 100 },
    densityCm3: { min: 1, max: 100 },
    sweptUpMassSol: { min: 10, max: 1000 },
    ejectaMassSol: { min: 1, max: 10 },
    composition: ['oxygen', 'silicon', 'sulfur', 'iron', 'hydrogen', 'helium'],
    traits: ['Sedov-Taylor phase', 'self-similar expansion', 'thermal X-ray continuum', 'radio shell', 'efficient cosmic-ray acceleration'],
    shockStage: 'sedov-taylor',
    hasPulsar: false,
    hasPwn: false,
  },
  old: {
    type: 'old',
    ageYr: { min: 20000, max: 100000 },
    radiusLy: { min: 30, max: 200 },
    expansionVelocityKms: { min: 20, max: 200 },
    temperatureK: { min: 1e5, max: 1e6 },
    luminosityXrayErgs: { min: 1e31, max: 1e34 },
    luminosityRadioErgs: { min: 1e25, max: 1e29 },
    magneticFieldMicroG: { min: 1, max: 10 },
    densityCm3: { min: 10, max: 1000 },
    sweptUpMassSol: { min: 1000, max: 100000 },
    ejectaMassSol: { min: 1, max: 10 },
    composition: ['hydrogen', 'helium', 'oxygen', 'nitrogen', 'carbon'],
    traits: ['radiative phase', 'cooling shell', 'incomplete shell', 'mixing with ISM', 'fading X-ray', 'radio recombination lines'],
    shockStage: 'radiative',
    hasPulsar: false,
    hasPwn: false,
  },
  plerion: {
    type: 'plerion',
    ageYr: { min: 100, max: 50000 },
    radiusLy: { min: 0.5, max: 30 },
    expansionVelocityKms: { min: 500, max: 5000 },
    temperatureK: { min: 1e6, max: 1e8 },
    luminosityXrayErgs: { min: 1e33, max: 1e37 },
    luminosityRadioErgs: { min: 1e27, max: 1e31 },
    magneticFieldMicroG: { min: 10, max: 1000 },
    densityCm3: { min: 0.01, max: 1 },
    sweptUpMassSol: { min: 0.1, max: 100 },
    ejectaMassSol: { min: 1, max: 10 },
    composition: ['electron-positron pairs', 'magnetic field', 'relativistic particles'],
    traits: ['pulsar wind nebula', 'central pulsar powering', 'synchrotron emission', 'torus/jet morphology', 'non-thermal spectrum', 'TeV gamma-rays'],
    shockStage: 'plerionic',
    hasPulsar: true,
    hasPwn: true,
  },
  'thermal-composite': {
    type: 'thermal-composite',
    ageYr: { min: 1000, max: 50000 },
    radiusLy: { min: 5, max: 100 },
    expansionVelocityKms: { min: 100, max: 2000 },
    temperatureK: { min: 1e6, max: 1e7 },
    luminosityXrayErgs: { min: 1e33, max: 1e36 },
    luminosityRadioErgs: { min: 1e26, max: 1e30 },
    magneticFieldMicroG: { min: 5, max: 100 },
    densityCm3: { min: 1, max: 100 },
    sweptUpMassSol: { min: 10, max: 10000 },
    ejectaMassSol: { min: 1, max: 10 },
    composition: ['hydrogen', 'helium', 'oxygen', 'iron', 'silicon'],
    traits: ['shell + center-filled X-ray', 'thermal interior + nonthermal shell', 'cloud evaporation', 'mixed morphology', 'both thermal and nonthermal'],
    shockStage: 'sedov-taylor',
    hasPulsar: false,
    hasPwn: false,
  },
}

export const SNR_TYPES_LIST = Object.keys(SNR_TYPE_PROFILES) as SnrType[]

export function getSnrProfile(type: SnrType): SnrTypeProfile {
  return SNR_TYPE_PROFILES[type]
}