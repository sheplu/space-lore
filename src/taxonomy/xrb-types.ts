import type { Range } from './star-classes.ts'

export type { Range }

export const XRB_TYPES = [
  'lmxb',
  'hmxb',
  'microquasar',
  'ultracompact',
  'symbiotic',
] as const

export type XrbType = (typeof XRB_TYPES)[number]

export interface XrbTypeProfile {
  type: XrbType
  compactObject: 'neutron-star' | 'black-hole' | 'both'
  donorSpectralType: string[]
  donorMassSol: Range
  orbitalPeriodHours: Range
  xrayLuminosityErgs: Range
  accretionRateEddington: Range
  diskTemperatureK: Range
  hasJets: boolean
  jetPowerErgs: Range
  stateTransitions: string[]
  traits: string[]
  variabilityTimescales: string[]
}

export const XRB_TYPE_PROFILES: Record<XrbType, XrbTypeProfile> = {
  lmxb: {
    type: 'lmxb',
    compactObject: 'both',
    donorSpectralType: ['K', 'G', 'F', 'A', 'M'],
    donorMassSol: { min: 0.1, max: 1.5 },
    orbitalPeriodHours: { min: 0.5, max: 200 },
    xrayLuminosityErgs: { min: 1e36, max: 1e38 },
    accretionRateEddington: { min: 0.001, max: 1 },
    diskTemperatureK: { min: 1e6, max: 2e7 },
    hasJets: false,
    jetPowerErgs: { min: 1e30, max: 1e34 },
    stateTransitions: ['hard', 'soft', 'intermediate'],
    traits: ['Roche lobe overflow', 'accretion disk', 'thermonuclear bursts (NS)', 'quasi-periodic oscillations', 'persistent or transient'],
    variabilityTimescales: ['millisecond QPOs', 'orbital modulation', 'superorbital periods'],
  },
  hmxb: {
    type: 'hmxb',
    compactObject: 'both',
    donorSpectralType: ['O', 'B', 'Be'],
    donorMassSol: { min: 5, max: 50 },
    orbitalPeriodHours: { min: 10, max: 5000 },
    xrayLuminosityErgs: { min: 1e35, max: 1e39 },
    accretionRateEddington: { min: 0.01, max: 10 },
    diskTemperatureK: { min: 1e7, max: 5e7 },
    hasJets: false,
    jetPowerErgs: { min: 1e32, max: 1e36 },
    stateTransitions: [],
    traits: ['wind accretion or Roche lobe', 'pulsars (NS)', 'eclipses', 'superorbital periods', 'Be star decretion disk'],
    variabilityTimescales: ['spin period', 'orbital period', 'superorbital modulation'],
  },
  microquasar: {
    type: 'microquasar',
    compactObject: 'black-hole',
    donorSpectralType: ['K', 'G', 'F', 'O', 'B'],
    donorMassSol: { min: 0.5, max: 30 },
    orbitalPeriodHours: { min: 5, max: 2000 },
    xrayLuminosityErgs: { min: 1e37, max: 1e39 },
    accretionRateEddington: { min: 0.1, max: 10 },
    diskTemperatureK: { min: 1e7, max: 1e8 },
    hasJets: true,
    jetPowerErgs: { min: 1e36, max: 1e39 },
    stateTransitions: ['hard', 'soft', 'intermediate', 'very-high'],
    traits: ['relativistic jets', 'superluminal motion', 'radio/X-ray correlation', 'state transitions', 'jet quenching in soft state'],
    variabilityTimescales: ['jet flares', 'state transitions (days-weeks)', 'orbital period'],
  },
  ultracompact: {
    type: 'ultracompact',
    compactObject: 'both',
    donorSpectralType: ['He', 'C/O', 'white-dwarf'],
    donorMassSol: { min: 0.01, max: 0.5 },
    orbitalPeriodHours: { min: 0.1, max: 2 },
    xrayLuminosityErgs: { min: 1e34, max: 1e37 },
    accretionRateEddington: { min: 1e-5, max: 0.1 },
    diskTemperatureK: { min: 1e6, max: 1e7 },
    hasJets: false,
    jetPowerErgs: { min: 1e28, max: 1e32 },
    stateTransitions: [],
    traits: ['degenerate donor', 'gravitational wave source', 'very short period', 'helium/carbon-oxygen rich', 'AM CVn type'],
    variabilityTimescales: ['orbital period (minutes)', 'superhumps'],
  },
  symbiotic: {
    type: 'symbiotic',
    compactObject: 'both',
    donorSpectralType: ['M', 'K', 'giant'],
    donorMassSol: { min: 0.5, max: 3 },
    orbitalPeriodHours: { min: 2000, max: 50000 },
    xrayLuminosityErgs: { min: 1e32, max: 1e36 },
    accretionRateEddington: { min: 1e-6, max: 0.01 },
    diskTemperatureK: { min: 1e5, max: 1e6 },
    hasJets: false,
    jetPowerErgs: { min: 1e28, max: 1e32 },
    stateTransitions: [],
    traits: ['red giant donor', 'wind accretion', 'nebular emission', 'slow novae', 'wide orbit'],
    variabilityTimescales: ['orbital period (years)', 'pulsation', 'outbursts'],
  },
}

export const XRB_TYPES_LIST = Object.keys(XRB_TYPE_PROFILES) as XrbType[]

export function getXrbProfile(type: XrbType): XrbTypeProfile {
  return XRB_TYPE_PROFILES[type]
}