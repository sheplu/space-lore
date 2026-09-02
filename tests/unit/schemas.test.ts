import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { deriveId } from '../../src/primitives/id.ts'
import { anomalySchema } from '../../src/schemas/anomaly.ts'
import { asteroidSchema } from '../../src/schemas/asteroid.ts'
import { beltSchema } from '../../src/schemas/belt.ts'
import { cometSchema } from '../../src/schemas/comet.ts'
import { dwarfPlanetSchema } from '../../src/schemas/dwarf-planet.ts'
import { galaxySchema } from '../../src/schemas/galaxy.ts'
import { planetSchema, isLifeLevel } from '../../src/schemas/planet.ts'
import { starSchema } from '../../src/schemas/star.ts'
import { starSystemSchema } from '../../src/schemas/star-system.ts'
import { loreFieldsSchema } from '../../src/schemas/common.ts'

const GALAXY_ID = 'gal-1a2b3c4d'

const validStar = {
  id: 'star-8a3f2e1d',
  name: 'Cinderveil',
  description:
    'A calm orange ember burning quietly at the edge of a dense dust lane, its gentle gold light washing over a sparse retinue of ancient worlds.',
  tags: ['calm', 'long-lived'],
  type: 'main-sequence',
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
  hasRings: false,
  life: 'complex',
  moons: [],
}

const validDwarfPlanet = {
  name: 'Ceres Prime',
  description: 'A dwarf planet in the asteroid belt, rocky and cratered, its differentiated interior hinting at a past when it nearly became a true planet before Jupiter stunted its growth.',
  tags: ['dwarf', 'rocky'],
  id: deriveId('dwarfPlanet', SYSTEM_ID, 4),
  orbitIndex: 4,
  orbitalDistanceAu: 2.8,
  type: 'rocky',
  radiusKm: 470,
  gravityG: 0.028,
  meanTempC: -100,
  hasAtmosphere: false,
  moonCount: 0,
}

const validAsteroid = {
  name: 'Vesta Minor',
  description: 'A large rocky asteroid in the inner belt, its silicate surface scarred by ancient impacts and rich in olivine and pyroxene minerals that hint at a differentiated past.',
  tags: ['asteroid', 'rocky'],
  id: deriveId('asteroid', SYSTEM_ID, 5),
  orbitIndex: 5,
  orbitalDistanceAu: 2.4,
  type: 'rocky',
  radiusKm: 260,
  massKg: 2.6e20,
  albedo: 0.3,
  rotationPeriodHours: 5.3,
}

const validBelt = {
  name: 'Main Belt',
  description: 'The primary asteroid belt between Mars and Jupiter, a vast ring of rocky and carbonaceous debris orbiting between the terrestrial and giant planets where collisional families and Kirkwood gaps mark the dynamical history of the system.',
  tags: ['belt', 'main'],
  id: deriveId('belt', SYSTEM_ID, 1),
  orbitIndex: 1,
  innerEdgeAu: 2.0,
  outerEdgeAu: 3.5,
  type: 'main',
  totalMassEarth: 0.0005,
  composition: ['rocky', 'carbonaceous'],
}

const validComet = {
  name: 'Halley Prime',
  description: 'A short-period comet with regular returns every 75 years, its icy nucleus shedding dust and gas to form a brilliant tail that has been recorded by astronomers for centuries across the system.',
  tags: ['comet', 'periodic'],
  id: deriveId('comet', SYSTEM_ID, 1),
  orbitIndex: 1,
  semiMajorAxisAu: 17.8,
  eccentricity: 0.967,
  inclinationDeg: 18,
  perihelionAu: 0.6,
  aphelionAu: 35.0,
  orbitalPeriodYears: 75.3,
  type: 'short-period',
  nucleusRadiusKm: 5.5,
  isActive: true,
  dustProductionRate: 100,
  gasProductionRate: 50,
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
  starOrbits: [{ index: 1, starIds: ['star-8a3f2e1d'] }],
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

  it('rejects negative diameter', () => {
    const result = galaxySchema.safeParse({ ...validGalaxy, diameterLy: -1 })
    assert.equal(result.success, false)
  })

  it('rejects zero star count', () => {
    const result = galaxySchema.safeParse({ ...validGalaxy, estimatedStarCount: 0 })
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
    assert.match(JSON.stringify(result.error?.issues), /outside main-sequence-K range/)
  })

  it('rejects unknown classes', () => {
    const result = starSchema.safeParse({ ...validStar, class: 'Z' })
    assert.equal(result.success, false)
  })

  it('rejects negative temperature', () => {
    const result = starSchema.safeParse({ ...validStar, temperatureK: -100 })
    assert.equal(result.success, false)
  })

  it('rejects zero mass', () => {
    const result = starSchema.safeParse({ ...validStar, massSol: 0 })
    assert.equal(result.success, false)
  })

  it('rejects negative luminosity', () => {
    const result = starSchema.safeParse({ ...validStar, luminositySol: -1 })
    assert.equal(result.success, false)
  })
})

describe('neutronStarSubtypes', () => {
  const baseLore = {
    name: 'Test Star',
    description: 'A test neutron star for validation, with all required lore fields properly filled to meet minimum length requirements.',
    tags: ['test'],
  }

  const validRadioPulsar = {
    ...baseLore,
    id: 'star-8a3f2e1d',
    name: 'PSR Test',
    description: 'A rapidly rotating radio pulsar with precise period timing, its beams sweeping the void like a cosmic lighthouse.',
    tags: ['pulsar', 'radio'],
    type: 'neutron-star',
    subtype: 'radio-pulsar',
    temperatureK: 500000,
    massSol: 1.4,
    radiusSol: 0.000015,
    luminositySol: 0.0001,
    periodSeconds: 0.1,
    periodDerivative: 1e-15,
    magneticFieldGauss: 1e12,
  }

  const validMagnetar = {
    ...baseLore,
    id: 'star-9b4e3f2c',
    name: 'SGR Test',
    description: 'An ultra-magnetized neutron star prone to violent starquakes and gamma-ray bursts, its field twisting the vacuum itself.',
    tags: ['magnetar', 'burst'],
    type: 'neutron-star',
    subtype: 'magnetar',
    temperatureK: 500000,
    massSol: 1.5,
    radiusSol: 0.000015,
    luminositySol: 0.01,
    periodSeconds: 8,
    periodDerivative: 1e-11,
    magneticFieldGauss: 1e15,
  }

  const validXRayPulsar = {
    ...baseLore,
    id: 'star-7c3d2e1b',
    name: 'X-ray Pulsar Test',
    description: 'An accretion-powered X-ray pulsar in a high-mass binary, its jets carving cavities in the surrounding nebula.',
    tags: ['x-ray', 'binary'],
    type: 'neutron-star',
    subtype: 'x-ray-pulsar',
    temperatureK: 500000,
    massSol: 1.4,
    radiusSol: 0.000015,
    luminositySol: 0.5,
    periodSeconds: 100,
    periodDerivative: 1e-12,
    magneticFieldGauss: 1e12,
  }

  const validNormalNS = {
    ...baseLore,
    id: 'star-6d2c1b0a',
    name: 'Silent Neutron Star',
    description: 'A cooling neutron star with no detected beams, its thermal glow fading slowly in the darkness.',
    tags: ['cooling', 'radio-quiet'],
    type: 'neutron-star',
    subtype: 'normal',
    temperatureK: 500000,
    massSol: 1.4,
    radiusSol: 0.000015,
    luminositySol: 0.0001,
    periodSeconds: 10,
    periodDerivative: 1e-15,
    magneticFieldGauss: 1e10,
  }

  it('accepts a valid radio pulsar', () => {
    assert.equal(starSchema.safeParse(validRadioPulsar).success, true)
  })

  it('accepts a valid magnetar', () => {
    assert.equal(starSchema.safeParse(validMagnetar).success, true)
  })

  it('accepts a valid X-ray pulsar', () => {
    assert.equal(starSchema.safeParse(validXRayPulsar).success, true)
  })

  it('accepts a valid normal neutron star', () => {
    assert.equal(starSchema.safeParse(validNormalNS).success, true)
  })

  it('rejects radio pulsar with period outside range', () => {
    const result = starSchema.safeParse({ ...validRadioPulsar, periodSeconds: 20 })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /outside neutron-star-radio-pulsar range/)
  })

  it('rejects magnetar with magnetic field too low', () => {
    const result = starSchema.safeParse({ ...validMagnetar, magneticFieldGauss: 1e13 })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /outside neutron-star-magnetar range/)
  })

  it('rejects X-ray pulsar with luminosity outside range', () => {
    const result = starSchema.safeParse({ ...validXRayPulsar, luminositySol: 10 })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /outside neutron-star-x-ray-pulsar range/)
  })

  it('rejects normal neutron star with periodDerivative outside range', () => {
    const result = starSchema.safeParse({ ...validNormalNS, periodDerivative: 1e-9 })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /outside neutron-star-normal range/)
  })

  it('rejects unknown neutron star subtype', () => {
    const result = starSchema.safeParse({ ...validRadioPulsar, subtype: 'unknown' })
    assert.equal(result.success, false)
  })

  it('defaults subtype to normal when not provided', () => {
    const noSubtype = { ...validNormalNS }
    delete noSubtype.subtype
    const result = starSchema.safeParse(noSubtype)
    assert.equal(result.success, true)
    assert.equal(result.data?.subtype, 'normal')
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

  it('rejects radius below type minimum', () => {
    const result = planetSchema.safeParse({ ...validPlanet, type: 'gas-giant', radiusEarth: 1 })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /radiusEarth=1 outside 'gas-giant' range/)
  })

  it('rejects radius above type maximum', () => {
    const result = planetSchema.safeParse({ ...validPlanet, type: 'rocky', radiusEarth: 10 })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /radiusEarth=10 outside 'rocky' range/)
  })

  it('rejects gravity below type minimum', () => {
    const result = planetSchema.safeParse({ ...validPlanet, type: 'terrestrial', gravityG: 0.1 })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /gravityG=0.1 outside 'terrestrial' range/)
  })

  it('rejects gravity above type maximum', () => {
    const result = planetSchema.safeParse({ ...validPlanet, type: 'rocky', gravityG: 10 })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /gravityG=10 outside 'rocky' range/)
  })

  it('rejects temperature below type minimum', () => {
    const result = planetSchema.safeParse({ ...validPlanet, type: 'oceanic', meanTempC: -200 })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /meanTempC=-200 outside 'oceanic' range/)
  })

  it('rejects temperature above type maximum', () => {
    const result = planetSchema.safeParse({ ...validPlanet, type: 'frozen', meanTempC: 100 })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /meanTempC=100 outside 'frozen' range/)
  })

  it('rejects atmosphere density below type minimum', () => {
    const result = planetSchema.safeParse({ ...validPlanet, type: 'oceanic', atmosphereDensity: 0 })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /atmosphereDensity=0 outside 'oceanic' range/)
  })

  it('rejects atmosphere density above type maximum', () => {
    const result = planetSchema.safeParse({ ...validPlanet, type: 'rocky', atmosphereDensity: 10 })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /atmosphereDensity=10 outside 'rocky' range/)
  })

  it('rejects unknown planet type', () => {
    const result = planetSchema.safeParse({ ...validPlanet, type: 'unknown-type' })
    assert.equal(result.success, false)
  })

  it('rejects zero orbitIndex', () => {
    const result = planetSchema.safeParse({ ...validPlanet, orbitIndex: 0 })
    assert.equal(result.success, false)
  })

  it('rejects negative orbital distance', () => {
    const result = planetSchema.safeParse({ ...validPlanet, orbitalDistanceAu: -1 })
    assert.equal(result.success, false)
  })

  it('rejects duplicate moon orbitIndex', () => {
    const moonBase = {
      name: 'Test Moon',
      description: 'A test moon for validation.',
      tags: ['test'],
    }
    const duplicateMoons = [
      { ...moonBase, id: 'moon-aaaaaaaa', planetId: validPlanet.id, orbitIndex: 1, orbitalDistanceKm: 1000, type: 'rocky' as const, radiusKm: 500, gravityG: 0.01, hasAtmosphere: false },
      { ...moonBase, id: 'moon-bbbbbbbb', planetId: validPlanet.id, orbitIndex: 1, orbitalDistanceKm: 2000, type: 'icy' as const, radiusKm: 800, gravityG: 0.02, hasAtmosphere: false },
    ]
    const result = planetSchema.safeParse({ ...validPlanet, moons: duplicateMoons })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /moon orbitIndex values must be unique/)
  })

  it('rejects moon with mismatched planetId', () => {
    const moonBase = {
      name: 'Test Moon',
      description: 'A test moon for validation.',
      tags: ['test'],
    }
    const badMoon = { ...moonBase, id: 'moon-aaaaaaaa', planetId: 'plnt-00000000', orbitIndex: 1, orbitalDistanceKm: 1000, type: 'rocky' as const, radiusKm: 500, gravityG: 0.01, hasAtmosphere: false }
    const result = planetSchema.safeParse({ ...validPlanet, moons: [badMoon] })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /moon planetId .* does not match parent planet id/)
  })

  it('rejects moon with invalid type', () => {
    const moonBase = {
      name: 'Test Moon',
      description: 'A test moon for validation.',
      tags: ['test'],
    }
    const badMoon = { ...moonBase, id: 'moon-aaaaaaaa', planetId: validPlanet.id, orbitIndex: 1, orbitalDistanceKm: 1000, type: 'invalid-type' as any, radiusKm: 500, gravityG: 0.01, hasAtmosphere: false }
    const result = planetSchema.safeParse({ ...validPlanet, moons: [badMoon] })
    assert.equal(result.success, false)
  })

  it('rejects moon with negative radius', () => {
    const moonBase = {
      name: 'Test Moon',
      description: 'A test moon for validation.',
      tags: ['test'],
    }
    const badMoon = { ...moonBase, id: 'moon-aaaaaaaa', planetId: validPlanet.id, orbitIndex: 1, orbitalDistanceKm: 1000, type: 'rocky' as const, radiusKm: -100, gravityG: 0.01, hasAtmosphere: false }
    const result = planetSchema.safeParse({ ...validPlanet, moons: [badMoon] })
    assert.equal(result.success, false)
  })

  it('rejects unknown planet type at enum level', () => {
    const result = planetSchema.safeParse({ ...validPlanet, type: 'unknown-type' as any })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /Invalid option/)
  })
})

describe('isLifeLevel', () => {
  it('returns true for valid life levels', () => {
    assert.equal(isLifeLevel('none'), true)
    assert.equal(isLifeLevel('microbial'), true)
    assert.equal(isLifeLevel('simple'), true)
    assert.equal(isLifeLevel('complex'), true)
    assert.equal(isLifeLevel('intelligent'), true)
  })

  it('returns false for invalid life levels', () => {
    assert.equal(isLifeLevel(''), false)
    assert.equal(isLifeLevel('unknown'), false)
    assert.equal(isLifeLevel(123), false)
    assert.equal(isLifeLevel(null), false)
    assert.equal(isLifeLevel(undefined), false)
  })
})

describe('beltSchema', () => {
  it('accepts a valid belt', () => {
    assert.equal(beltSchema.safeParse(validBelt).success, true)
  })

  it('rejects innerEdgeAu >= outerEdgeAu', () => {
    const result = beltSchema.safeParse({ ...validBelt, innerEdgeAu: 3.5, outerEdgeAu: 2.0 })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /innerEdgeAu must be less than outerEdgeAu/)
  })

  it('rejects equal inner and outer edge', () => {
    const result = beltSchema.safeParse({ ...validBelt, innerEdgeAu: 2.5, outerEdgeAu: 2.5 })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /innerEdgeAu must be less than outerEdgeAu/)
  })

  it('rejects negative innerEdgeAu', () => {
    const result = beltSchema.safeParse({ ...validBelt, innerEdgeAu: -1 })
    assert.equal(result.success, false)
  })

  it('rejects zero totalMassEarth', () => {
    const result = beltSchema.safeParse({ ...validBelt, totalMassEarth: 0 })
    assert.equal(result.success, false)
  })

  it('rejects empty composition array', () => {
    const result = beltSchema.safeParse({ ...validBelt, composition: [] })
    assert.equal(result.success, false)
  })

  it('rejects invalid belt type', () => {
    const result = beltSchema.safeParse({ ...validBelt, type: 'invalid' })
    assert.equal(result.success, false)
  })

  it('rejects zero orbitIndex', () => {
    const result = beltSchema.safeParse({ ...validBelt, orbitIndex: 0 })
    assert.equal(result.success, false)
  })
})

describe('cometSchema', () => {
  it('accepts a valid comet', () => {
    assert.equal(cometSchema.safeParse(validComet).success, true)
  })

  it('rejects perihelionAu >= aphelionAu', () => {
    const result = cometSchema.safeParse({ ...validComet, perihelionAu: 10, aphelionAu: 5 })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /perihelionAu must be less than aphelionAu/)
  })

  it('rejects equal perihelion and aphelion', () => {
    const result = cometSchema.safeParse({ ...validComet, perihelionAu: 5, aphelionAu: 5 })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /perihelionAu must be less than aphelionAu/)
  })

  it('rejects eccentricity < 0', () => {
    const result = cometSchema.safeParse({ ...validComet, eccentricity: -0.1 })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /eccentricity must be between 0 and 1/)
  })

  it('rejects eccentricity > 1', () => {
    const result = cometSchema.safeParse({ ...validComet, eccentricity: 1.5 })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /eccentricity must be between 0 and 1/)
  })

  it('rejects negative semiMajorAxisAu', () => {
    const result = cometSchema.safeParse({ ...validComet, semiMajorAxisAu: -1 })
    assert.equal(result.success, false)
  })

  it('rejects inclinationDeg > 180', () => {
    const result = cometSchema.safeParse({ ...validComet, inclinationDeg: 200 })
    assert.equal(result.success, false)
  })

  it('rejects negative inclinationDeg', () => {
    const result = cometSchema.safeParse({ ...validComet, inclinationDeg: -10 })
    assert.equal(result.success, false)
  })

  it('rejects negative orbitalPeriodYears', () => {
    const result = cometSchema.safeParse({ ...validComet, orbitalPeriodYears: -1 })
    assert.equal(result.success, false)
  })

  it('rejects negative nucleusRadiusKm', () => {
    const result = cometSchema.safeParse({ ...validComet, nucleusRadiusKm: -1 })
    assert.equal(result.success, false)
  })

  it('rejects invalid comet type', () => {
    const result = cometSchema.safeParse({ ...validComet, type: 'invalid' })
    assert.equal(result.success, false)
  })

  it('rejects zero orbitIndex', () => {
    const result = cometSchema.safeParse({ ...validComet, orbitIndex: 0 })
    assert.equal(result.success, false)
  })
})

describe('asteroidSchema', () => {
  it('accepts a valid asteroid', () => {
    assert.equal(asteroidSchema.safeParse(validAsteroid).success, true)
  })

  it('rejects negative radiusKm', () => {
    const result = asteroidSchema.safeParse({ ...validAsteroid, radiusKm: -1 })
    assert.equal(result.success, false)
  })

  it('rejects negative massKg', () => {
    const result = asteroidSchema.safeParse({ ...validAsteroid, massKg: -1 })
    assert.equal(result.success, false)
  })

  it('rejects albedo > 1', () => {
    const result = asteroidSchema.safeParse({ ...validAsteroid, albedo: 1.5 })
    assert.equal(result.success, false)
  })

  it('rejects albedo < 0', () => {
    const result = asteroidSchema.safeParse({ ...validAsteroid, albedo: -0.1 })
    assert.equal(result.success, false)
  })

  it('rejects negative rotationPeriodHours', () => {
    const result = asteroidSchema.safeParse({ ...validAsteroid, rotationPeriodHours: -1 })
    assert.equal(result.success, false)
  })

  it('rejects invalid asteroid type', () => {
    const result = asteroidSchema.safeParse({ ...validAsteroid, type: 'invalid' })
    assert.equal(result.success, false)
  })
})

describe('dwarfPlanetSchema', () => {
  it('accepts a valid dwarf planet', () => {
    assert.equal(dwarfPlanetSchema.safeParse(validDwarfPlanet).success, true)
  })

  it('rejects negative radiusKm', () => {
    const result = dwarfPlanetSchema.safeParse({ ...validDwarfPlanet, radiusKm: -1 })
    assert.equal(result.success, false)
  })

  it('rejects negative gravityG', () => {
    const result = dwarfPlanetSchema.safeParse({ ...validDwarfPlanet, gravityG: -0.1 })
    assert.equal(result.success, false)
  })

  it('rejects moonCount > 5', () => {
    const result = dwarfPlanetSchema.safeParse({ ...validDwarfPlanet, moonCount: 10 })
    assert.equal(result.success, false)
  })

  it('rejects negative moonCount', () => {
    const result = dwarfPlanetSchema.safeParse({ ...validDwarfPlanet, moonCount: -1 })
    assert.equal(result.success, false)
  })

  it('rejects invalid dwarf planet type', () => {
    const result = dwarfPlanetSchema.safeParse({ ...validDwarfPlanet, type: 'invalid' })
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
      starOrbits: [{ index: 1, starIds: ['star-8a3f2e1d'] }],
      planetNameMapping: {
        'plnt-00000000': 'Invalid Planet',
      },
    })
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /position-derived/)
  })

  it('caps stars at five', () => {
    const sixStars = Array.from({ length: 6 }, (_, i) => ({ ...validStar, id: `star-${i}abcdef0` }))
    assert.equal(starSystemSchema.safeParse({ ...validSystem, stars: sixStars }).success, false)
  })

  it('rejects duplicate orbitIndex across body types', () => {
    const systemWithConflict = {
      ...validSystem,
      starOrbits: [{ index: 1, starIds: ['star-8a3f2e1d'] }],
      planets: [{ ...validPlanet, id: 'plnt-11111111', orbitIndex: 1 }],
      dwarfPlanets: [{ ...validDwarfPlanet, id: 'dwpl-22222222', orbitIndex: 1 }],
    }
    const result = starSystemSchema.safeParse(systemWithConflict)
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /orbitIndex 1 is used by multiple bodies/)
  })

  it('rejects duplicate orbitIndex between planet and asteroid', () => {
    const systemWithConflict = {
      ...validSystem,
      starOrbits: [{ index: 1, starIds: ['star-8a3f2e1d'] }],
      planets: [{ ...validPlanet, id: 'plnt-11111111', orbitIndex: 2 }],
      asteroids: [{ ...validAsteroid, id: 'ast-22222222', orbitIndex: 2 }],
    }
    const result = starSystemSchema.safeParse(systemWithConflict)
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /orbitIndex 2 is used by multiple bodies/)
  })

  it('rejects duplicate orbitIndex between planet and belt', () => {
    const systemWithConflict = {
      ...validSystem,
      starOrbits: [{ index: 1, starIds: ['star-8a3f2e1d'] }],
      planets: [{ ...validPlanet, id: 'plnt-11111111', orbitIndex: 3 }],
      belts: [{ ...validBelt, id: 'belt-22222222', orbitIndex: 3 }],
    }
    const result = starSystemSchema.safeParse(systemWithConflict)
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /orbitIndex 3 is used by multiple bodies/)
  })

  it('rejects duplicate orbitIndex between planet and comet', () => {
    const systemWithConflict = {
      ...validSystem,
      starOrbits: [{ index: 1, starIds: ['star-8a3f2e1d'] }],
      planets: [{ ...validPlanet, id: 'plnt-11111111', orbitIndex: 4 }],
      comets: [{ ...validComet, id: 'com-22222222', orbitIndex: 4 }],
    }
    const result = starSystemSchema.safeParse(systemWithConflict)
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /orbitIndex 4 is used by multiple bodies/)
  })

  it('rejects duplicate orbitIndex between dwarfPlanet and asteroid', () => {
    const systemWithConflict = {
      ...validSystem,
      starOrbits: [{ index: 1, starIds: ['star-8a3f2e1d'] }],
      dwarfPlanets: [{ ...validDwarfPlanet, id: 'dwpl-11111111', orbitIndex: 5 }],
      asteroids: [{ ...validAsteroid, id: 'ast-22222222', orbitIndex: 5 }],
    }
    const result = starSystemSchema.safeParse(systemWithConflict)
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /orbitIndex 5 is used by multiple bodies/)
  })

  it('accepts same orbitIndex for different body types that are not present', () => {
    const systemWithDifferent = {
      ...validSystem,
      starOrbits: [{ index: 1, starIds: ['star-8a3f2e1d'] }],
      planets: [{ ...validPlanet, id: 'plnt-11111111', orbitIndex: 1 }],
      asteroids: [{ ...validAsteroid, id: 'ast-22222222', orbitIndex: 2 }],
    }
    const result = starSystemSchema.safeParse(systemWithDifferent)
    assert.equal(result.success, true)
  })

  it('rejects belt with largestBodyId not in asteroids', () => {
    const systemWithBadRef = {
      ...validSystem,
      starOrbits: [{ index: 1, starIds: ['star-8a3f2e1d'] }],
      belts: [{ ...validBelt, id: 'belt-11111111', largestBodyId: 'ast-nonexistent' }],
      asteroids: [validAsteroid],
    }
    const result = starSystemSchema.safeParse(systemWithBadRef)
    assert.equal(result.success, false)
    assert.match(JSON.stringify(result.error?.issues), /belt 'belt-11111111' references largestBodyId 'ast-nonexistent' which does not exist/)
  })

  it('accepts belt with largestBodyId referencing existing asteroid', () => {
    const systemWithGoodRef = {
      ...validSystem,
      starOrbits: [{ index: 1, starIds: ['star-8a3f2e1d'] }],
      belts: [{ ...validBelt, id: 'belt-11111111', largestBodyId: validAsteroid.id }],
      asteroids: [validAsteroid],
    }
    const result = starSystemSchema.safeParse(systemWithGoodRef)
    assert.equal(result.success, true)
  })

  it('accepts belt without largestBodyId', () => {
    const systemWithoutRef = {
      ...validSystem,
      starOrbits: [{ index: 1, starIds: ['star-8a3f2e1d'] }],
      belts: [{ ...validBelt, id: 'belt-11111111' }],
      asteroids: [],
    }
    const result = starSystemSchema.safeParse(systemWithoutRef)
    assert.equal(result.success, true)
  })

  it('rejects negative ageBillionYears', () => {
    const result = starSystemSchema.safeParse({ ...validSystem, ageBillionYears: -1 })
    assert.equal(result.success, false)
  })

  it('rejects ageBillionYears > 13.8', () => {
    const result = starSystemSchema.safeParse({ ...validSystem, ageBillionYears: 14 })
    assert.equal(result.success, false)
  })

  it('rejects zero stars', () => {
    const result = starSystemSchema.safeParse({ ...validSystem, stars: [] })
    assert.equal(result.success, false)
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

  it('rejects too many effects', () => {
    const result = anomalySchema.safeParse({ ...validAnomaly, observedEffects: Array.from({ length: 11 }, (_, i) => `effect ${i}`) })
    assert.equal(result.success, false)
  })

  it('rejects empty effect string', () => {
    const result = anomalySchema.safeParse({ ...validAnomaly, observedEffects: [''] })
    assert.equal(result.success, false)
  })

  it('rejects negative danger level (invalid enum)', () => {
    const result = anomalySchema.safeParse({ ...validAnomaly, dangerLevel: 'super-extreme' as any })
    assert.equal(result.success, false)
  })

  it('rejects invalid category (invalid enum)', () => {
    const result = anomalySchema.safeParse({ ...validAnomaly, category: 'made-up' as any })
    assert.equal(result.success, false)
  })
})