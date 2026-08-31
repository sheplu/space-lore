import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { deriveId } from '../../src/primitives/id.ts'

const run = promisify(execFile)
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const idCli = join(repoRoot, 'src', 'cli', 'id.ts')

describe('id CLI end-to-end', () => {
  it('derives ids identical to deriveId for prefix aliases', async () => {
    const expected = deriveId('starSystem', 'gal-deadbeef', 1200, '-34000', 550)
    const { stdout } = await run(process.execPath, [idCli, 'sys', 'gal-deadbeef', '1200', '-34000', '550'])
    assert.equal(stdout.trim(), expected)
    const byName = await run(process.execPath, [idCli, 'starSystem', 'gal-deadbeef', '1200', '-34000', '550'])
    assert.equal(byName.stdout.trim(), expected)
  })

  it('handles negative coordinates without flag parsing issues', async () => {
    const { stdout } = await run(process.execPath, [idCli, 'anom', 'gal-1234abcd', '-5000', '-100', '-2200'])
    assert.match(stdout.trim(), /^anom-[0-9a-f]{8}$/)
    assert.equal(stdout.trim(), deriveId('anomaly', 'gal-1234abcd', '-5000', '-100', '-2200'))
  })

  it('fails with usage help for unknown kinds', async () => {
    await assert.rejects(
      run(process.execPath, [idCli, 'warp-drive', 'x']),
      (err: Error & { code?: number; stderr?: string }) => {
        assert.notEqual(err.code, 0)
        assert.match(err.stderr ?? '', /Usage: npm run id/)
        return true
      },
    )
  })

  it('fails when position parts are missing', async () => {
    await assert.rejects(run(process.execPath, [idCli, 'sys']), (err: Error & { stderr?: string }) => {
      assert.match(err.stderr ?? '', /kinds:/)
      return true
    })
  })

  it('derives moon ids correctly', async () => {
    const expected = deriveId('moon', 'sys-deadbeef', 3, 2)
    const { stdout } = await run(process.execPath, [idCli, 'moon', 'sys-deadbeef', '3', '2'])
    assert.equal(stdout.trim(), expected)
  })

  it('derives asteroid ids correctly', async () => {
    const expected = deriveId('asteroid', 'sys-deadbeef', 5)
    const { stdout } = await run(process.execPath, [idCli, 'ast', 'sys-deadbeef', '5'])
    assert.equal(stdout.trim(), expected)
  })

  it('derives belt ids correctly', async () => {
    const expected = deriveId('belt', 'sys-deadbeef', 1)
    const { stdout } = await run(process.execPath, [idCli, 'belt', 'sys-deadbeef', '1'])
    assert.equal(stdout.trim(), expected)
  })

  it('derives dwarf planet ids correctly', async () => {
    const expected = deriveId('dwarfPlanet', 'sys-deadbeef', 4)
    const { stdout } = await run(process.execPath, [idCli, 'dwpl', 'sys-deadbeef', '4'])
    assert.equal(stdout.trim(), expected)
  })

  it('derives comet ids correctly', async () => {
    const expected = deriveId('comet', 'sys-deadbeef', 2)
    const { stdout } = await run(process.execPath, [idCli, 'com', 'sys-deadbeef', '2'])
    assert.equal(stdout.trim(), expected)
  })

  it('derives ids for all kinds using full names', async () => {
    const tests = [
      { kind: 'moon', args: ['sys-deadbeef', '1', '1'], prefix: 'moon-' },
      { kind: 'asteroid', args: ['sys-deadbeef', '2'], prefix: 'ast-' },
      { kind: 'belt', args: ['sys-deadbeef', '1'], prefix: 'belt-' },
      { kind: 'dwarfPlanet', args: ['sys-deadbeef', '3'], prefix: 'dwpl-' },
      { kind: 'comet', args: ['sys-deadbeef', '1'], prefix: 'com-' },
    ]
    for (const t of tests) {
      const expected = deriveId(t.kind as any, ...t.args)
      const { stdout } = await run(process.execPath, [idCli, t.kind, ...t.args])
      assert.equal(stdout.trim(), expected)
      assert.match(stdout.trim(), new RegExp(`^${t.prefix}[0-9a-f]{8}$`))
    }
  })
})
