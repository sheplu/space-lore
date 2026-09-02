export interface Range {
  min: number
  max: number
}

export type StarClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M'

export type StarType =
  | 'main-sequence'
  | 'white-dwarf'
  | 'neutron-star'
  | 'black-hole'
  | 'brown-dwarf'
  | 'supergiant'
  | 'hypergiant'

export type NeutronStarSubtype = 'radio-pulsar' | 'magnetar' | 'x-ray-pulsar' | 'normal'

export type XrbSubtype = 'lmxb' | 'hmxb' | 'microquasar' | 'ultracompact' | 'symbiotic'
export type BlackHoleSubtype = 'normal' | 'xrb'

export interface StarClassProfile {
  class: StarClass
  color: string
  temperatureK: Range
  massSol: Range
  radiusSol: Range
  luminositySol: Range
  fraction: number
  traits: string[]
}

export interface StarTypeProfile {
  type: StarType
  color: string
  temperatureK: Range
  massSol: Range
  radiusSol: Range
  luminositySol: Range
  fraction: number
  traits: string[]
}

export interface NeutronStarSubtypeProfile {
  subtype: NeutronStarSubtype
  color: string
  temperatureK: Range
  massSol: Range
  radiusSol: Range
  luminositySol: Range
  periodSeconds: Range
  periodDerivative: Range
  magneticFieldGauss: Range
  traits: string[]
}

export interface XrbSubtypeProfile {
  subtype: XrbSubtype
  color: string
  temperatureK: Range
  massSol: Range
  radiusSol: Range
  luminositySol: Range
  xrayLuminosityErgs: Range
  accretionRateEddington: Range
  diskTemperatureK: Range
  hasJets: boolean
  jetPowerErgs: Range
  traits: string[]
}

export interface BlackHoleSubtypeProfile {
  subtype: BlackHoleSubtype
  color: string
  temperatureK: Range
  massSol: Range
  radiusSol: Range
  luminositySol: Range
  xrayLuminosityErgs: Range
  accretionRateEddington: Range
  diskTemperatureK: Range
  hasJets: boolean
  jetPowerErgs: Range
  traits: string[]
}

export const STAR_CLASS_PROFILES: Record<StarClass, StarClassProfile> = {
  O: {
    class: 'O',
    color: 'blue',
    temperatureK: { min: 30000, max: 50000 },
    massSol: { min: 16, max: 300 },
    radiusSol: { min: 6.6, max: 15 },
    luminositySol: { min: 30000, max: 1000000 },
    fraction: 0.000001,
    traits: ['blistering radiance', 'short-lived giant', 'ionizing winds'],
  },
  B: {
    class: 'B',
    color: 'blue-white',
    temperatureK: { min: 10000, max: 30000 },
    massSol: { min: 2.1, max: 16 },
    radiusSol: { min: 1.8, max: 6.6 },
    luminositySol: { min: 25, max: 30000 },
    fraction: 0.005,
    traits: ['fierce ultraviolet glow', 'young and brilliant'],
  },
  A: {
    class: 'A',
    color: 'white',
    temperatureK: { min: 7500, max: 10000 },
    massSol: { min: 1.4, max: 2.1 },
    radiusSol: { min: 1.4, max: 1.8 },
    luminositySol: { min: 5, max: 25 },
    fraction: 0.02,
    traits: ['clean white light', 'fast rotator'],
  },
  F: {
    class: 'F',
    color: 'yellow-white',
    temperatureK: { min: 6000, max: 7500 },
    massSol: { min: 1.04, max: 1.4 },
    radiusSol: { min: 1.15, max: 1.4 },
    luminositySol: { min: 1.5, max: 5 },
    fraction: 0.06,
    traits: ['bright temperate shine', 'wide habitable margin'],
  },
  G: {
    class: 'G',
    color: 'yellow',
    temperatureK: { min: 5200, max: 6000 },
    massSol: { min: 0.8, max: 1.04 },
    radiusSol: { min: 0.96, max: 1.15 },
    luminositySol: { min: 0.6, max: 1.5 },
    fraction: 0.12,
    traits: ['steady main-sequence burn', 'sun-like warmth'],
  },
  K: {
    class: 'K',
    color: 'orange',
    temperatureK: { min: 3700, max: 5200 },
    massSol: { min: 0.45, max: 0.8 },
    radiusSol: { min: 0.7, max: 0.96 },
    luminositySol: { min: 0.08, max: 0.6 },
    fraction: 0.3,
    traits: ['calm long-lived ember', 'gentle gold light'],
  },
  M: {
    class: 'M',
    color: 'red',
    temperatureK: { min: 2400, max: 3700 },
    massSol: { min: 0.08, max: 0.45 },
    radiusSol: { min: 0.1, max: 0.7 },
    luminositySol: { min: 0.0001, max: 0.08 },
    fraction: 0.494999,
    traits: ['dim crimson flicker', 'prone to flares', 'trillion-year lifespan'],
  },
}

export const STAR_TYPE_PROFILES: Record<Exclude<StarType, 'main-sequence'>, StarTypeProfile> = {
  'white-dwarf': {
    type: 'white-dwarf',
    color: 'white',
    temperatureK: { min: 5000, max: 150000 },
    massSol: { min: 0.17, max: 1.44 },
    radiusSol: { min: 0.008, max: 0.02 },
    luminositySol: { min: 0.0001, max: 0.1 },
    fraction: 0.03,
    traits: ['degenerate matter', 'cooling remnant', 'no fusion', 'extreme density'],
  },
  'neutron-star': {
    type: 'neutron-star',
    color: 'blue-white',
    temperatureK: { min: 100000, max: 1000000 },
    massSol: { min: 1.1, max: 2.5 },
    radiusSol: { min: 0.00001, max: 0.00002 },
    luminositySol: { min: 0.00001, max: 1000 },
    fraction: 0.001,
    traits: ['extreme density', 'pulsar beams', 'rapid rotation', 'strong magnetic field'],
  },
  'black-hole': {
    type: 'black-hole',
    color: 'black',
    temperatureK: { min: 0, max: 0 },
    massSol: { min: 3, max: 100 },
    radiusSol: { min: 0, max: 0 },
    luminositySol: { min: 0, max: 0 },
    fraction: 0.0001,
    traits: ['singularity', 'event horizon', 'accretion disk', 'gravitational lensing'],
  },
  'brown-dwarf': {
    type: 'brown-dwarf',
    color: 'magenta',
    temperatureK: { min: 300, max: 2500 },
    massSol: { min: 0.013, max: 0.08 },
    radiusSol: { min: 0.07, max: 0.1 },
    luminositySol: { min: 0.00001, max: 0.0001 },
    fraction: 0.05,
    traits: ['failed star', 'deuterium fusion only', 'cool and dim', 'planet-like atmosphere'],
  },
  supergiant: {
    type: 'supergiant',
    color: 'red',
    temperatureK: { min: 3500, max: 40000 },
    massSol: { min: 8, max: 50 },
    radiusSol: { min: 30, max: 1000 },
    luminositySol: { min: 10000, max: 1000000 },
    fraction: 0.00001,
    traits: ['massive and luminous', 'short-lived', 'strong stellar winds', 'supernova candidate'],
  },
  hypergiant: {
    type: 'hypergiant',
    color: 'blue-white',
    temperatureK: { min: 8000, max: 40000 },
    massSol: { min: 50, max: 300 },
    radiusSol: { min: 100, max: 2000 },
    luminositySol: { min: 100000, max: 10000000 },
    fraction: 0.0000001,
    traits: ['extreme luminosity', 'violent mass loss', 'unstable', 'rare and brief'],
  },
}

export const NEUTRON_STAR_SUBTYPE_PROFILES: Record<NeutronStarSubtype, NeutronStarSubtypeProfile> = {
  'radio-pulsar': {
    subtype: 'radio-pulsar',
    color: 'blue-white',
    temperatureK: { min: 100000, max: 1000000 },
    massSol: { min: 1.2, max: 2.0 },
    radiusSol: { min: 0.00001, max: 0.00002 },
    luminositySol: { min: 0.00001, max: 0.001 },
    periodSeconds: { min: 0.001, max: 10 },
    periodDerivative: { min: 1e-20, max: 1e-12 },
    magneticFieldGauss: { min: 1e8, max: 1e13 },
    traits: ['coherent radio beams', 'rotation-powered', 'precise cosmic clock', 'dispersion measure'],
  },
  'magnetar': {
    subtype: 'magnetar',
    color: 'blue-white',
    temperatureK: { min: 200000, max: 1000000 },
    massSol: { min: 1.3, max: 2.0 },
    radiusSol: { min: 0.00001, max: 0.00002 },
    luminositySol: { min: 0.001, max: 0.1 },
    periodSeconds: { min: 2, max: 12 },
    periodDerivative: { min: 1e-13, max: 1e-10 },
    magneticFieldGauss: { min: 1e14, max: 1e15 },
    traits: ['ultra-strong magnetic field', 'starquakes', 'SGR bursts', 'persistent X-ray emission', 'AXP behavior'],
  },
  'x-ray-pulsar': {
    subtype: 'x-ray-pulsar',
    color: 'blue-white',
    temperatureK: { min: 100000, max: 1000000 },
    massSol: { min: 1.2, max: 2.0 },
    radiusSol: { min: 0.00001, max: 0.00002 },
    luminositySol: { min: 0.001, max: 1 },
    periodSeconds: { min: 0.1, max: 1000 },
    periodDerivative: { min: 1e-15, max: 1e-10 },
    magneticFieldGauss: { min: 1e10, max: 1e13 },
    traits: ['accretion-powered', 'X-ray emission', 'binary companion', 'type I/II outbursts', 'cyclotron lines'],
  },
  normal: {
    subtype: 'normal',
    color: 'blue-white',
    temperatureK: { min: 100000, max: 1000000 },
    massSol: { min: 1.1, max: 2.5 },
    radiusSol: { min: 0.00001, max: 0.00002 },
    luminositySol: { min: 0.00001, max: 0.001 },
    periodSeconds: { min: 0.001, max: 100 },
    periodDerivative: { min: 1e-20, max: 1e-10 },
    magneticFieldGauss: { min: 1e8, max: 1e13 },
    traits: ['radio-quiet', 'thermal X-ray emission', 'cooling neutron star', 'no detected beams'],
  },
}

export const XRB_SUBTYPE_PROFILES: Record<XrbSubtype, XrbSubtypeProfile> = {
  lmxb: {
    subtype: 'lmxb',
    color: 'blue-white',
    temperatureK: { min: 100000, max: 1000000 },
    massSol: { min: 1.2, max: 2.0 },
    radiusSol: { min: 0.00001, max: 0.00002 },
    luminositySol: { min: 0.001, max: 100 },
    xrayLuminosityErgs: { min: 1e36, max: 1e38 },
    accretionRateEddington: { min: 0.001, max: 1 },
    diskTemperatureK: { min: 1e6, max: 2e7 },
    hasJets: false,
    jetPowerErgs: { min: 1e30, max: 1e34 },
    traits: ['Roche lobe overflow', 'accretion disk', 'thermonuclear bursts (NS)', 'quasi-periodic oscillations', 'persistent or transient'],
  },
  hmxb: {
    subtype: 'hmxb',
    color: 'blue-white',
    temperatureK: { min: 100000, max: 1000000 },
    massSol: { min: 1.2, max: 2.0 },
    radiusSol: { min: 0.00001, max: 0.00002 },
    luminositySol: { min: 0.01, max: 1000 },
    xrayLuminosityErgs: { min: 1e35, max: 1e39 },
    accretionRateEddington: { min: 0.01, max: 10 },
    diskTemperatureK: { min: 1e7, max: 5e7 },
    hasJets: false,
    jetPowerErgs: { min: 1e32, max: 1e36 },
    traits: ['wind accretion or Roche lobe', 'pulsars (NS)', 'eclipses', 'superorbital periods', 'Be star decretion disk'],
  },
  microquasar: {
    subtype: 'microquasar',
    color: 'blue-white',
    temperatureK: { min: 100000, max: 1000000 },
    massSol: { min: 3, max: 15 },
    radiusSol: { min: 0.00001, max: 0.00005 },
    luminositySol: { min: 10, max: 10000 },
    xrayLuminosityErgs: { min: 1e37, max: 1e39 },
    accretionRateEddington: { min: 0.1, max: 10 },
    diskTemperatureK: { min: 1e7, max: 1e8 },
    hasJets: true,
    jetPowerErgs: { min: 1e36, max: 1e39 },
    traits: ['relativistic jets', 'superluminal motion', 'radio/X-ray correlation', 'state transitions', 'jet quenching in soft state'],
  },
  ultracompact: {
    subtype: 'ultracompact',
    color: 'blue-white',
    temperatureK: { min: 100000, max: 1000000 },
    massSol: { min: 1.2, max: 2.0 },
    radiusSol: { min: 0.00001, max: 0.00002 },
    luminositySol: { min: 0.0001, max: 10 },
    xrayLuminosityErgs: { min: 1e34, max: 1e37 },
    accretionRateEddington: { min: 1e-5, max: 0.1 },
    diskTemperatureK: { min: 1e6, max: 1e7 },
    hasJets: false,
    jetPowerErgs: { min: 1e28, max: 1e32 },
    traits: ['degenerate donor', 'gravitational wave source', 'very short period', 'helium/carbon-oxygen rich', 'AM CVn type'],
  },
  symbiotic: {
    subtype: 'symbiotic',
    color: 'blue-white',
    temperatureK: { min: 100000, max: 1000000 },
    massSol: { min: 1.2, max: 2.0 },
    radiusSol: { min: 0.00001, max: 0.00002 },
    luminositySol: { min: 0.0001, max: 1 },
    xrayLuminosityErgs: { min: 1e32, max: 1e36 },
    accretionRateEddington: { min: 1e-6, max: 0.01 },
    diskTemperatureK: { min: 1e5, max: 1e6 },
    hasJets: false,
    jetPowerErgs: { min: 1e28, max: 1e32 },
    traits: ['red giant donor', 'wind accretion', 'nebular emission', 'slow novae', 'wide orbit'],
  },
}

export const BLACK_HOLE_SUBTYPE_PROFILES: Record<BlackHoleSubtype, BlackHoleSubtypeProfile> = {
  normal: {
    subtype: 'normal',
    color: 'black',
    temperatureK: { min: 0, max: 0 },
    massSol: { min: 3, max: 100 },
    radiusSol: { min: 0, max: 0 },
    luminositySol: { min: 0, max: 0 },
    xrayLuminosityErgs: { min: 1e30, max: 1e34 },
    accretionRateEddington: { min: 1e-8, max: 1e-3 },
    diskTemperatureK: { min: 1e5, max: 1e6 },
    hasJets: false,
    jetPowerErgs: { min: 1e28, max: 1e32 },
    traits: ['quiescent', 'no significant accretion', 'dark'],
  },
  xrb: {
    subtype: 'xrb',
    color: 'black',
    temperatureK: { min: 0, max: 0 },
    massSol: { min: 3, max: 50 },
    radiusSol: { min: 0, max: 0 },
    luminositySol: { min: 0, max: 0 },
    xrayLuminosityErgs: { min: 1e36, max: 1e39 },
    accretionRateEddington: { min: 0.01, max: 10 },
    diskTemperatureK: { min: 1e6, max: 1e8 },
    hasJets: false,
    jetPowerErgs: { min: 1e32, max: 1e39 },
    traits: ['accretion-powered', 'X-ray bright', 'state transitions', 'jet launching (in microquasars)'],
  },
}

export const NEUTRON_STAR_SUBTYPES = Object.keys(NEUTRON_STAR_SUBTYPE_PROFILES) as NeutronStarSubtype[]
export const XRB_SUBTYPES = Object.keys(XRB_SUBTYPE_PROFILES) as XrbSubtype[]
export const BLACK_HOLE_SUBTYPES = Object.keys(BLACK_HOLE_SUBTYPE_PROFILES) as BlackHoleSubtype[]

export const STAR_CLASSES = Object.keys(STAR_CLASS_PROFILES) as StarClass[]
export const STAR_TYPES = Object.keys(STAR_TYPE_PROFILES) as Exclude<StarType, 'main-sequence'>[]
export const ALL_STAR_TYPES = ['main-sequence', ...STAR_TYPES] as StarType[]

export function getStarProfile(type: StarType, starClass?: StarClass) {
  if (type === 'main-sequence') {
    if (!starClass) throw new Error('main-sequence requires a starClass')
    return STAR_CLASS_PROFILES[starClass]
  }
  return STAR_TYPE_PROFILES[type]
}

export function getNeutronStarSubtypeProfile(subtype: NeutronStarSubtype): NeutronStarSubtypeProfile {
  return NEUTRON_STAR_SUBTYPE_PROFILES[subtype]
}

export function getXrbSubtypeProfile(subtype: XrbSubtype): XrbSubtypeProfile {
  return XRB_SUBTYPE_PROFILES[subtype]
}

export function getBlackHoleSubtypeProfile(subtype: BlackHoleSubtype): BlackHoleSubtypeProfile {
  return BLACK_HOLE_SUBTYPE_PROFILES[subtype]
}