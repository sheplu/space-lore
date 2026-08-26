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

export const lifeLevelSchema = z.enum(LIFE_LEVELS)

export const planetSchema = z
  .object({
    ...loreFieldsSchema.shape,
    id: z.string(),
    orbitIndex: z.number().int().min(1),
    orbitalDistanceAu: z.number().positive(),
    type: z.enum([...PLANET_TYPES, 'asteroid', 'asteroid-belt'] as const),
    radiusEarth: z.number().positive(),
    gravityG: z.number().positive(),
    meanTempC: z.number(),
    atmosphereDensity: z.number().nonnegative(),
    moonCount: z.number().int().min(0),
    hasRings: z.boolean(),
    life: lifeLevelSchema,
  })
  .superRefine((planet, ctx) => {
    const profile = PLANET_TYPE_PROFILES[planet.type as keyof typeof PLANET_TYPE_PROFILES] || {
    type: planet.type,
    radiusEarth: { min: 0.01, max: 5 },
    gravityG: { min: 0.001, max: 2 },
    meanTempC: { min: -180, max: 300 },
    atmosphereDensity: { min: 0, max: 0 },
    moonCount: { min: 0, max: 0 },
    ringsLikelihood: 'none' as const,
    lifeCeiling: 'none' as const,
  }
    const rangeChecks: Array<[field: string, value: number, range: Range]> = [
      ['radiusEarth', planet.radiusEarth, profile.radiusEarth],
      ['gravityG', planet.gravityG, profile.gravityG],
      ['meanTempC', planet.meanTempC, profile.meanTempC],
      ['atmosphereDensity', planet.atmosphereDensity, profile.atmosphereDensity],
      ['moonCount', planet.moonCount, profile.moonCount],
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
  })

export function isLifeLevel(value: unknown): value is LifeLevel {
  return LIFE_LEVELS.includes(value as LifeLevel)
}

export type Planet = z.infer<typeof planetSchema>
