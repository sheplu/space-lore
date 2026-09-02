import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { deriveId } from '../../src/primitives/id.ts'
import { coordinatesSchema } from '../../src/primitives/coords.ts'
import type { Moon } from '../../src/schemas/moon.ts'
import type { Galaxy } from '../../src/schemas/galaxy.ts'
import { detectKind, validateContentDir, validateJsonFile } from '../../src/validate/validate.ts'

const GALAXY_ID = deriveId('galaxy', 'test-galaxy')
const SYSTEM_ID = deriveId('starSystem', GALAXY_ID, 1000, 2000, -500)
const STAR_ID = deriveId('star', SYSTEM_ID, 1)
const PLANET_ID = deriveId('planet', SYSTEM_ID, 1)
const DWARF_PLANET_ID = deriveId('dwarfPlanet', SYSTEM_ID, 2)
const ASTEROID_ID = deriveId('asteroid', SYSTEM_ID, 3)
const BELT_ID = deriveId('belt', SYSTEM_ID, 1)
const COMET_ID = deriveId('comet', SYSTEM_ID, 1)
const NEBULA_ID = deriveId('nebula', GALAXY_ID, 5000, -10000, 200)
const CLUSTER_ID = deriveId('cluster', GALAXY_ID, -8000, 12000, -300)
const SNR_ID = deriveId('snr', GALAXY_ID, 12000, -5000, 100)

function galaxyFixture(): Galaxy {
  return {
    name: 'Test Spiral',
    description:
      'A compact spiral galaxy used for validation testing, its two arms winding around a bright luminous core of ancient stars.',
    tags: ['test'],
    id: GALAXY_ID,
    type: 'spiral',
    diameterLy: 20000,
    thicknessLy: 800,
    estimatedStarCount: 50000000000,
    agn: {
      type: 'seyfert-1',
      blackHoleMassSol: 1e7,
      eddingtonRatio: 0.1,
      bolometricLuminosityErgs: 1e44,
      xrayLuminosityErgs: 1e43,
      radioLuminosityErgs: 1e40,
      jetPowerErgs: 1e42,
      variabilityTimescaleDays: 100,
      openingAngleDeg: 45,
      lorenztFactor: 2,
      traits: ['broad emission lines', 'unobscured BLR', 'strong UV/X-ray continuum'],
      observedEffects: ['broad H-beta', 'strong X-ray continuum'],
      dangerLevel: 'moderate',
    },
  }
}

function systemFixture() {
  return {
    name: 'Validation Reach',
    description:
      'A deliberately plain star system whose only purpose is exercising the validation pipeline end to end without surprises.',
    tags: ['test'],
    id: SYSTEM_ID,
    galaxyId: GALAXY_ID,
    coordinates: { x: 1000, y: 2000, z: -500 },
    ageBillionYears: 5,
    stars: [
      {
        id: STAR_ID,
        name: 'Probe Light',
        description:
          'A steady orange dwarf kept perfectly calm for testing purposes, radiating a predictable and gentle golden glow.',
        tags: ['calm'],
        type: 'main-sequence',
        class: 'K',
        temperatureK: 4500,
        massSol: 0.7,
        radiusSol: 0.8,
        luminositySol: 0.2,
      },
    ],
    starOrbits: [{ index: 1, starIds: [STAR_ID] }],
    planets: [
      {
        name: 'Checkerboard',
        description:
          'A cracked rocky test world with no atmosphere to speak of, its silent cratered surface used as a validation fixture.',
        tags: ['barren'],
        id: PLANET_ID,
        orbitIndex: 1,
        orbitalDistanceAu: 0.7,
        type: 'rocky',
        radiusEarth: 0.8,
        gravityG: 0.6,
        meanTempC: 10,
        atmosphereDensity: 0.2,
        hasRings: false,
        life: 'none',
        moons: [],
      },
    ],
    dwarfPlanets: [
      {
        ...dwarfPlanetFixture(),
        orbitIndex: 2,
      },
    ],
    asteroids: [
      {
        ...asteroidFixture(),
        orbitIndex: 3,
      },
    ],
    belts: [
      {
        ...beltFixture(),
        orbitIndex: 4,
      },
    ],
    comets: [
      {
        ...cometFixture(),
        orbitIndex: 5,
      },
    ],
    planetNameMapping: {
      [PLANET_ID]: 'Checkerboard',
    },
  }
}

function anomalyFixture() {
  return {
    name: 'The Test Rift',
    description:
      'A harmless spatial wrinkle opened purely for testing, folding a few meters of empty space into an inconvenient knot.',
    tags: ['benign'],
    id: deriveId('anomaly', SYSTEM_ID),
    category: 'spatial',
    dangerLevel: 'low',
    location: { scope: 'system', systemId: SYSTEM_ID },
    observedEffects: ['compasses disagree politely'],
    containmentPossible: true,
  }
}

function dwarfPlanetFixture() {
  return {
    name: 'Ceres Test',
    description: 'A small rocky dwarf planet in the test system, its cratered surface used for validation of taxonomy ranges.',
    tags: ['test', 'dwarf'],
    id: DWARF_PLANET_ID,
    orbitIndex: 2,
    orbitalDistanceAu: 2.8,
    type: 'rocky',
    radiusKm: 470,
    gravityG: 0.028,
    meanTempC: -100,
    hasAtmosphere: false,
    moonCount: 0,
  }
}

function asteroidFixture() {
  return {
    name: 'Vesta Test',
    description: 'A large rocky asteroid in the inner belt, its silicate surface scarred by ancient impacts for testing validation.',
    tags: ['test', 'asteroid'],
    id: ASTEROID_ID,
    orbitIndex: 3,
    orbitalDistanceAu: 2.4,
    type: 'rocky',
    radiusKm: 260,
    massKg: 2.6e20,
    albedo: 0.3,
    rotationPeriodHours: 5.3,
  }
}

function beltFixture() {
  return {
    name: 'Main Test Belt',
    description: 'A test asteroid belt between the terrestrial and giant planets, containing rocky and carbonaceous debris for validation.',
    tags: ['test', 'belt'],
    id: BELT_ID,
    orbitIndex: 1,
    innerEdgeAu: 2.0,
    outerEdgeAu: 3.5,
    type: 'main',
    totalMassEarth: 0.0005,
    largestBodyId: undefined as string | undefined,
    composition: ['rocky', 'carbonaceous'],
  }
}

function cometFixture() {
  return {
    name: 'Halley Test',
    description: 'A short-period test comet with regular returns, its icy nucleus shedding dust and gas to form a brilliant tail for validation.',
    tags: ['test', 'comet'],
    id: COMET_ID,
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
}

function nebulaFixture() {
  return {
    name: 'Test Emission Nebula',
    description: 'A glowing test nebula of ionized hydrogen energized by nearby hot stars, its red H-alpha emission serving as a validation fixture for taxonomy ranges.',
    tags: ['test', 'emission'],
    id: NEBULA_ID,
    galaxyId: GALAXY_ID,
    type: 'emission',
    coordinates: { x: 5000, y: -10000, z: 200 },
    radiusLy: 25,
    temperatureK: 10000,
    densityCm3: 100,
    massSol: 5000,
    ionizationLevel: 0.5,
    magneticFieldMicroG: 10,
    composition: ['hydrogen', 'helium', 'oxygen'],
    containedSystemIds: [],
    starFormationActivity: 'moderate',
    colorPalette: ['#ff3300', '#ff6600', '#cc2200'],
    ageMyr: 5,
    observedEffects: ['faint radio emission', 'optical H-alpha glow'],
    dangerLevel: 'moderate',
  }
}

function clusterFixture() {
  return {
    name: 'Test Globular Cluster',
    description: 'An ancient globular cluster orbiting in the galactic halo, its dense core packed with metal-poor stars and a swarm of RR Lyrae variables marking its great age.',
    tags: ['test', 'globular', 'ancient'],
    id: CLUSTER_ID,
    galaxyId: GALAXY_ID,
    type: 'globular',
    coordinates: { x: -8000, y: 12000, z: -300 },
    ageGyr: 12,
    massSol: 200000,
    coreRadiusLy: 3,
    tidalRadiusLy: 80,
    metallicityFeH: -1.5,
    concentration: 1.5,
    velocityDispersionKms: 10,
    stellarDensityCore: 10000,
    stellarDensityHalfMass: 1000,
    memberSystemIds: [],
    traits: ['ancient population', 'metal-poor', 'RR Lyrae variables'],
    observedEffects: ['dense core', 'tidal tails'],
  }
}

function snrFixture() {
  return {
    name: 'Test Young SNR',
    description: 'A young supernova remnant in free-expansion phase, its ejecta still racing outward at thousands of kilometers per second, glowing brightly in X-rays from reverse-shocked iron and silicon.',
    tags: ['test', 'young', 'free-expansion'],
    id: SNR_ID,
    galaxyId: GALAXY_ID,
    type: 'young',
    coordinates: { x: 12000, y: -5000, z: 100 },
    ageYr: 500,
    radiusLy: 3,
    expansionVelocityKms: 10000,
    temperatureK: 50000000,
    luminosityXrayErgs: 1e36,
    luminosityRadioErgs: 1e27,
    magneticFieldMicroG: 100,
    densityCm3: 1,
    sweptUpMassSol: 1,
    ejectaMassSol: 5,
    composition: ['iron', 'silicon', 'sulfur', 'oxygen'],
    shockStage: 'free-expansion',
    hasPulsar: false,
    hasPwn: false,
    centralPulsarId: undefined as string | undefined,
    traits: ['free-expansion phase', 'reverse shock heating ejecta', 'bright X-ray line emission'],
    observedEffects: ['cosmic-ray acceleration', 'non-thermal X-ray tails'],
    dangerLevel: 'high',
  }
}

describe('detectKind', () => {
  it('maps paths onto content kinds by directory layout', () => {
    const root = mkdtempSync(join(tmpdir(), 'space-lore-detect-'))
    try {
      const galDir = join(root, GALAXY_ID)
      assert.equal(detectKind(join(galDir, 'galaxy.json')), 'galaxy')
      assert.equal(detectKind(join(galDir, 'systems', `${SYSTEM_ID}.json`)), 'starSystem')
      assert.equal(detectKind(join(galDir, 'anomalies', 'anom-12345678.json')), 'anomaly')
      assert.equal(detectKind(join(root, 'random.json')), null)
      // Body files in /body/ folder
      assert.equal(detectKind(join(galDir, 'systems', `${SYSTEM_ID}.json`, 'bodies', `${PLANET_ID}.json`)), 'planet')
      assert.equal(detectKind(join(galDir, 'systems', `${SYSTEM_ID}.json`, 'bodies', `${PLANET_ID}.json`)), 'planet')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('validateJsonFile over a content tree', () => {
  const root = mkdtempSync(join(tmpdir(), 'space-lore-validate-'))
  const galDir = join(root, GALAXY_ID)

  after(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('accepts every file of a coherent tree', () => {
    mkdirSync(join(galDir, 'systems'), { recursive: true })
    mkdirSync(join(galDir, 'anomalies'), { recursive: true })
    writeFileSync(join(galDir, 'galaxy.json'), JSON.stringify(galaxyFixture()))
    writeFileSync(join(galDir, 'systems', `${SYSTEM_ID}.json`), JSON.stringify(systemFixture()))
    writeFileSync(
      join(galDir, 'anomalies', `${deriveId('anomaly', SYSTEM_ID)}.json`),
      JSON.stringify(anomalyFixture()),
    )
    for (const file of ['galaxy.json', `systems/${SYSTEM_ID}.json`, `anomalies/${deriveId('anomaly', SYSTEM_ID)}.json`]) {
      const result = validateJsonFile(join(galDir, ...file.split('/')))
      assert.equal(result.ok, true, `${file}: ${JSON.stringify(result.issues)}`)
    }
  })

  it('reports malformed JSON as a file-level failure', () => {
    mkdirSync(join(galDir, 'anomalies'), { recursive: true })
    const path = join(galDir, 'anomalies', 'anom-deadbeef.json')
    writeFileSync(path, '{not json')
    const result = validateJsonFile(path)
    assert.equal(result.ok, false)
    rmSync(path)
  })

  it('reports schema violations with field paths', () => {
    const scratch = mkdtempSync(join(tmpdir(), 'space-lore-scratch-'))
    try {
      const broken = JSON.parse(JSON.stringify(systemFixture()))
      broken.stars[0].temperatureK = 99999
      mkdirSync(join(scratch, 'quadrants', 'inner', 'systems'), { recursive: true })
      const path = join(scratch, 'quadrants', 'inner', 'systems', 'sys-deadbeef.json')
      writeFileSync(path, JSON.stringify(broken))
      const result = validateJsonFile(path)
      assert.equal(result.ok, false)
      assert.match(result.issues.map((i) => i.message).join('\n'), /outside main-sequence-K range/)
    } finally {
      rmSync(scratch, { recursive: true, force: true })
    }
  })

  it('rejects files whose kind cannot be detected', () => {
    const scratch = mkdtempSync(join(tmpdir(), 'space-lore-scratch-'))
    try {
      const path = join(scratch, 'mystery.json')
      writeFileSync(path, '{}')
      assert.equal(validateJsonFile(path).ok, false)
    } finally {
      rmSync(scratch, { recursive: true, force: true })
    }
  })
})

describe('validateContentDir cross-file checks', () => {
  const root = mkdtempSync(join(tmpdir(), 'space-lore-content-'))
  const galDir = join(root, GALAXY_ID)

  after(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('passes a fully coherent content tree', () => {
    mkdirSync(join(galDir, 'systems'), { recursive: true })
    mkdirSync(join(galDir, 'anomalies'), { recursive: true })
    writeFileSync(join(galDir, 'galaxy.json'), JSON.stringify(galaxyFixture()))
    writeFileSync(join(galDir, 'systems', `${SYSTEM_ID}.json`), JSON.stringify(systemFixture()))
    writeFileSync(
      join(galDir, 'anomalies', `${deriveId('anomaly', SYSTEM_ID)}.json`),
      JSON.stringify(anomalyFixture()),
    )
    const report = validateContentDir(root)
    assert.equal(report.ok, true, JSON.stringify(report.files.flatMap((f) => f.issues)))
  })

  it('flags systems referencing unknown galaxies', () => {
    const broken = systemFixture()
    broken.galaxyId = 'gal-00000000'
    const path = join(galDir, 'systems', 'sys-11111111.json')
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /unknown galaxyId 'gal-00000000'/)
    } finally {
      rmSync(path)
    }
  })

  it('flags anomalies pointing at missing planets', () => {
    const broken: Record<string, unknown> = JSON.parse(JSON.stringify(anomalyFixture()))
    broken.location = { scope: 'planet', planetId: 'plnt-22222222' }
    const path = join(galDir, 'anomalies', 'anom-33333333.json')
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /planetId 'plnt-22222222' not found/)
    } finally {
      rmSync(path)
    }
  })

  it('flags anomalies pointing at missing systems', () => {
    const broken: Record<string, unknown> = JSON.parse(JSON.stringify(anomalyFixture()))
    broken.location = { scope: 'system', systemId: 'sys-55555555' }
    const path = join(galDir, 'anomalies', 'anom-66666666.json')
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /systemId 'sys-55555555' not found/)
    } finally {
      rmSync(path)
    }
  })

  it('flags systems outside the parent galaxy radius', () => {
    const far = {
      ...systemFixture(),
      id: deriveId('starSystem', GALAXY_ID, 99000, 0, 0),
      coordinates: { x: 99000, y: 0, z: 0 },
      planetNameMapping: {
        [deriveId('planet', deriveId('starSystem', GALAXY_ID, 99000, 0, 0), 1)]: 'Far Planet',
      },
      planets: [
        {
          ...systemFixture().planets[0],
          id: deriveId('planet', deriveId('starSystem', GALAXY_ID, 99000, 0, 0), 1),
        },
      ],
    }
    const path = join(galDir, 'systems', `${far.id}.json`)
    writeFileSync(path, JSON.stringify(far))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /exceed 'Test Spiral' radius/)
    } finally {
      rmSync(path)
    }
  })

  it('flags belt with innerEdgeAu >= outerEdgeAu', () => {
    const broken = systemFixture()
    broken.belts = [{ ...beltFixture(), innerEdgeAu: 3.5, outerEdgeAu: 2.0 }]
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /innerEdgeAu must be less than outerEdgeAu/)
    } finally {
      rmSync(path)
    }
  })

  it('flags belt with equal inner and outer edge', () => {
    const broken = systemFixture()
    broken.belts = [{ ...beltFixture(), innerEdgeAu: 2.5, outerEdgeAu: 2.5 }]
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /innerEdgeAu must be less than outerEdgeAu/)
    } finally {
      rmSync(path)
    }
  })

  it('flags comet with perihelionAu >= aphelionAu', () => {
    const broken = systemFixture()
    broken.comets = [{ ...cometFixture(), perihelionAu: 10, aphelionAu: 5 }]
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /perihelionAu must be less than aphelionAu/)
    } finally {
      rmSync(path)
    }
  })

  it('flags comet with eccentricity > 1', () => {
    const broken = systemFixture()
    broken.comets = [{ ...cometFixture(), eccentricity: 1.5 }]
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /eccentricity must be between 0 and 1/)
    } finally {
      rmSync(path)
    }
  })

  it('flags comet with eccentricity < 0', () => {
    const broken = systemFixture()
    broken.comets = [{ ...cometFixture(), eccentricity: -0.1 }]
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /eccentricity must be between 0 and 1/)
    } finally {
      rmSync(path)
    }
  })

  it('flags planet with radius below type minimum', () => {
    const broken = systemFixture()
    broken.planets = [{ ...broken.planets[0], type: 'gas-giant', radiusEarth: 1 }]
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /radiusEarth=1 outside 'gas-giant' range/)
    } finally {
      rmSync(path)
    }
  })

  it('flags planet with gravity below type minimum', () => {
    const broken = systemFixture()
    broken.planets = [{ ...broken.planets[0], type: 'terrestrial', gravityG: 0.1 }]
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /gravityG=0.1 outside 'terrestrial' range/)
    } finally {
      rmSync(path)
    }
  })

  it('flags planet with temperature below type minimum', () => {
    const broken = systemFixture()
    broken.planets = [{ ...broken.planets[0], type: 'oceanic', meanTempC: -200 }]
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /meanTempC=-200 outside 'oceanic' range/)
    } finally {
      rmSync(path)
    }
  })

  it('flags planet with atmosphere density below type minimum', () => {
    const broken = systemFixture()
    broken.planets = [{ ...broken.planets[0], type: 'oceanic', atmosphereDensity: 0 }]
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /atmosphereDensity=0 outside 'oceanic' range/)
    } finally {
      rmSync(path)
    }
  })

  it('flags planet with life above type ceiling', () => {
    const broken = systemFixture()
    broken.planets = [{ ...broken.planets[0], type: 'desert', life: 'complex' }]
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /exceeds 'desert' ceiling/)
    } finally {
      rmSync(path)
    }
  })

it('flags duplicate moon orbitIndex', () => {
    const moonBase = {
      name: 'Test Moon',
      description: 'A test moon for validation purposes, its surface pockmarked with craters from ancient impacts.',
      tags: ['test'],
    }
    const moon1 = { ...moonBase, id: 'moon-aaaaaaaa', planetId: PLANET_ID, orbitIndex: 1, orbitalDistanceKm: 1000, type: 'rocky' as const, radiusKm: 500, gravityG: 0.01, hasAtmosphere: false }
    const moon2 = { ...moonBase, id: 'moon-bbbbbbbb', planetId: PLANET_ID, orbitIndex: 1, orbitalDistanceKm: 2000, type: 'icy' as const, radiusKm: 800, gravityG: 0.02, hasAtmosphere: false }
    const broken = {
      ...systemFixture(),
      planets: [
        {
          ...systemFixture().planets[0],
          moons: [moon1, moon2],
        },
      ],
    }
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /moon orbitIndex values must be unique/)
    } finally {
      rmSync(path)
    }
  })

it('flags moon with mismatched planetId', () => {
    const moonBase = {
      name: 'Test Moon',
      description: 'A test moon for validation purposes, its surface pockmarked with craters from ancient impacts.',
      tags: ['test'],
    }
    const moon1 = { ...moonBase, id: 'moon-aaaaaaaa', planetId: 'plnt-00000000', orbitIndex: 1, orbitalDistanceKm: 1000, type: 'rocky' as const, radiusKm: 500, gravityG: 0.01, hasAtmosphere: false }
    const broken = {
      ...systemFixture(),
      planets: [
        {
          ...systemFixture().planets[0],
          moons: [moon1],
        },
      ],
    }
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /moon planetId .* does not match parent planet id/)
    } finally {
      rmSync(path)
    }
  })

  it('flags duplicate orbitIndex between planet and dwarf planet', () => {
    const broken = systemFixture()
    broken.planets = [{ ...broken.planets[0], id: 'plnt-11111111', orbitIndex: 2 }]
    broken.dwarfPlanets = [{ ...dwarfPlanetFixture(), id: 'dwpl-22222222', orbitIndex: 2 }]
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /orbitIndex 2 is used by multiple bodies/)
    } finally {
      rmSync(path)
    }
  })

  it('flags duplicate orbitIndex between planet and asteroid', () => {
    const broken = systemFixture()
    broken.planets = [{ ...broken.planets[0], id: 'plnt-11111111', orbitIndex: 3 }]
    broken.asteroids = [{ ...asteroidFixture(), id: 'ast-22222222', orbitIndex: 3 }]
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /orbitIndex 3 is used by multiple bodies/)
    } finally {
      rmSync(path)
    }
  })

  it('flags duplicate orbitIndex between planet and belt', () => {
    const broken = systemFixture()
    broken.planets = [{ ...broken.planets[0], id: 'plnt-11111111', orbitIndex: 1 }]
    broken.belts = [{ ...beltFixture(), id: 'belt-22222222', orbitIndex: 1 }]
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /orbitIndex 1 is used by multiple bodies/)
    } finally {
      rmSync(path)
    }
  })

  it('flags duplicate orbitIndex between planet and comet', () => {
    const broken = systemFixture()
    broken.planets = [{ ...broken.planets[0], id: 'plnt-11111111', orbitIndex: 4 }]
    broken.comets = [{ ...cometFixture(), id: 'com-22222222', orbitIndex: 4 }]
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /orbitIndex 4 is used by multiple bodies/)
    } finally {
      rmSync(path)
    }
  })

  it('flags duplicate orbitIndex between dwarfPlanet and asteroid', () => {
    const broken = systemFixture()
    broken.dwarfPlanets = [{ ...dwarfPlanetFixture(), id: 'dwpl-11111111', orbitIndex: 5 }]
    broken.asteroids = [{ ...asteroidFixture(), id: 'ast-22222222', orbitIndex: 5 }]
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /orbitIndex 5 is used by multiple bodies/)
    } finally {
      rmSync(path)
    }
  })

  it('flags belt with largestBodyId not in asteroids', () => {
    const broken = systemFixture()
    broken.belts = [{ ...beltFixture(), id: 'belt-11111111', largestBodyId: 'ast-nonexistent' as string }]
    broken.asteroids = [asteroidFixture()]
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /belt 'belt-11111111' references largestBodyId 'ast-nonexistent' which does not exist/)
    } finally {
      rmSync(path)
    }
  })

  it('flags planetNameMapping with invalid derived id', () => {
    const broken = systemFixture()
    broken.planetNameMapping = { 'plnt-00000000': 'Invalid Planet' }
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
      assert.match(report.files.flatMap((f) => f.issues).map((i) => i.message).join('\n'), /position-derived/)
    } finally {
      rmSync(path)
    }
  })

  it('flags system with negative age', () => {
    const broken = systemFixture()
    broken.ageBillionYears = -1
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
    } finally {
      rmSync(path)
    }
  })

  it('flags system with age > 13.8', () => {
    const broken = systemFixture()
    broken.ageBillionYears = 14
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
    } finally {
      rmSync(path)
    }
  })

  it('flags system with zero stars', () => {
    const broken = systemFixture()
    broken.stars = []
    const path = join(galDir, 'systems', `${SYSTEM_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const report = validateContentDir(root)
      assert.equal(report.ok, false)
    } finally {
      rmSync(path)
    }
  })

  it('accepts a valid nebula in nebulae directory', () => {
    mkdirSync(join(galDir, 'nebulae'), { recursive: true })
    writeFileSync(join(galDir, 'nebulae', `${NEBULA_ID}.json`), JSON.stringify(nebulaFixture()))
    const result = validateJsonFile(join(galDir, 'nebulae', `${NEBULA_ID}.json`))
    assert.equal(result.ok, true, JSON.stringify(result.issues))
    assert.equal(result.kind, 'nebula')
  })

  it('rejects nebula with temperature outside type range', () => {
    mkdirSync(join(galDir, 'nebulae'), { recursive: true })
    const broken = nebulaFixture()
    broken.temperatureK = 5000 // too low for emission
    const path = join(galDir, 'nebulae', `${NEBULA_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const result = validateJsonFile(path)
      assert.equal(result.ok, false)
      assert.match(result.issues.map((i) => i.message).join('\n'), /outside emission nebula range/)
    } finally {
      rmSync(path)
    }
  })

  it('rejects nebula with starFormationActivity not matching type profile', () => {
    mkdirSync(join(galDir, 'nebulae'), { recursive: true })
    const broken = nebulaFixture()
    broken.starFormationActivity = 'extreme' // emission should be moderate
    const path = join(galDir, 'nebulae', `${NEBULA_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const result = validateJsonFile(path)
      assert.equal(result.ok, false)
      assert.match(result.issues.map((i) => i.message).join('\n'), /does not match emission profile/)
    } finally {
      rmSync(path)
    }
  })

  it('rejects nebula with colorPalette not matching type profile', () => {
    mkdirSync(join(galDir, 'nebulae'), { recursive: true })
    const broken = nebulaFixture()
    broken.colorPalette = ['#0000ff', '#0000aa', '#000088'] // blue, not red
    const path = join(galDir, 'nebulae', `${NEBULA_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const result = validateJsonFile(path)
      assert.equal(result.ok, false)
      assert.match(result.issues.map((i) => i.message).join('\n'), /should include at least one color/)
    } finally {
      rmSync(path)
    }
  })

  it('detects nebula kind from path', () => {
    assert.equal(detectKind(join(galDir, 'nebulae', 'neb-12345678.json')), 'nebula')
    assert.equal(detectKind(join(galDir, 'anomalies', 'anom-12345678.json')), 'anomaly')
  })

  it('accepts a valid cluster in clusters directory', () => {
    mkdirSync(join(galDir, 'clusters'), { recursive: true })
    writeFileSync(join(galDir, 'clusters', `${CLUSTER_ID}.json`), JSON.stringify(clusterFixture()))
    const result = validateJsonFile(join(galDir, 'clusters', `${CLUSTER_ID}.json`))
    assert.equal(result.ok, true, JSON.stringify(result.issues))
    assert.equal(result.kind, 'cluster')
  })

  it('rejects cluster with age outside type range', () => {
    mkdirSync(join(galDir, 'clusters'), { recursive: true })
    const broken = clusterFixture()
    broken.ageGyr = 5 // too young for globular
    const path = join(galDir, 'clusters', `${CLUSTER_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const result = validateJsonFile(path)
      assert.equal(result.ok, false)
      assert.match(result.issues.map((i) => i.message).join('\n'), /outside globular cluster range/)
    } finally {
      rmSync(path)
    }
  })

  it('rejects cluster with coreRadiusLy >= tidalRadiusLy', () => {
    mkdirSync(join(galDir, 'clusters'), { recursive: true })
    const broken = clusterFixture()
    broken.coreRadiusLy = 100 // larger than tidal radius
    const path = join(galDir, 'clusters', `${CLUSTER_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const result = validateJsonFile(path)
      assert.equal(result.ok, false)
      assert.match(result.issues.map((i) => i.message).join('\n'), /coreRadiusLy must be less than tidalRadiusLy/)
    } finally {
      rmSync(path)
    }
  })

  it('rejects cluster with traits not matching type profile', () => {
    mkdirSync(join(galDir, 'clusters'), { recursive: true })
    const broken = clusterFixture()
    broken.traits = ['young', 'gas-rich'] // not globular traits
    const path = join(galDir, 'clusters', `${CLUSTER_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const result = validateJsonFile(path)
      assert.equal(result.ok, false)
      assert.match(result.issues.map((i) => i.message).join('\n'), /should include at least one from globular profile/)
    } finally {
      rmSync(path)
    }
  })

  it('detects cluster kind from path', () => {
    assert.equal(detectKind(join(galDir, 'clusters', 'clu-12345678.json')), 'cluster')
    assert.equal(detectKind(join(galDir, 'nebulae', 'neb-12345678.json')), 'nebula')
    assert.equal(detectKind(join(galDir, 'anomalies', 'anom-12345678.json')), 'anomaly')
  })

  it('accepts a valid SNR in snr directory', () => {
    mkdirSync(join(galDir, 'snr'), { recursive: true })
    writeFileSync(join(galDir, 'snr', `${SNR_ID}.json`), JSON.stringify(snrFixture()))
    const result = validateJsonFile(join(galDir, 'snr', `${SNR_ID}.json`))
    assert.equal(result.ok, true, JSON.stringify(result.issues))
    assert.equal(result.kind, 'snr')
  })

  it('rejects SNR with age outside type range', () => {
    mkdirSync(join(galDir, 'snr'), { recursive: true })
    const broken = snrFixture()
    broken.ageYr = 50000 // too old for young
    const path = join(galDir, 'snr', `${SNR_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const result = validateJsonFile(path)
      assert.equal(result.ok, false)
      assert.match(result.issues.map((i) => i.message).join('\n'), /outside young SNR range/)
    } finally {
      rmSync(path)
    }
  })

  it('rejects SNR with shockStage not matching type profile', () => {
    mkdirSync(join(galDir, 'snr'), { recursive: true })
    const broken = snrFixture()
    broken.shockStage = 'radiative' // young should be free-expansion
    const path = join(galDir, 'snr', `${SNR_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const result = validateJsonFile(path)
      assert.equal(result.ok, false)
      assert.match(result.issues.map((i) => i.message).join('\n'), /does not match young profile/)
    } finally {
      rmSync(path)
    }
  })

  it('rejects SNR with hasPulsar not matching type profile', () => {
    mkdirSync(join(galDir, 'snr'), { recursive: true })
    const broken = snrFixture()
    broken.hasPulsar = true // young should not have pulsar
    const path = join(galDir, 'snr', `${SNR_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const result = validateJsonFile(path)
      assert.equal(result.ok, false)
      assert.match(result.issues.map((i) => i.message).join('\n'), /does not match young profile/)
    } finally {
      rmSync(path)
    }
  })

  it('rejects SNR with hasPwn not matching type profile', () => {
    mkdirSync(join(galDir, 'snr'), { recursive: true })
    const broken = snrFixture()
    broken.hasPwn = true // young should not have PWN
    const path = join(galDir, 'snr', `${SNR_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const result = validateJsonFile(path)
      assert.equal(result.ok, false)
      assert.match(result.issues.map((i) => i.message).join('\n'), /does not match young profile/)
    } finally {
      rmSync(path)
    }
  })

  it('rejects SNR with hasPulsar=true but missing centralPulsarId', () => {
    mkdirSync(join(galDir, 'snr'), { recursive: true })
    const broken = snrFixture()
    broken.hasPulsar = true
    broken.centralPulsarId = undefined
    const path = join(galDir, 'snr', `${SNR_ID}.json`)
    writeFileSync(path, JSON.stringify(broken))
    try {
      const result = validateJsonFile(path)
      assert.equal(result.ok, false)
      assert.match(result.issues.map((i) => i.message).join('\n'), /centralPulsarId required/)
    } finally {
      rmSync(path)
    }
  })

  it('detects SNR kind from path', () => {
    assert.equal(detectKind(join(galDir, 'snr', 'snr-12345678.json')), 'snr')
    assert.equal(detectKind(join(galDir, 'clusters', 'clu-12345678.json')), 'cluster')
    assert.equal(detectKind(join(galDir, 'nebulae', 'neb-12345678.json')), 'nebula')
    assert.equal(detectKind(join(galDir, 'anomalies', 'anom-12345678.json')), 'anomaly')
  })

  it('accepts a galaxy with valid AGN', () => {
    const result = validateJsonFile(join(galDir, 'galaxy.json'))
    assert.equal(result.ok, true, JSON.stringify(result.issues))
    assert.equal(result.kind, 'galaxy')
  })

  it('rejects galaxy with AGN blackHoleMassSol outside type range', () => {
    const broken = galaxyFixture()
    broken.agn = { ...broken.agn!, blackHoleMassSol: 1e5 } // too low for seyfert-1
    writeFileSync(join(galDir, 'galaxy.json'), JSON.stringify(broken))
    const result = validateJsonFile(join(galDir, 'galaxy.json'))
    assert.equal(result.ok, false)
    assert.match(result.issues.map((i) => i.message).join('\n'), /outside seyfert-1 AGN range/)
  })

  it('rejects galaxy with AGN eddingtonRatio outside type range', () => {
    const broken = galaxyFixture()
    broken.agn = { ...broken.agn!, eddingtonRatio: 5 } // too high
    writeFileSync(join(galDir, 'galaxy.json'), JSON.stringify(broken))
    const result = validateJsonFile(join(galDir, 'galaxy.json'))
    assert.equal(result.ok, false)
    assert.match(result.issues.map((i) => i.message).join('\n'), /outside seyfert-1 AGN range/)
  })

  it('rejects galaxy with AGN traits not matching type profile', () => {
    const broken = galaxyFixture()
    broken.agn = { ...broken.agn!, traits: ['weak lines', 'no BLR'] } // not seyfert-1 traits
    writeFileSync(join(galDir, 'galaxy.json'), JSON.stringify(broken))
    const result = validateJsonFile(join(galDir, 'galaxy.json'))
    assert.equal(result.ok, false)
    assert.match(result.issues.map((i) => i.message).join('\n'), /should include at least one from seyfert-1 profile/)
  })

  it('accepts a galaxy without AGN', () => {
    const noAgn = galaxyFixture()
    noAgn.agn = undefined
    writeFileSync(join(galDir, 'galaxy.json'), JSON.stringify(noAgn))
    const result = validateJsonFile(join(galDir, 'galaxy.json'))
    assert.equal(result.ok, true, JSON.stringify(result.issues))
  })
})
