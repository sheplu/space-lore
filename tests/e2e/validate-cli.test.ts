import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, describe, it } from 'node:test'
import { deriveId } from '../../src/primitives/id.ts'

const run = promisify(execFile)
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const validateCli = join(repoRoot, 'src', 'cli', 'validate.ts')
const seededGalaxyDir = join(repoRoot, 'content', 'gal-1dcef06b')

const scratchRoots: string[] = []

after(() => {
  for (const root of scratchRoots) rmSync(root, { recursive: true, force: true })
})

const SYSTEM_ID = deriveId('starSystem', 'gal-aaaaaaaa', 100, -200, 50)
const PLANET_ID = deriveId('planet', SYSTEM_ID, 1)

function makeScratch(galaxyJson: string, systemJson?: string): string {
  const root = mkdtempSync(join(tmpdir(), 'space-lore-e2e-'))
  scratchRoots.push(root)
  const galId = 'gal-aaaaaaaa'
  const galDir = join(root, 'content', galId)
  mkdirSync(join(galDir, 'quadrants', 'inner', 'systems'), { recursive: true })
  writeFileSync(join(galDir, 'galaxy.json'), galaxyJson)
  if (systemJson) {
    writeFileSync(join(galDir, 'quadrants', 'inner', 'systems', `${SYSTEM_ID}.json`), systemJson)
  }
  return root
}

const goodGalaxy = JSON.stringify({
  name: 'Scratch Spiral',
  description:
    'A small synthetic galaxy created purely to exercise the validation command line from a clean temporary directory.',
  tags: ['scratch'],
  id: 'gal-aaaaaaaa',
  type: 'spiral',
  diameterLy: 10000,
  thicknessLy: 500,
  estimatedStarCount: 1000000,
})

const goodSystem = (galaxyId: string) =>
  JSON.stringify({
    name: 'Scratch System',
    description:
      'A synthetic single-star system used by the end-to-end suite, kept deliberately simple and entirely within range.',
    tags: ['scratch'],
    id: SYSTEM_ID,
    galaxyId,
    coordinates: { x: 100, y: -200, z: 50 },
    ageBillionYears: 4,
    stars: [
      {
        name: 'Bench Star',
        description:
          'A perfectly ordinary orange dwarf whose only remarkable trait is appearing in automated tests across the galaxy.',
        tags: ['bench'],
        class: 'K',
        temperatureK: 4800,
        massSol: 0.75,
        radiusSol: 0.85,
        luminositySol: 0.3,
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
        hasRings: false,
        life: 'none',
        moons: [],
      },
    ],
    planetNameMapping: { [PLANET_ID]: 'Checkerboard' },
  })

describe('validate CLI against the real repository content', () => {
  it('passes the seeded content tree with no arguments', async () => {
    const { stdout } = await run(process.execPath, [validateCli], { cwd: repoRoot })
    assert.match(stdout, /5\/5 files valid/)
    assert.match(stdout, /galaxy\.json \[galaxy\]/)
    assert.match(stdout, /anomalies\/.*\.json \[anomaly\]/)
  })

  it('validates a single file via --file', async () => {
    const target = join(seededGalaxyDir, 'systems', 'sys-2d999065.json')
    const { stdout } = await run(process.execPath, [validateCli, '--file', target], { cwd: repoRoot })
    assert.match(stdout, /\[starSystem\]/)
  })

  it('exits non-zero for a missing --file path', async () => {
    await assert.rejects(
      run(process.execPath, [validateCli, '--file', join(repoRoot, 'nope.json')], { cwd: repoRoot }),
      (err: Error & { code?: number; stderr?: string }) => {
        assert.equal(err.code, 1)
        assert.match(err.stderr ?? '', /file not found/)
        return true
      },
    )
  })
})

describe('validate CLI against synthetic trees', () => {
  it('accepts a coherent tree in an arbitrary working directory', async () => {
    const root = makeScratch(goodGalaxy, goodSystem('gal-aaaaaaaa'))
    const { stdout, stderr } = await run(process.execPath, [validateCli], { cwd: root })
    if (stdout) console.log('stdout:', stdout)
    if (stderr) console.log('stderr:', stderr)
    assert.match(stdout, /2\/2 files valid/)
  })

  it('fails on schema violations with actionable messages', async () => {
    const broken = JSON.parse(goodSystem('gal-aaaaaaaa'))
    ;(broken.stars[0] as Record<string, unknown>).temperatureK = 99999
    const root = makeScratch(goodGalaxy, JSON.stringify(broken))
    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number; stdout?: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stdout ?? '', /outside K-class range/)
      assert.match(err.stdout ?? '', /FAIL/)
      return true
    })
  })

  it('fails on cross-file reference violations', async () => {
    const orphan = {
      ...JSON.parse(goodSystem('gal-ffffffff')),
      galaxyId: 'gal-ffffffff',
    }
    const root = makeScratch(goodGalaxy, JSON.stringify(orphan))
    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number; stdout?: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stdout ?? '', /unknown galaxyId 'gal-ffffffff'/)
      return true
    })
  })

  it('explains when there is no content directory yet', async () => {
    const root = mkdtempSync(join(tmpdir(), 'space-lore-empty-'))
    scratchRoots.push(root)
    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number; stderr?: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stderr ?? '', /content directory not found/)
      return true
    })
  })

it('validates system with all new body types', async () => {
    const SYSTEM_ID = deriveId('starSystem', 'gal-aaaaaaaa', 100, -200, 50)
    const PLANET_ID = deriveId('planet', SYSTEM_ID, 1)
    const PLANET2_ID = deriveId('planet', SYSTEM_ID, 2)
    const DWARF_ID = deriveId('dwarfPlanet', SYSTEM_ID, 2)
    const AST_ID = deriveId('asteroid', SYSTEM_ID, 3)
    const BELT_ID = deriveId('belt', SYSTEM_ID, 4)
    const COMET_ID = deriveId('comet', SYSTEM_ID, 5)
    const MOON_ID = deriveId('moon', SYSTEM_ID, 1, 1)

    const root = makeScratch(goodGalaxy, JSON.stringify({
      ...JSON.parse(goodSystem('gal-aaaaaaaa')),
      id: SYSTEM_ID,
      planets: [
        {
          name: 'First World',
          description: 'A rocky inner planet used for pipeline validation, its surface scarred by ancient impacts and rich in mineral deposits for automated testing across the galaxy.',
          tags: ['pipeline', 'rocky'],
          id: PLANET_ID,
          orbitIndex: 1,
          orbitalDistanceAu: 0.7,
          type: 'rocky',
          radiusEarth: 0.9,
          gravityG: 0.6,
          meanTempC: 80,
          atmosphereDensity: 0.3,
          hasRings: false,
          life: 'none',
          moons: [
            {
              name: 'First Moon',
              description: 'A small rocky moon orbiting the first world, its cratered surface a record of ancient impacts and a perfect target for pipeline testing.',
              tags: ['pipeline', 'moon'],
              id: MOON_ID,
              planetId: PLANET_ID,
              orbitIndex: 1,
              orbitalDistanceKm: 15000,
              type: 'rocky',
              radiusKm: 300,
              gravityG: 0.01,
              hasAtmosphere: false,
            },
          ],
        },
      ],
      dwarfPlanets: [
        {
          name: 'Ceres Analog',
          description: 'A rocky dwarf planet in the asteroid belt region, used for pipeline validation and automated testing across the galaxy.',
          tags: ['pipeline', 'dwarf'],
          id: DWARF_ID,
          orbitIndex: 2,
          orbitalDistanceAu: 2.8,
          type: 'rocky',
          radiusKm: 470,
          gravityG: 0.028,
          meanTempC: -100,
          hasAtmosphere: false,
          moonCount: 0,
        },
      ],
      asteroids: [
        {
          name: 'Vesta Analog',
          description: 'A large rocky asteroid for pipeline validation, rich in olivine and pyroxene and perfect for automated testing across the galaxy.',
          tags: ['pipeline', 'asteroid'],
          id: AST_ID,
          orbitIndex: 3,
          orbitalDistanceAu: 2.4,
          type: 'rocky',
          radiusKm: 260,
          massKg: 2.6e20,
          albedo: 0.3,
          rotationPeriodHours: 5.3,
        },
      ],
      belts: [
        {
          name: 'Main Pipeline Belt',
          description: 'A test asteroid belt between inner and outer planets, containing rocky and carbonaceous debris for pipeline validation.',
          tags: ['pipeline', 'belt'],
          id: deriveId('belt', SYSTEM_ID, 4),
          orbitIndex: 4,
          innerEdgeAu: 2.0,
          outerEdgeAu: 3.5,
          type: 'main',
          totalMassEarth: 0.0005,
          largestBodyId: AST_ID,
          composition: ['rocky', 'carbonaceous'],
        },
      ],
      comets: [
        {
          name: 'Halley Pipeline',
          description: 'A short-period comet with regular returns, its icy nucleus shedding dust for pipeline testing and automated validation.',
          tags: ['pipeline', 'comet'],
          id: deriveId('comet', SYSTEM_ID, 5),
          orbitIndex: 5,
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
        },
      ],
      planetNameMapping: {
        [PLANET_ID]: 'First World',
      },
    }))
    const result = await run(process.execPath, [validateCli], { cwd: root })
    console.log('stdout:', result.stdout)
    console.log('stderr:', result.stderr)
    assert.match(result.stdout, /2\/2 files valid/)
  })

  it('fails on belt with innerEdgeAu >= outerEdgeAu', async () => {
    const broken = JSON.parse(goodSystem('gal-aaaaaaaa'))
    broken.belts = [{ ...JSON.parse(goodSystem('gal-aaaaaaaa')).belts?.[0] || {
      name: 'Bad Belt',
      description: 'A belt with inner edge >= outer edge.',
      tags: ['test'],
      id: 'belt-bbbbbbbb',
      orbitIndex: 1,
      innerEdgeAu: 3.5,
      outerEdgeAu: 2.0,
      type: 'main',
      totalMassEarth: 0.0005,
      composition: ['rocky', 'carbonaceous'],
    }, innerEdgeAu: 3.5, outerEdgeAu: 2.0 }]
    broken.asteroids = []
    const root = makeScratch(goodGalaxy, JSON.stringify(broken))
    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number; stdout?: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stdout ?? '', /innerEdgeAu must be less than outerEdgeAu/)
      return true
    })
  })

  it('fails on comet with perihelionAu >= aphelionAu', async () => {
    const badComet = {
      name: 'Bad Comet',
      description: 'A comet with perihelion >= aphelion.',
      tags: ['test'],
      id: 'com-bbbbbbbb',
      orbitIndex: 1,
      semiMajorAxisAu: 17.8,
      eccentricity: 0.967,
      inclinationDeg: 18,
      perihelionAu: 10,
      aphelionAu: 5,
      orbitalPeriodYears: 75.3,
      type: 'short-period',
      nucleusRadiusKm: 5.5,
      isActive: true,
      dustProductionRate: 100,
      gasProductionRate: 50,
    }
    const broken = JSON.parse(goodSystem('gal-aaaaaaaa'))
    broken.comets = [badComet]
    const root = makeScratch(goodGalaxy, JSON.stringify(broken))
    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number; stdout?: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stdout ?? '', /perihelionAu must be less than aphelionAu/)
      return true
    })
  })

  it('fails on comet with eccentricity > 1', async () => {
    const badComet = {
      name: 'Bad Comet',
      description: 'A comet with eccentricity > 1.',
      tags: ['test'],
      id: 'com-cccccccc',
      orbitIndex: 1,
      semiMajorAxisAu: 17.8,
      eccentricity: 1.5,
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
    const broken = JSON.parse(goodSystem('gal-aaaaaaaa'))
    broken.comets = [badComet]
    const root = makeScratch(goodGalaxy, JSON.stringify(broken))
    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number; stdout?: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stdout ?? '', /eccentricity must be between 0 and 1/)
      return true
    })
  })

  it('fails on planet with radius below type minimum', async () => {
    const broken = JSON.parse(goodSystem('gal-aaaaaaaa'))
    broken.planets = [{ ...broken.planets[0], type: 'gas-giant', radiusEarth: 1 }]
    const root = makeScratch(goodGalaxy, JSON.stringify(broken))
    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number; stdout?: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stdout ?? '', /radiusEarth=1 outside 'gas-giant' range/)
      return true
    })
  })

  it('fails on planet with life above type ceiling', async () => {
    const broken = JSON.parse(goodSystem('gal-aaaaaaaa'))
    broken.planets = [{ ...broken.planets[0], type: 'desert', life: 'complex' }]
    const root = makeScratch(goodGalaxy, JSON.stringify(broken))
    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number; stdout?: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stdout ?? '', /exceeds 'desert' ceiling/)
      return true
    })
  })

  it('fails on duplicate moon orbitIndex', async () => {
    const broken = JSON.parse(goodSystem('gal-aaaaaaaa'))
    broken.planets = [{
      ...broken.planets[0],
      id: 'plnt-dddddddd',
      moons: [
        { name: 'Moon 1', description: 'First test moon for validation.', tags: ['test'], id: 'moon-11111111', planetId: 'plnt-dddddddd', orbitIndex: 1, orbitalDistanceKm: 1000, type: 'rocky', radiusKm: 500, gravityG: 0.01, hasAtmosphere: false },
        { name: 'Moon 2', description: 'Second test moon for validation.', tags: ['test'], id: 'moon-22222222', planetId: 'plnt-dddddddd', orbitIndex: 1, orbitalDistanceKm: 2000, type: 'icy', radiusKm: 800, gravityG: 0.02, hasAtmosphere: false },
      ],
    }]
    broken.planetNameMapping = { 'plnt-dddddddd': 'Test Planet' }
    const root = makeScratch(goodGalaxy, JSON.stringify(broken))
    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number; stdout?: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stdout ?? '', /moon orbitIndex values must be unique/)
      return true
    })
  })

  it('fails on moon with mismatched planetId', async () => {
    const broken = JSON.parse(goodSystem('gal-aaaaaaaa'))
    broken.planets = [{
      ...broken.planets[0],
      id: 'plnt-eeeeeeee',
      moons: [{ name: 'Bad Moon', description: 'A moon with wrong planetId.', tags: ['test'], id: 'moon-33333333', planetId: 'plnt-00000000', orbitIndex: 1, orbitalDistanceKm: 1000, type: 'rocky', radiusKm: 500, gravityG: 0.01, hasAtmosphere: false }],
    }]
    broken.planetNameMapping = { 'plnt-eeeeeeee': 'Test Planet' }
    const root = makeScratch(goodGalaxy, JSON.stringify(broken))
    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number; stdout?: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stdout ?? '', /moon planetId .* does not match parent planet id/)
      return true
    })
  })

  it('fails on duplicate orbitIndex between planet and dwarf planet', async () => {
    const dwarfPlanet = {
      name: 'Ceres Analog',
      description: 'A dwarf planet.',
      tags: ['test'],
      id: 'dwpl-ffffffff',
      orbitIndex: 2,
      orbitalDistanceAu: 2.8,
      type: 'rocky',
      radiusKm: 470,
      gravityG: 0.028,
      meanTempC: -100,
      hasAtmosphere: false,
      moonCount: 0,
    }
    const broken = JSON.parse(goodSystem('gal-aaaaaaaa'))
    broken.planets = [{ ...broken.planets[0], id: 'plnt-ffffffff', orbitIndex: 2 }]
    broken.dwarfPlanets = [{ ...dwarfPlanet, id: 'dwpl-ffffffff', orbitIndex: 2 }]
    broken.planetNameMapping = { 'plnt-ffffffff': 'Test Planet' }
    const root = makeScratch(goodGalaxy, JSON.stringify(broken))
    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number; stdout?: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stdout ?? '', /orbitIndex 2 is used by multiple bodies/)
      return true
    })
  })

  it('fails on belt with largestBodyId not in asteroids', async () => {
    const badBelt = {
      name: 'Bad Belt',
      description: 'A belt with invalid largestBodyId.',
      tags: ['test'],
      id: 'belt-cccccccc',
      orbitIndex: 1,
      innerEdgeAu: 2.0,
      outerEdgeAu: 3.5,
      type: 'main',
      totalMassEarth: 0.0005,
      largestBodyId: 'ast-nonexistent',
      composition: ['rocky', 'carbonaceous'],
    }
    const broken = JSON.parse(goodSystem('gal-aaaaaaaa'))
    broken.belts = [badBelt]
    broken.asteroids = []
    const root = makeScratch(goodGalaxy, JSON.stringify(broken))
    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number; stdout?: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stdout ?? '', /belt 'belt-cccccccc' references largestBodyId 'ast-nonexistent' which does not exist/)
      return true
    })
  })

  it('fails on planetNameMapping with invalid derived id', async () => {
    const broken = JSON.parse(goodSystem('gal-aaaaaaaa'))
    broken.planetNameMapping = { 'plnt-00000000': 'Invalid Planet' }
    const root = makeScratch(goodGalaxy, JSON.stringify(broken))
    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number; stdout?: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stdout ?? '', /position-derived/)
      return true
    })
  })

  it('fails on system with negative age', async () => {
    const broken = JSON.parse(goodSystem('gal-aaaaaaaa'))
    broken.ageBillionYears = -1
    const root = makeScratch(goodGalaxy, JSON.stringify(broken))
    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number }) => {
      assert.equal(err.code, 1)
      return true
    })
  })

  it('fails on system with age > 13.8', async () => {
    const broken = JSON.parse(goodSystem('gal-aaaaaaaa'))
    broken.ageBillionYears = 14
    const root = makeScratch(goodGalaxy, JSON.stringify(broken))
    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number }) => {
      assert.equal(err.code, 1)
      return true
    })
  })

  it('fails on system with zero stars', async () => {
    const broken = JSON.parse(goodSystem('gal-aaaaaaaa'))
    broken.stars = []
    const root = makeScratch(goodGalaxy, JSON.stringify(broken))
    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number }) => {
      assert.equal(err.code, 1)
      return true
    })
  })
})
