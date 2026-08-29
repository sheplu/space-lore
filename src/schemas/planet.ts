import { z } from 'zod'
import {
  LIFE_LEVELS,
  PLANET_TYPE_PROFILES,
  PLANET_TYPES,
  lifeRank,
  type LifeLevel,
  type Range,
} from '../taxonomy/planet-types.ts'
import { loreFieldsSchema } from './common.ts'
import { moonSchema } from './moon.ts'

export const lifeLevelSchema = z.enum(LIFE_LEVELS)

export const planetSchema = z
  .object({
    ...loreFieldsSchema.shape,
    id: z.string(),
    orbitIndex: z.number().int().min(1),
    orbitalDistanceAu: z.number().positive(),
    type: z.string(),
    radiusEarth: z.number().positive(),
    gravityG: z.number().positive(),
    meanTempC: z.number(),
    atmosphereDensity: z.number().nonnegative(),
    hasRings: z.boolean(),
    life: lifeLevelSchema,
    moons: z.array(moonSchema).default([]),
  })
  .superRefine((planet, ctx) => {
    if (!PLANET_TYPES.includes(planet.type as any)) {
      ctx.addIssue({
        code: 'custom',
        path: ['type'],
        message: `Invalid option: expected one of "${PLANET_TYPES.join('"|"')}"`,
      })
      return
    }
    const profile = PLANET_TYPE_PROFILES[planet.type as keyof typeof PLANET_TYPE_PROFILES] || {
      type: planet.type,
      radiusEarth: { min: 0.01, max: 5 },
      gravityG: { min: 0.001, max: 2 },
      meanTempC: { min: -180, max: 300 },
      atmosphereDensity: { min: 0, max: 0 },
      ringsLikelihood: 'none' as const,
      lifeCeiling: 'none' as const,
    }
    const rangeChecks: Array<[field: string, value: number, range: Range]> = [
      ['radiusEarth', planet.radiusEarth, profile.radiusEarth],
      ['gravityG', planet.gravityG, profile.gravityG],
      ['meanTempC', planet.meanTempC, profile.meanTempC],
      ['atmosphereDensity', planet.atmosphereDensity, profile.atmosphereDensity],
    ]
    for (const [field, value, range] of rangeChecks) {
      if (value < range.min || value > range.max) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: `${field}=${value} outside '${profile.type}' range [${range.min}, ${range.max}]`,
        })
      }
    }
    if (lifeRank(planet.life) > lifeRank(profile.lifeCeiling)) {
      ctx.addIssue({
        code: 'custom',
        path: ['life'],
        message: `life='${planet.life}' exceeds '${profile.type}' ceiling '${profile.lifeCeiling}'`,
      })
    }
    const moonOrbitIndices = planet.moons.map((m) => m.orbitIndex)
    if (new Set(moonOrbitIndices).size !== moonOrbitIndices.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['moons'],
        message: 'moon orbitIndex values must be unique within a planet',
      })
    }
    for (const moon of planet.moons) {
      if (moon.planetId !== planet.id) {
        ctx.addIssue({
          code: 'custom',
          path: ['moons'],
          message: `moon planetId '${moon.planetId}' does not match parent planet id '${planet.id}'`,
        })
      }
    }
  })

export function isLifeLevel(value: unknown): value is LifeLevel {
  return LIFE_LEVELS.includes(value as LifeLevel)
}

export type Planet = z.infer<typeof planetSchema>
