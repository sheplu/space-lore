import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ANOMALY_CATEGORIES,
  ANOMALY_CATEGORY_PROFILES,
  DANGER_LEVELS,
} from '../../src/taxonomy/anomaly-categories.ts'
import { LIFE_LEVELS, PLANET_TYPES, PLANET_TYPE_PROFILES, lifeRank } from '../../src/taxonomy/planet-types.ts'
import { STAR_CLASSES, STAR_CLASS_PROFILES } from '../../src/taxonomy/star-classes.ts'

function assertValidRange(range: { min: number; max: number }, label: string): void {
  assert.ok(
    Number.isFinite(range.min) && Number.isFinite(range.max) && range.min <= range.max,
    `${label} must be a finite ordered range, got [${range.min}, ${range.max}]`,
  )
}

describe('star-classes', () => {
  it('defines sane ranges for all seven classes', () => {
    for (const profile of Object.values(STAR_CLASS_PROFILES)) {
      assertValidRange(profile.temperatureK, `temperatureK ${profile.class}`)
      assertValidRange(profile.massSol, `massSol ${profile.class}`)
      assertValidRange(profile.radiusSol, `radiusSol ${profile.class}`)
      assertValidRange(profile.luminositySol, `luminositySol ${profile.class}`)
      assert.ok(profile.fraction > 0, `fraction for ${profile.class} must be positive`)
      assert.ok(profile.traits.length > 0, `traits for ${profile.class} must not be empty`)
    }
    const fractionSum = STAR_CLASSES.reduce((sum, c) => sum + STAR_CLASS_PROFILES[c].fraction, 0)
    assert.ok(Math.abs(fractionSum - 1) < 0.001, `fractions must sum to ~1, got ${fractionSum}`)
  })
})

describe('planet-types', () => {
  it('defines sane ranges and ceilings for every type', () => {
    for (const profile of Object.values(PLANET_TYPE_PROFILES)) {
      assertValidRange(profile.radiusEarth, `radiusEarth ${profile.type}`)
      assertValidRange(profile.gravityG, `gravityG ${profile.type}`)
      assertValidRange(profile.meanTempC, `meanTempC ${profile.type}`)
      assertValidRange(profile.atmosphereDensity, `atmosphereDensity ${profile.type}`)
      assert.ok(LIFE_LEVELS.includes(profile.lifeCeiling), `lifeCeiling ${profile.lifeCeiling} unknown`)
      assert.ok(profile.traits.length > 0, `traits for ${profile.type} must not be empty`)
    }
  })

  it('ranks life levels strictly increasing', () => {
    const ranks = LIFE_LEVELS.map(lifeRank)
    for (let i = 1; i < ranks.length; i++) {
      assert.ok(ranks[i] === ranks[i - 1] + 1, 'life ranks must be consecutive')
    }
  })

  it('covers exactly the declared planet types', () => {
    assert.deepEqual(Object.keys(PLANET_TYPE_PROFILES).sort(), [...PLANET_TYPES].sort())
  })
})

describe('anomaly-categories', () => {
  it('profiles every category with hints and a valid danger level', () => {
    assert.deepEqual(Object.keys(ANOMALY_CATEGORY_PROFILES).sort(), [...ANOMALY_CATEGORIES].sort())
    for (const profile of Object.values(ANOMALY_CATEGORY_PROFILES)) {
      assert.ok(profile.effectHints.length >= 2, `${profile.category} needs effect hints`)
      assert.ok(DANGER_LEVELS.includes(profile.defaultDanger))
    }
  })
})
