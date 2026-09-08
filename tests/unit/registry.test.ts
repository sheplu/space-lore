import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CONTENT_SCHEMAS } from '../../src/validate/registry.ts'

const mapping = CONTENT_SCHEMAS.starSystemQuadrantMapping

describe('starSystemQuadrantMapping registry schema', () => {
  it('accepts a systemId -> name map', () => {
    const result = mapping.safeParse({ 'sys-12345678': 'Validation Reach' })
    assert.equal(result.success, true)
  })

  it('accepts an empty map (systems are added later)', () => {
    assert.equal(mapping.safeParse({}).success, true)
  })

  it('rejects keys that are not system ids', () => {
    const result = mapping.safeParse({ nope: 'Nowhere' })
    assert.equal(result.success, false)
  })

  it('rejects empty display names', () => {
    assert.equal(mapping.safeParse({ 'sys-12345678': '' }).success, false)
  })

  it('rejects non-object payloads', () => {
    assert.equal(mapping.safeParse([]).success, false)
    assert.equal(mapping.safeParse(null).success, false)
  })
})
