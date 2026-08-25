import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { deriveId } from '../../src/primitives/id.ts'
import { anomalySchema } from '../../src/schemas/anomaly.ts'
import { galaxySchema } from '../../src/schemas/galaxy.ts'
import { planetSchema } from '../../src/schemas/planet.ts'
import { starSchema } from '../../src/schemas/star.ts'
import { starSystemSchema } from '../../src/schemas/star-system.ts'

const GALAXY_ID = 'gal-1a2b3c4d'

const validStar = {
  name: 'Cinderveil',
  description:
    'A calm orange ember burning quietly at the edge of a dense dust lane, its gentle gold light washing over a sparse retinue of ancient worlds.',
  tags: ['calm', 'long-lived'],
  class: 'K',
  temperatureK: 4400,
  massSol: 0.72,
  radiusSol: 0.81,
  luminositySol: 0.21,
}

const SYSTEM_ID = deriveId('starSystem', GALAXY_ID, 1200, -34000, 550)

const validPlanet = {
  name: 'Meridian Deep',
  description:
    'A world wrapped in one unbroken ocean, its storm-swept swells hiding abyssal trenches where bioluminescent currents drift like slow lightning.',
  tags: ['ocean', 'stormy'],
  id: deriveId('planet', SYSTEM_ID, 3),
  orbitIndex: 3,
  orbitalDistanceAu: 1.4,
  type: 'oceanic',
  radiusEarth: 1.3,
  gravityG: 1.1,
  meanTempC: 12,
  atmosphereDensity: 1.4,
  moonCount: 2,
  hasRings: false,
  life: 'complex',
}

const validSystem = {
  name: 'Halcyon Reach',
  description:
    'A quiet single-star system tucked against a dense dust lane. Its lone orange sun warms a modest retinue of worlds, two of which are charted by survey guilds.',
  tags: ['quiet', 'surveyed'],
  id: SYSTEM_ID,
  galaxyId: GALAXY_ID,
  coordinates: { x: 1200, y: -34000, z: 550 },
  ageBillionYears: 6.2,
  stars: [validStar],
  planetNameMapping: {
    [deriveId('planet', SYSTEM_ID, 3)]: 'Meridian Deep',
  },
}

const validGalaxy = {
  name: 'Vireth Shroud',
  description:
    'A vast barred spiral veiled in luminous dust, its arms studded with young clusters while the quiet core hides the oldest civilizations on record.',
  tags: ['spiral', 'dust-heavy'],
  id: GALAXY_ID,
  type: 'spiral',
  diameterLy: 84000,
  thicknessLy: 1400,
  estimatedStarCount: 210000000000,
}

const validAnomaly = {
  name: 'The Wound in Cassiopeia',
  description:
    'A slow gravitational maw drifting through the outer arm, bending starlight into rings and dragging comets into orbits that should not survive.',
  tags: ['lensing', 'uncharted'],
  id: 'anom-abcdef01',
  category: 'gravitational',
  dangerLevel: 'high',
  location: { scope: 'galaxy', coordinates: { x: 5000, y: 100, z: -2200 } },
  observedEffects: ['starlight bends into perfect rings', 'probes return with decayed orbits'],
  containmentPossible: false,
}

describe('galaxySchema', () => {
  it('accepts a well-formed galaxy', () => {
    assert.equal(galaxySchema.safeParse(validGalaxy).success, true)
  })

  it('rejects thickness greater than diameter', () => {
    const result = galaxySchema.safeParse({ ...validGalaxy, thicknessLy: 90000 })
    assert.equal(result.success, false)
  })

  it('rejects malformed ids', () => {
    const result = galaxySchema.safeParse({ ...validGalaxy, id: 'galaxy-1' })
    assert.equal(result.success, false)
  })
})

describe('starSchema', () => {
  it('accepts stats inside the declared class range', () => {
    assert.equal(starSchema.safeParse(validStar).success, true)
  })

  it('rejects stats outside the declared class range', () => {
    const result = starSchema.safeParse({ ...validStar, temperatureK: 9000 })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /outside K-class range/)
  })

  it('rejects unknown classes', () => {
    const result = starSchema.safeParse({ ...validStar, class: 'Z' })
    assert.equal(result.success, false)
  })
})

describe('planetSchema', () => {
  it('accepts stats inside the declared type profile', () => {
    assert.equal(planetSchema.safeParse(validPlanet).success, true)
  })

  it('rejects life above the type ceiling', () => {
    const result = planetSchema.safeParse({ ...validPlanet, type: 'desert', life: 'complex' })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /exceeds 'desert' ceiling/)
  })

  it('rejects moon counts outside the type range', () => {
    const result = planetSchema.safeParse({ ...validPlanet, moonCount: 50 })
    assert.equal(result.success, false)
  })
})

describe('starSystemSchema', () => {
  it('accepts a coherent system with planet name mapping', () => {
    assert.equal(starSystemSchema.safeParse(validSystem).success, true)
  })

  it('rejects planet ids in mapping not matching position-derived values', () => {
    const result = starSystemSchema.safeParse({
      ...validSystem,
      planetNameMapping: {
        'plnt-00000000': 'Invalid Planet',
      },
    })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /position-derived/)
  })

  it('caps stars at five', () => {
    const sixStars = Array.from({ length: 6 }, () => validStar)
    assert.equal(starSystemSchema.safeParse({ ...validSystem, stars: sixStars }).success, false)
  })
})

describe('anomalySchema', () => {
  it('accepts a galaxy-level anomaly', () => {
    assert.equal(anomalySchema.safeParse(validAnomaly).success, true)
  })

  it('accepts system- and planet-bound anomalies', () => {
    const boundToSystem = {
      ...validAnomaly,
      location: { scope: 'system', systemId: SYSTEM_ID },
    }
    const boundToPlanet = {
      ...validAnomaly,
      location: { scope: 'planet', planetId: validPlanet.id },
    }
    assert.equal(anomalySchema.safeParse(boundToSystem).success, true)
    assert.equal(anomalySchema.safeParse(boundToPlanet).success, true)
  })

  it('rejects unknown scopes', () => {
    const result = anomalySchema.safeParse({
      ...validAnomaly,
      location: { scope: 'universe' },
    })
    assert.equal(result.success, false)
  })

  it('rejects empty effect lists', () => {
    const result = anomalySchema.safeParse({ ...validAnomaly, observedEffects: [] })
    assert.equal(result.success, false)
  })
})
