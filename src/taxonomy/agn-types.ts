import type { Range } from './star-classes.ts'

export type { Range }

export const AGN_TYPES = [
  'seyfert-1',
  'seyfert-2',
  'quasar',
  'blazar',
  'radio-galaxy',
  'liner',
] as const

export type AgnType = (typeof AGN_TYPES)[number]

export interface AgnTypeProfile {
  type: AgnType
  blackHoleMassSol: Range
  eddingtonRatio: Range
  bolometricLuminosityErgs: Range
  xrayLuminosityErgs: Range
  radioLuminosityErgs: Range
  jetPowerErgs: Range
  variabilityTimescaleDays: Range
  openingAngleDeg: Range
  lorenztFactor: Range
  traits: string[]
  spectralFeatures: string[]
  hostGalaxyType: string[]
}

export const AGN_TYPE_PROFILES: Record<AgnType, AgnTypeProfile> = {
  'seyfert-1': {
    type: 'seyfert-1',
    blackHoleMassSol: { min: 1e6, max: 1e8 },
    eddingtonRatio: { min: 0.01, max: 1 },
    bolometricLuminosityErgs: { min: 1e42, max: 1e45 },
    xrayLuminosityErgs: { min: 1e41, max: 1e44 },
    radioLuminosityErgs: { min: 1e38, max: 1e41 },
    jetPowerErgs: { min: 1e40, max: 1e43 },
    variabilityTimescaleDays: { min: 1, max: 1000 },
    openingAngleDeg: { min: 30, max: 60 },
    lorenztFactor: { min: 1, max: 3 },
    traits: ['broad emission lines', 'unobscured BLR', 'strong UV/X-ray continuum', 'moderate radio'],
    spectralFeatures: ['broad H-beta', 'broad C IV', 'Fe II multiplets', 'narrow [O III]'],
    hostGalaxyType: ['spiral', 'lenticular'],
  },
  'seyfert-2': {
    type: 'seyfert-2',
    blackHoleMassSol: { min: 1e6, max: 1e8 },
    eddingtonRatio: { min: 0.001, max: 0.1 },
    bolometricLuminosityErgs: { min: 1e41, max: 1e44 },
    xrayLuminosityErgs: { min: 1e40, max: 1e43 },
    radioLuminosityErgs: { min: 1e38, max: 1e41 },
    jetPowerErgs: { min: 1e39, max: 1e42 },
    variabilityTimescaleDays: { min: 10, max: 10000 },
    openingAngleDeg: { min: 60, max: 90 },
    lorenztFactor: { min: 1, max: 2 },
    traits: ['narrow emission lines only', 'obscured BLR by torus', 'strong [O III]', 'polarized broad lines'],
    spectralFeatures: ['narrow H-beta', 'strong [O III]', 'polarized broad lines', 'Fe K-alpha line'],
    hostGalaxyType: ['spiral', 'lenticular'],
  },
  quasar: {
    type: 'quasar',
    blackHoleMassSol: { min: 1e8, max: 1e10 },
    eddingtonRatio: { min: 0.1, max: 1 },
    bolometricLuminosityErgs: { min: 1e45, max: 1e48 },
    xrayLuminosityErgs: { min: 1e43, max: 1e46 },
    radioLuminosityErgs: { min: 1e40, max: 1e44 },
    jetPowerErgs: { min: 1e43, max: 1e46 },
    variabilityTimescaleDays: { min: 10, max: 10000 },
    openingAngleDeg: { min: 20, max: 50 },
    lorenztFactor: { min: 2, max: 10 },
    traits: ['extremely luminous', 'outshines host galaxy', 'broad emission lines', 'strong UV bump', 'cosmological distance'],
    spectralFeatures: ['broad Lyman-alpha', 'broad C IV', 'broad Mg II', 'strong Fe II', 'weak [O III]'],
    hostGalaxyType: ['elliptical', 'merging', 'disturbed'],
  },
  blazar: {
    type: 'blazar',
    blackHoleMassSol: { min: 1e8, max: 1e10 },
    eddingtonRatio: { min: 0.01, max: 1 },
    bolometricLuminosityErgs: { min: 1e44, max: 1e48 },
    xrayLuminosityErgs: { min: 1e42, max: 1e46 },
    radioLuminosityErgs: { min: 1e42, max: 1e46 },
    jetPowerErgs: { min: 1e44, max: 1e47 },
    variabilityTimescaleDays: { min: 0.01, max: 100 },
    openingAngleDeg: { min: 1, max: 10 },
    lorenztFactor: { min: 10, max: 50 },
    traits: ['jet aligned with line of sight', 'extreme variability', 'non-thermal continuum', 'gamma-ray bright', 'superluminal motion'],
    spectralFeatures: ['featureless continuum', 'weak emission lines', 'synchrotron peak', 'inverse Compton peak'],
    hostGalaxyType: ['elliptical'],
  },
  'radio-galaxy': {
    type: 'radio-galaxy',
    blackHoleMassSol: { min: 1e8, max: 1e10 },
    eddingtonRatio: { min: 1e-4, max: 0.1 },
    bolometricLuminosityErgs: { min: 1e42, max: 1e46 },
    xrayLuminosityErgs: { min: 1e40, max: 1e44 },
    radioLuminosityErgs: { min: 1e42, max: 1e46 },
    jetPowerErgs: { min: 1e43, max: 1e47 },
    variabilityTimescaleDays: { min: 100, max: 100000 },
    openingAngleDeg: { min: 10, max: 30 },
    lorenztFactor: { min: 2, max: 20 },
    traits: ['powerful radio jets', 'lobes and hotspots', 'FR I or FR II morphology', 'jet misaligned', 'low accretion rate'],
    spectralFeatures: ['weak/absent broad lines', 'narrow [O III]', 'synchrotron radio', 'X-ray jet emission'],
    hostGalaxyType: ['giant elliptical', 'cluster central'],
  },
  liner: {
    type: 'liner',
    blackHoleMassSol: { min: 1e6, max: 1e9 },
    eddingtonRatio: { min: 1e-6, max: 1e-3 },
    bolometricLuminosityErgs: { min: 1e39, max: 1e42 },
    xrayLuminosityErgs: { min: 1e38, max: 1e41 },
    radioLuminosityErgs: { min: 1e36, max: 1e39 },
    jetPowerErgs: { min: 1e37, max: 1e40 },
    variabilityTimescaleDays: { min: 1000, max: 1e6 },
    openingAngleDeg: { min: 60, max: 90 },
    lorenztFactor: { min: 1, max: 2 },
    traits: ['low-ionization nuclear emission', 'very low accretion rate', 'radiatively inefficient', 'common in nearby galaxies'],
    spectralFeatures: ['strong [O I]', 'strong [N II]', 'weak [O III]', 'low-ionization lines'],
    hostGalaxyType: ['elliptical', 'spiral bulge', 'S0'],
  },
}

export const AGN_TYPES_LIST = Object.keys(AGN_TYPE_PROFILES) as AgnType[]

export function getAgnProfile(type: AgnType): AgnTypeProfile {
  return AGN_TYPE_PROFILES[type]
}