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
  const root = mkdtempSync(join(tmpdir(), 'space-lore-pipeline-'))
  scratchRoots.push(root)

  it('runs galaxy → system → planets through the real commands', async () => {
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
          name: 'Driftwood Sun',
          description:
            'A placid yellow star whose steady output makes it the reference point for pipeline calibration runs.',
          tags: ['steady'],
          class: 'G',
          temperatureK: 5700,
          massSol: 1,
          radiusSol: 1,
          luminositySol: 1,
        },
      ],
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
            name: 'Furnace Ghost',
            description:
              'An orange dwarf recorded far too hot for its class, a deliberate error the validation gate must refuse.',
            tags: ['impossible'],
            class: 'K',
            temperatureK: 99999,
            massSol: 0.7,
            radiusSol: 0.8,
            luminositySol: 0.25,
          },
        ],
        planetNameMapping: {},
      }),
    )
    await assert.rejects(run(process.execPath, [validateCli], { cwd: root }), (err: Error & { code?: number; stdout?: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stdout ?? '', /outside K-class range/)
      return true
    })
  })
})