import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { STAR_CLASS_PROFILES, STAR_CLASSES, STAR_TYPE_PROFILES, STAR_TYPES, NEUTRON_STAR_SUBTYPE_PROFILES } from '../../src/taxonomy/star-classes.ts'
import { PLANET_TYPE_PROFILES, PLANET_TYPES } from '../../src/taxonomy/planet-types.ts'
import { starSchema } from '../../src/schemas/star.ts'
import { planetSchema } from '../../src/schemas/planet.ts'
import { deriveId } from '../../src/primitives/id.ts'

function midRange(range: { min: number; max: number }): number {
  return range.min + (range.max - range.min) / 2
}

const STAR_SYSTEM_ID = deriveId('starSystem', 'gal-00000000', 1, 2, 3)

describe('starSchema × taxonomy matrix', () => {
  it('accepts mid-range stats for every class', () => {
    for (const cls of STAR_CLASSES) {
      const p = STAR_CLASS_PROFILES[cls]
      const star = {
        id: deriveId('star', STAR_SYSTEM_ID, cls),
        name: `Matrix Star ${cls}`,
        description:
          'A synthetic calibration star whose physical statistics sit exactly at the midpoint of its spectral class ranges.',
        tags: ['matrix'],
        type: 'main-sequence',
        class: cls,
        temperatureK: midRange(p.temperatureK),
        massSol: midRange(p.massSol),
        radiusSol: midRange(p.radiusSol),
        luminositySol: Math.max(0, midRange(p.luminositySol)),
      }
      const result = starSchema.safeParse(star)
      assert.equal(result.success, true, `${cls}: ${JSON.stringify(result.error?.issues)}`)
    }
  })

  it('rejects every stat pushed beyond its class maximum', () => {
    for (const cls of STAR_CLASSES) {
      const p = STAR_CLASS_PROFILES[cls]
      const base = {
        id: deriveId('star', STAR_SYSTEM_ID, cls),
        name: `Overrun ${cls}`,
        description:
          'A deliberately impossible star whose temperature alone exceeds the ceiling of its declared spectral class.',
        tags: ['invalid'],
        type: 'main-sequence',
        class: cls,
        temperatureK: p.temperatureK.max + 1,
        massSol: midRange(p.massSol),
        radiusSol: midRange(p.radiusSol),
        luminositySol: midRange(p.luminositySol),
      }
      assert.equal(starSchema.safeParse(base).success, false, `${cls} must reject over-max temperature`)
    }
  })

  it('rejects every stat dropped below its class minimum', () => {
    for (const cls of STAR_CLASSES) {
      const p = STAR_CLASS_PROFILES[cls]
      const base = {
        id: deriveId('star', STAR_SYSTEM_ID, cls),
        name: `Underrun ${cls}`,
        description:
          'A deliberately impossible star whose luminosity alone falls beneath the floor of its declared spectral class.',
        tags: ['invalid'],
        type: 'main-sequence',
        class: cls,
        temperatureK: midRange(p.temperatureK),
        massSol: midRange(p.massSol),
        radiusSol: midRange(p.radiusSol),
        luminositySol: p.luminositySol.min - 1,
      }
      assert.equal(starSchema.safeParse(base).success, false, `${cls} must reject under-min luminosity`)
    }
  })

  it('accepts mid-range stats for every compact star type', () => {
    for (const type of STAR_TYPES) {
      const p = STAR_TYPE_PROFILES[type]
      const star: Record<string, unknown> = {
        id: deriveId('star', STAR_SYSTEM_ID, type),
        name: `Matrix Star ${type}`,
        description:
          `A synthetic calibration ${type} whose physical statistics sit exactly at the midpoint of its type ranges.`,
        tags: ['matrix'],
        type,
        temperatureK: midRange(p.temperatureK),
        massSol: midRange(p.massSol),
        radiusSol: midRange(p.radiusSol),
        luminositySol: Math.max(0, midRange(p.luminositySol)),
      }
      // For neutron-star, use x-ray-pulsar subtype which has widest ranges
      if (type === 'neutron-star') {
        const sp = NEUTRON_STAR_SUBTYPE_PROFILES['x-ray-pulsar']
        star.subtype = 'x-ray-pulsar'
        star.temperatureK = midRange(sp.temperatureK)
        star.massSol = midRange(sp.massSol)
        star.radiusSol = midRange(sp.radiusSol)
        star.luminositySol = midRange(sp.luminositySol)
        star.periodSeconds = midRange(sp.periodSeconds)
        star.periodDerivative = midRange(sp.periodDerivative)
        star.magneticFieldGauss = midRange(sp.magneticFieldGauss)
      }
      const result = starSchema.safeParse(star)
      assert.equal(result.success, true, `${type}: ${JSON.stringify(result.error?.issues)}`)
    }
  })

  it('rejects stats pushed beyond compact star type maximums', () => {
    for (const type of STAR_TYPES) {
      const p = STAR_TYPE_PROFILES[type]
      const base = {
        id: deriveId('star', STAR_SYSTEM_ID, type),
        name: `Overrun ${type}`,
        description:
          `A deliberately impossible ${type} whose temperature alone exceeds the ceiling of its declared type.`,
        tags: ['invalid'],
        type,
        temperatureK: p.temperatureK.max + 1,
        massSol: midRange(p.massSol),
        radiusSol: midRange(p.radiusSol),
        luminositySol: midRange(p.luminositySol),
      }
      assert.equal(starSchema.safeParse(base).success, false, `${type} must reject over-max temperature`)
    }
  })

  it('rejects stats dropped below compact star type minimums', () => {
    for (const type of STAR_TYPES) {
      const p = STAR_TYPE_PROFILES[type]
      // For black-hole, luminosity min is 0, so test temperature instead
      const fieldToTest = type === 'black-hole' ? 'temperatureK' : 'luminositySol'
      const base = {
        id: deriveId('star', STAR_SYSTEM_ID, type),
        name: `Underrun ${type}`,
        description:
          `A deliberately impossible ${type} whose stats fall beneath the floor of its declared type.`,
        tags: ['invalid'],
        type,
        temperatureK: midRange(p.temperatureK),
        massSol: midRange(p.massSol),
        radiusSol: midRange(p.radiusSol),
        luminositySol: Math.max(0, midRange(p.luminositySol)),
      }
      if (fieldToTest === 'temperatureK') {
        base.temperatureK = p.temperatureK.min - 1
      } else {
        base.luminositySol = Math.max(0, p.luminositySol.min - 1)
      }
      assert.equal(starSchema.safeParse(base).success, false, `${type} must reject under-min ${fieldToTest}`)
    }
  })

  it('rejects main-sequence star without class field', () => {
    const star = {
      id: deriveId('star', STAR_SYSTEM_ID, 'test'),
      name: 'Invalid Star',
      description: 'A main-sequence star missing required class field, but description is long enough to pass validation.',
      tags: ['invalid'],
      type: 'main-sequence',
      temperatureK: 5700,
      massSol: 1,
      radiusSol: 1,
      luminositySol: 1,
    }
    const result = starSchema.safeParse(star)
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /Invalid option: expected one of/)
  })

  it('rejects compact star with class field', () => {
    const star = {
      id: deriveId('star', STAR_SYSTEM_ID, 'test'),
      name: 'Invalid Star',
      description: 'A white-dwarf incorrectly given a spectral class.',
      tags: ['invalid'],
      type: 'white-dwarf',
      class: 'G',
      temperatureK: 10000,
      massSol: 0.6,
      radiusSol: 0.01,
      luminositySol: 0.01,
    }
    const result = starSchema.safeParse(star)
    assert.equal(result.success, false)
  })
})

describe('planetSchema × taxonomy matrix', () => {
  const planetShell = (type: (typeof PLANET_TYPES)[number], overrides: Record<string, unknown> = {}) => ({
    name: `Matrix World ${type}`,
    description:
      'A synthetic calibration planet whose physical statistics sit exactly at the midpoint of its declared type profile.',
    tags: ['matrix'],
    id: 'plnt-00000000',
    orbitIndex: 1,
    orbitalDistanceAu: 1,
    type,
    radiusEarth: midRange(PLANET_TYPE_PROFILES[type].radiusEarth),
    gravityG: midRange(PLANET_TYPE_PROFILES[type].gravityG),
    meanTempC: midRange(PLANET_TYPE_PROFILES[type].meanTempC),
    atmosphereDensity: midRange(PLANET_TYPE_PROFILES[type].atmosphereDensity),
    hasRings: false,
    life: PLANET_TYPE_PROFILES[type].lifeCeiling,
    moons: [],
    ...overrides,
  })

  it('accepts mid-range stats with life exactly at the ceiling for every type', () => {
    for (const type of PLANET_TYPES) {
      const result = planetSchema.safeParse(planetShell(type))
      assert.equal(result.success, true, `${type}: ${JSON.stringify(result.error?.issues)}`)
    }
  })

  it('rejects life one rank above each type ceiling where possible', () => {
    const ranks = ['none', 'microbial', 'simple', 'complex', 'intelligent']
    for (const type of PLANET_TYPES) {
      const ceilingRank = ranks.indexOf(PLANET_TYPE_PROFILES[type].lifeCeiling)
      if (ceilingRank === ranks.length - 1) continue
      const above = ranks[ceilingRank + 1]
      const result = planetSchema.safeParse(planetShell(type, { life: above }))
      assert.equal(result.success, false, `${type} must reject life '${above}' above ceiling`)
    }
  })

  it('rejects radius pushed beyond each type maximum', () => {
    for (const type of PLANET_TYPES) {
      const result = planetSchema.safeParse(
        planetShell(type, { radiusEarth: PLANET_TYPE_PROFILES[type].radiusEarth.max + 1 }),
      )
      assert.equal(result.success, false, `${type} must reject over-max radius`)
    }
  })
})
