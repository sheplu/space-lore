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
})
