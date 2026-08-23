import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { IdUsageError, USAGE_MESSAGE, resolveIdArgs } from '../../src/cli/id-lib.ts'

describe('resolveIdArgs', () => {
  it('resolves every prefix alias', () => {
    assert.match(resolveIdArgs(['gal', 'seed']), /^gal-[0-9a-f]{8}$/)
    assert.match(resolveIdArgs(['sys', 'gal-1234abcd', 1, 2, 3].map(String)), /^sys-[0-9a-f]{8}$/)
    assert.match(resolveIdArgs(['plnt', 'sys-1234abcd', '3']), /^plnt-[0-9a-f]{8}$/)
    assert.match(resolveIdArgs(['anom', 'gal-1234abcd']), /^anom-[0-9a-f]{8}$/)
  })

  it('accepts full kind names too', () => {
    const byPrefix = resolveIdArgs(['sys', 'x'])
    const byName = resolveIdArgs(['starSystem', 'x'])
    assert.equal(byPrefix, byName)
    assert.equal(resolveIdArgs(['planet', 'y', '2']), resolveIdArgs(['plnt', 'y', '2']))
  })

  it('is deterministic and position-sensitive', () => {
    assert.equal(resolveIdArgs(['sys', 'g', '1', '2', '3']), resolveIdArgs(['sys', 'g', '1', '2', '3']))
    assert.notEqual(resolveIdArgs(['sys', 'g', '1', '2', '3']), resolveIdArgs(['sys', 'g', '1', '2', '4']))
  })

  it('throws usage error for unknown kinds or missing parts', () => {
    for (const bad of [['bogus', 'x'], [], ['sys'], ['gal']]) {
      assert.throws(() => resolveIdArgs(bad), IdUsageError)
    }
    try {
      resolveIdArgs([])
    } catch (err) {
      assert.match((err as Error).message, /Usage: npm run id/)
      assert.equal(err instanceof IdUsageError && err.message === USAGE_MESSAGE, true)
    }
  })
})
