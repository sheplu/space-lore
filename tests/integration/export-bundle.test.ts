import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import { buildConstraintBundle } from '../../src/export/bundle.ts'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

describe('constraint bundle', () => {
  it('matches the exported data/taxonomy.json on disk', () => {
    const onDisk = JSON.parse(readFileSync(join(repoRoot, 'data', 'taxonomy.json'), 'utf8'))
    assert.deepEqual(buildConstraintBundle(), onDisk)
  })

  it('carries everything a generation skill needs', () => {
    const bundle = buildConstraintBundle()
    assert.equal(bundle.starClasses.length, 7)
    assert.equal(bundle.planetTypes.length, 8)
    assert.equal(bundle.moonTypes.length, 5)
    assert.equal(bundle.asteroidTypes.length, 4)
    assert.equal(bundle.beltTypes.length, 4)
    assert.equal(bundle.dwarfPlanetTypes.length, 3)
    assert.equal(bundle.cometTypes.length, 4)
    assert.equal(bundle.anomalyCategories.length, 6)
    assert.deepEqual(
      bundle.lifeLevels.map((l) => l.level),
      ['none', 'microbial', 'simple', 'complex', 'intelligent'],
    )
    assert.equal(bundle.styleGuide.language, 'en')
    assert.ok(bundle.styleGuide.naming.starExamples.length > 0)
  })
})
