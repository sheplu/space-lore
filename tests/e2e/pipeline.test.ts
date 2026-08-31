import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, describe, it } from 'node:test'

const run = promisify(execFile)
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const idCli = join(repoRoot, 'src', 'cli', 'id.ts')
const validateCli = join(repoRoot, 'src', 'cli', 'validate.ts')

const scratchRoots: string[] = []

after(() => {
  for (const root of scratchRoots) rmSync(root, { recursive: true, force: true })
})

const id = async (...args: string[]) => {
  const { stdout } = await run(process.execPath, [idCli, ...args])
  return stdout.trim()
}

describe('skill-style generation pipeline end-to-end', () => {

  it('runs galaxy → system → planets through the real commands', async () => {
    const root = mkdtempSync(join(tmpdir(), 'space-lore-pipeline-'))
    scratchRoots.push(root)

    const galId = await id('galaxy', 'pipeline-spiral')
    assert.match(galId, /^gal-[0-9a-f]{8}$/)

    const coords = { x: 3000, y: -1200, z: 400 }
    const sysId = await id('sys', galId, String(coords.x), String(coords.y), String(coords.z))
    assert.match(sysId, /^sys-[0-9a-f]{8}$/)

    const galDir = join(root, 'content', galId)
    mkdirSync(join(galDir, 'quadrants', 'inner', 'systems'), { recursive: true })
    writeFileSync(
      join(galDir, 'galaxy.json'),
      JSON.stringify({
        name: 'Pipeline Spiral',
        description:
          'A modest spiral galaxy spun up by the end-to-end pipeline test, its arms threaded with calibration beacons.',
        tags: ['pipeline'],
        id: galId,
        type: 'spiral',
        diameterLy: 20000,
        thicknessLy: 900,
        estimatedStarCount: 90000000,
      }),
    )

    const orbitOne = await id('plnt', sysId, '1')
    const orbitThree = await id('plnt', sysId, '3')
    assert.equal(orbitThree.length, orbitOne.length)
    assert.notEqual(orbitOne, orbitThree)

    const starId = await id('star', sysId, '1')
    const system = {
      name: 'Conveyor Belt',
      description:
        'A system assembled step by step by the automated pipeline, every identifier derived from position and nothing else.',
      tags: ['pipeline'],
      id: sysId,
      galaxyId: galId,
      coordinates: coords,
      ageBillionYears: 7.7,
      stars: [
        {
          id: starId,
          name: 'Driftwood Sun',
          description:
            'A placid yellow star whose steady output makes it the reference point for pipeline calibration runs.',
          tags: ['steady'],
          type: 'main-sequence',
          class: 'G',
          temperatureK: 5700,
          massSol: 1,
          radiusSol: 1,
          luminositySol: 1,
        },
      ],
      starOrbits: [{ index: 1, starIds: [starId] }],
      planetNameMapping: {
        [orbitOne]: 'First Light',
        [orbitThree]: 'Third Harvest',
      },
    }
    const sysPath = join(galDir, 'quadrants', 'inner', 'systems', `${sysId}.json`)
    writeFileSync(sysPath, JSON.stringify(system))

    const { stdout } = await run(process.execPath, [validateCli], { cwd: root })
    assert.match(stdout, /2\/2 files valid/)

    const persisted = JSON.parse(readFileSync(sysPath, 'utf8'))
    assert.equal(persisted.id, sysId)
    assert.deepEqual(persisted.coordinates, coords)
  })

  it('rejects generator drift that violates taxonomy ranges', async () => {
    const root = mkdtempSync(join(tmpdir(), 'space-lore-pipeline-'))
    scratchRoots.push(root)

    const galId = await id('galaxy', 'pipeline-drift')
    const galDir = join(root, 'content', galId)
    mkdirSync(join(galDir, 'quadrants', 'inner', 'systems'), { recursive: true })
    writeFileSync(
      join(galDir, 'galaxy.json'),
      JSON.stringify({
        name: 'Drift Spiral',
        description:
          'A twin of the pipeline galaxy reserved for negative testing, where generated values are pushed out of range on purpose.',
        tags: ['pipeline'],
        id: galId,
        type: 'spiral',
        diameterLy: 15000,
        thicknessLy: 700,
        estimatedStarCount: 80000000,
      }),
    )
    const sysId = await id('sys', galId, '100', '200', '-50')
    const sysPath = join(galDir, 'quadrants', 'inner', 'systems', `${sysId}.json`)
    const starId = await id('star', sysId, '1')
    writeFileSync(
      sysPath,
      JSON.stringify({
        name: 'Out of Range',
        description:
          'A system whose star was written with an impossible temperature, proving the validator catches generator drift.',
        tags: ['invalid'],
        id: sysId,
        galaxyId: galId,
        coordinates: { x: 100, y: 200, z: -50 },
        ageBillionYears: 2,
        stars: [
          {
            id: starId,
            name: 'Furnace Ghost',
            description:
              'An orange dwarf recorded far too hot for its class, a deliberate error the validation gate must refuse.',
            tags: ['impossible'],
            type: 'main-sequence',
            class: 'K',
            temperatureK: 99999,
            massSol: 0.7,
            radiusSol: 0.8,
            luminositySol: 0.25,
          },
        ],
        starOrbits: [{ index: 1, starIds: [starId] }],
        planetNameMapping: {},
      }),
    )
    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number; stdout?: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stdout ?? '', /outside main-sequence-K range/)
      return true
    })
  })

  it('validates system with all new body types', async () => {
    const root = mkdtempSync(join(tmpdir(), 'space-lore-pipeline-'))
    scratchRoots.push(root)

    const galId = await id('galaxy', 'pipeline-full')
    const galDir = join(root, 'content', galId)
    mkdirSync(join(galDir, 'quadrants', 'inner', 'systems'), { recursive: true })
    writeFileSync(
      join(galDir, 'galaxy.json'),
      JSON.stringify({
        name: 'Full Pipeline Spiral',
        description: 'A test galaxy with all body types for pipeline validation, its spiral arms studded with calibration beacons and automated testing facilities across the galaxy.',
        tags: ['pipeline', 'full'],
        id: galId,
        type: 'spiral',
        diameterLy: 20000,
        thicknessLy: 900,
        estimatedStarCount: 90000000,
      }),
    )

    const sysId = await id('sys', galId, '100', '200', '-50')
    const sysPath = join(galDir, 'quadrants', 'inner', 'systems', `${sysId}.json`)

    const orbitOne = await id('plnt', sysId, '1')
    const orbitTwo = await id('plnt', sysId, '2')
    const dwarfOrbit = await id('dwpl', sysId, '3')
    const astOrbit = await id('ast', sysId, '4')
    const beltOrbit = await id('belt', sysId, '5')
    const cometOrbit = await id('com', sysId, '6')
    const moonOrbit = await id('moon', sysId, '1', '1')
    const starId = await id('star', sysId, '1')

    const system = {
      name: 'Full Body System',
      description: 'A system with every body type for comprehensive pipeline validation, its stars and worlds mapped for automated testing across the galaxy.',
      tags: ['pipeline', 'full'],
      id: sysId,
      galaxyId: galId,
      coordinates: { x: 100, y: 200, z: -50 },
      ageBillionYears: 5.5,
      stars: [
        {
          id: starId,
          name: 'Calibration Star',
          description: 'A stable G-class star used for full pipeline validation runs, its steady output makes it the reference point for automated calibration runs across the galaxy.',
          tags: ['calibration'],
          type: 'main-sequence',
          class: 'G',
          temperatureK: 5700,
          massSol: 1,
          radiusSol: 1,
          luminositySol: 1,
        },
      ],
      starOrbits: [{ index: 1, starIds: [starId] }],
      planets: [
        {
          name: 'First World',
          description: 'A rocky inner planet used for pipeline validation, its surface scarred by ancient impacts and rich in mineral deposits for automated testing across the galaxy.',
          tags: ['pipeline', 'rocky'],
          id: orbitOne,
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
              id: moonOrbit,
              planetId: orbitOne,
              orbitIndex: 1,
              orbitalDistanceKm: 15000,
              type: 'rocky',
              radiusKm: 300,
              gravityG: 0.01,
              hasAtmosphere: false,
            },
          ],
        },
        {
          name: 'Ocean World',
          description: 'An oceanic planet with storm-swept seas and abundant life, perfect for pipeline testing and automated validation across the galaxy.',
          tags: ['pipeline', 'oceanic'],
          id: orbitTwo,
          orbitIndex: 2,
          orbitalDistanceAu: 1.5,
          type: 'oceanic',
          radiusEarth: 1.2,
          gravityG: 1.1,
          meanTempC: 15,
          atmosphereDensity: 1.2,
          hasRings: false,
          life: 'complex',
          moons: [],
        },
      ],
      dwarfPlanets: [
        {
          name: 'Ceres Analog',
          description: 'A rocky dwarf planet in the asteroid belt region, used for pipeline validation and automated testing across the galaxy.',
          tags: ['pipeline', 'dwarf'],
          id: dwarfOrbit,
          orbitIndex: 3,
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
          id: astOrbit,
          orbitIndex: 4,
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
          id: beltOrbit,
          orbitIndex: 5,
          innerEdgeAu: 2.0,
          outerEdgeAu: 3.5,
          type: 'main',
          totalMassEarth: 0.0005,
          largestBodyId: astOrbit,
          composition: ['rocky', 'carbonaceous'],
        },
      ],
      comets: [
        {
          name: 'Halley Pipeline',
          description: 'A short-period comet with regular returns, its icy nucleus shedding dust for pipeline testing and automated validation.',
          tags: ['pipeline', 'comet'],
          id: cometOrbit,
          orbitIndex: 6,
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
        [orbitOne]: 'First World',
        [orbitTwo]: 'Ocean World',
      },
    }
    writeFileSync(sysPath, JSON.stringify(system))

    const { stdout, stderr } = await run(process.execPath, [validateCli], { cwd: root })
    if (stdout) console.log('stdout:', stdout)
    if (stderr) console.log('stderr:', stderr)
    assert.match(stdout, /2\/2 files valid/)

    const persisted = JSON.parse(readFileSync(sysPath, 'utf8'))
    assert.equal(persisted.id, sysId)
    assert.deepEqual(persisted.coordinates, { x: 100, y: 200, z: -50 })
  })

  it('rejects system with invalid moon planetId', async () => {
    const root = mkdtempSync(join(tmpdir(), 'space-lore-pipeline-'))
    scratchRoots.push(root)

    const galId = await id('galaxy', 'pipeline-bad-moon')
    const galDir = join(root, 'content', galId)
    mkdirSync(join(galDir, 'quadrants', 'inner', 'systems'), { recursive: true })
    writeFileSync(
      join(galDir, 'galaxy.json'),
      JSON.stringify({
        name: 'Bad Moon Galaxy',
        description: 'A galaxy with a system containing a moon with wrong planetId, used for negative testing of moon validation across the galaxy.',
        tags: ['pipeline', 'invalid'],
        id: galId,
        type: 'spiral',
        diameterLy: 20000,
        thicknessLy: 900,
        estimatedStarCount: 90000000,
      }),
    )

    const sysId = await id('sys', galId, '100', '200', '-50')
    const sysPath = join(galDir, 'quadrants', 'inner', 'systems', `${sysId}.json`)
    const orbitOne = await id('plnt', sysId, '1')
    const moonOrbit = await id('moon', sysId, '1', '1')
    const starId = await id('star', sysId, '1')

    const system = {
      name: 'Bad Moon System',
      description: 'A system with a moon that has wrong planetId, used for negative testing of moon validation across the galaxy.',
      tags: ['pipeline', 'invalid'],
      id: sysId,
      galaxyId: galId,
      coordinates: { x: 100, y: 200, z: -50 },
      ageBillionYears: 5.5,
      stars: [
        {
          id: starId,
          name: 'Test Star',
          description: 'A stable G-class star used for testing validation logic.',
          tags: ['test'],
          type: 'main-sequence',
          class: 'G',
          temperatureK: 5700,
          massSol: 1,
          radiusSol: 1,
          luminositySol: 1,
        },
      ],
      starOrbits: [{ index: 1, starIds: [starId] }],
      planets: [
        {
          name: 'Test Planet',
          description: 'A rocky planet used for testing moon validation logic.',
          tags: ['test'],
          id: orbitOne,
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
              name: 'Bad Moon',
              description: 'A moon with wrong planetId, used for negative testing.',
              tags: ['test'],
              id: moonOrbit,
              planetId: 'plnt-00000000',
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
      planetNameMapping: { [orbitOne]: 'Test Planet' },
    }
    writeFileSync(sysPath, JSON.stringify(system))

    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number; stdout?: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stdout ?? '', /moon planetId .* does not match parent planet id/)
      return true
    })
  })

  it('rejects system with duplicate orbitIndex across body types', async () => {
    const root = mkdtempSync(join(tmpdir(), 'space-lore-pipeline-'))
    scratchRoots.push(root)

    const galId = await id('galaxy', 'pipeline-dup-orbit')
    const galDir = join(root, 'content', galId)
    mkdirSync(join(galDir, 'quadrants', 'inner', 'systems'), { recursive: true })
    writeFileSync(
      join(galDir, 'galaxy.json'),
      JSON.stringify({
        name: 'Dup Orbit Galaxy',
        description: 'A galaxy with a system containing duplicate orbitIndex, used for negative testing of orbit uniqueness.',
        tags: ['pipeline', 'invalid'],
        id: galId,
        type: 'spiral',
        diameterLy: 20000,
        thicknessLy: 900,
        estimatedStarCount: 90000000,
      }),
    )

    const sysId = await id('sys', galId, '100', '200', '-50')
    const sysPath = join(galDir, 'quadrants', 'inner', 'systems', `${sysId}.json`)
    const orbitOne = await id('plnt', sysId, '1')
    const astOrbit = await id('ast', sysId, '1')
    const starId = await id('star', sysId, '1')

    const system = {
      name: 'Dup Orbit System',
      description: 'A system with planet and asteroid sharing orbitIndex, used for negative testing of orbit uniqueness.',
      tags: ['pipeline', 'invalid'],
      id: sysId,
      galaxyId: galId,
      coordinates: { x: 100, y: 200, z: -50 },
      ageBillionYears: 5.5,
      stars: [
        {
          id: starId,
          name: 'Test Star',
          description: 'A stable G-class star used for testing validation logic.',
          tags: ['test'],
          type: 'main-sequence',
          class: 'G',
          temperatureK: 5700,
          massSol: 1,
          radiusSol: 1,
          luminositySol: 1,
        },
      ],
      starOrbits: [{ index: 1, starIds: [starId] }],
      planets: [
        {
          name: 'Test Planet',
          description: 'A rocky planet used for testing orbit uniqueness validation.',
          tags: ['test'],
          id: orbitOne,
          orbitIndex: 1,
          orbitalDistanceAu: 0.7,
          type: 'rocky',
          radiusEarth: 0.9,
          gravityG: 0.6,
          meanTempC: 80,
          atmosphereDensity: 0.3,
          hasRings: false,
          life: 'none',
          moons: [],
        },
      ],
      asteroids: [
        {
          name: 'Test Asteroid',
          description: 'An asteroid with same orbitIndex as planet.',
          tags: ['test'],
          id: astOrbit,
          orbitIndex: 1,
          orbitalDistanceAu: 2.4,
          type: 'rocky',
          radiusKm: 260,
          massKg: 2.6e20,
          albedo: 0.3,
          rotationPeriodHours: 5.3,
        },
      ],
      planetNameMapping: { [orbitOne]: 'Test Planet' },
    }
    writeFileSync(sysPath, JSON.stringify(system))

    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number; stdout?: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stdout ?? '', /orbitIndex 1 is used by multiple bodies/)
      return true
    })
  })

  it('rejects belt with largestBodyId not in asteroids', async () => {
    const root = mkdtempSync(join(tmpdir(), 'space-lore-pipeline-'))
    scratchRoots.push(root)

    const galId = await id('galaxy', 'pipeline-bad-belt')
    const galDir = join(root, 'content', galId)
    mkdirSync(join(galDir, 'quadrants', 'inner', 'systems'), { recursive: true })
    writeFileSync(
      join(galDir, 'galaxy.json'),
      JSON.stringify({
        name: 'Bad Belt Galaxy',
        description: 'A galaxy with a system containing a belt with invalid largestBodyId, used for negative testing of belt validation.',
        tags: ['pipeline', 'invalid'],
        id: galId,
        type: 'spiral',
        diameterLy: 20000,
        thicknessLy: 900,
        estimatedStarCount: 90000000,
      }),
    )

    const sysId = await id('sys', galId, '100', '200', '-50')
    const sysPath = join(galDir, 'quadrants', 'inner', 'systems', `${sysId}.json`)
    const beltOrbit = await id('belt', sysId, '1')
    const starId = await id('star', sysId, '1')

    const system = {
      name: 'Bad Belt System',
      description: 'A system with a belt referencing non-existent asteroid, used for negative testing of belt validation.',
      tags: ['pipeline', 'invalid'],
      id: sysId,
      galaxyId: galId,
      coordinates: { x: 100, y: 200, z: -50 },
      ageBillionYears: 5.5,
      stars: [
        {
          id: starId,
          name: 'Test Star',
          description: 'A stable G-class star used for testing belt validation logic.',
          tags: ['test'],
          type: 'main-sequence',
          class: 'G',
          temperatureK: 5700,
          massSol: 1,
          radiusSol: 1,
          luminositySol: 1,
        },
      ],
      starOrbits: [{ index: 1, starIds: [starId] }],
      belts: [
        {
          name: 'Bad Belt',
          description: 'A belt with invalid largestBodyId, used for negative testing of belt validation.',
          tags: ['test'],
          id: beltOrbit,
          orbitIndex: 1,
          innerEdgeAu: 2.0,
          outerEdgeAu: 3.5,
          type: 'main',
          totalMassEarth: 0.0005,
          largestBodyId: 'ast-nonexistent',
          composition: ['rocky', 'carbonaceous'],
        },
      ],
      asteroids: [],
      planetNameMapping: {},
    }
    writeFileSync(sysPath, JSON.stringify(system))

    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number; stdout?: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stdout ?? '', /belt .* references largestBodyId .* which does not exist/)
      return true
    })
  })
})