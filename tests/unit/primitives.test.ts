import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { coordinatesSchema, formatPositionKey } from '../../src/primitives/coords.ts'
import { ID_PREFIXES, deriveId, idPattern } from '../../src/primitives/id.ts'

describe('coordinatesSchema', () => {
  it('accepts finite 3d coordinates', () => {
    const result = coordinatesSchema.safeParse({ x: 1200.5, y: -34000, z: 0 })
    assert.equal(result.success, true)
  })

  it('rejects non-finite values', () => {
    assert.equal(coordinatesSchema.safeParse({ x: Number.NaN, y: 0, z: 0 }).success, false)
    assert.equal(coordinatesSchema.safeParse({ x: Infinity, y: 0, z: 0 }).success, false)
    assert.equal(coordinatesSchema.safeParse({ x: 1, y: 'a', z: 0 }).success, false)
  })

  it('formats a stable position key', () => {
    assert.equal(formatPositionKey({ x: 1, y: 2.5, z: -3 }), '1|2.5|-3')
  })
})

describe('deriveId', () => {
  it('is deterministic for identical position parts', () => {
    const a = deriveId('starSystem', 'gal-1234abcd', 100, 200, 300)
    const b = deriveId('starSystem', 'gal-1234abcd', 100, 200, 300)
    assert.equal(a, b)
  })

  it('differs across kinds, parents and coordinates', () => {
    const base = deriveId('starSystem', 'gal-1234abcd', 100, 200, 300)
    assert.notEqual(base, deriveId('planet', 'gal-1234abcd', 100, 200, 300))
    assert.notEqual(base, deriveId('starSystem', 'gal-ffffffff', 100, 200, 300))
    assert.notEqual(base, deriveId('starSystem', 'gal-1234abcd', 101, 200, 300))
  })

  it('produces prefixed 8-hex ids for every kind', () => {
    for (const kind of Object.keys(ID_PREFIXES) as Array<keyof typeof ID_PREFIXES>) {
      const id = deriveId(kind, 'seed')
      assert.match(id, idPattern(kind))
    }
  })

  it('rejects empty position parts', () => {
    assert.throws(() => deriveId('planet'))
  })
})
