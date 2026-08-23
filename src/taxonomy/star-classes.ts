export interface Range {
  min: number
  max: number
}

export type StarClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M'

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

export const STAR_CLASSES = Object.keys(STAR_CLASS_PROFILES) as StarClass[]
