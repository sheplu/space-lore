import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, describe, it } from 'node:test'

const run = promisify(execFile)
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const validateCli = join(repoRoot, 'src', 'cli', 'validate.ts')
const seededGalaxyDir = join(repoRoot, 'content', 'gal-1dcef06b')

const scratchRoots: string[] = []

after(() => {
  for (const root of scratchRoots) rmSync(root, { recursive: true, force: true })
})

function makeScratch(galaxyJson: string, systemJson?: string): string {
  const root = mkdtempSync(join(tmpdir(), 'space-lore-e2e-'))
  scratchRoots.push(root)
  const galId = 'gal-aaaaaaaa'
  const galDir = join(root, 'content', galId)
  mkdirSync(join(galDir, 'quadrants', 'inner', 'systems'), { recursive: true })
  writeFileSync(join(galDir, 'galaxy.json'), galaxyJson)
  if (systemJson) {
    writeFileSync(join(galDir, 'quadrants', 'inner', 'systems', 'sys-bbbbbbbb.json'), systemJson)
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
    id: 'sys-bbbbbbbb',
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
    planetNameMapping: {},
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
    const { stdout } = await run(process.execPath, [validateCli], { cwd: root })
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
    const orphan = JSON.parse(goodSystem('gal-ffffffff'))
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
})
