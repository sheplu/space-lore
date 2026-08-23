import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { deriveId } from '../../src/primitives/id.ts'
import { detectKind, validateContentDir, validateJsonFile } from '../../src/validate/validate.ts'

const GALAXY_ID = deriveId('galaxy', 'test-galaxy')
const SYSTEM_ID = deriveId('starSystem', GALAXY_ID, 1000, 2000, -500)
const PLANET_ID = deriveId('planet', SYSTEM_ID, 1)

function galaxyFixture() {
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
        name: 'Probe Light',
        description:
          'A steady orange dwarf kept perfectly calm for testing purposes, radiating a predictable and gentle golden glow.',
        tags: ['calm'],
        class: 'K',
        temperatureK: 4500,
        massSol: 0.7,
        radiusSol: 0.8,
        luminositySol: 0.2,
      },
    ],
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
        moonCount: 0,
        hasRings: false,
        life: 'none',
      },
    ],
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

describe('detectKind', () => {
  it('maps paths onto content kinds by directory layout', () => {
    const root = mkdtempSync(join(tmpdir(), 'space-lore-detect-'))
    try {
      const galDir = join(root, GALAXY_ID)
      assert.equal(detectKind(join(galDir, 'galaxy.json')), 'galaxy')
      assert.equal(detectKind(join(galDir, 'systems', `${SYSTEM_ID}.json`)), 'starSystem')
      assert.equal(detectKind(join(galDir, 'anomalies', 'anom-12345678.json')), 'anomaly')
      assert.equal(detectKind(join(root, 'random.json')), null)
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
      mkdirSync(join(scratch, 'systems'), { recursive: true })
      const path = join(scratch, 'systems', 'broken.json')
      writeFileSync(path, JSON.stringify(broken))
      const result = validateJsonFile(path)
      assert.equal(result.ok, false)
      assert.match(result.issues.map((i) => i.message).join('\n'), /outside K-class range/)
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
    const far = systemFixture()
    far.id = deriveId('starSystem', GALAXY_ID, 99000, 0, 0)
    far.coordinates = { x: 99000, y: 0, z: 0 }
    ;(far.planets[0] as { id: string }).id = deriveId('planet', far.id, 1)
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
})
