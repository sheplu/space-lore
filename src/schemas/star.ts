import { z } from 'zod'
import {
  STAR_CLASS_PROFILES,
  STAR_TYPE_PROFILES,
  STAR_CLASSES,
  STAR_TYPES,
  type StarClass,
  type StarType,
  type Range,
  getStarProfile,
} from '../taxonomy/star-classes.ts'
import { loreFieldsSchema, starIdSchema } from './common.ts'

const mainSequenceStarSchema = z.object({
  ...loreFieldsSchema.shape,
  id: starIdSchema,
  type: z.literal('main-sequence'),
  class: z.enum(STAR_CLASSES),
  temperatureK: z.number().positive(),
  massSol: z.number().positive(),
  radiusSol: z.number().positive(),
  luminositySol: z.number().nonnegative(),
})

const compactStarSchema = z.object({
  ...loreFieldsSchema.shape,
  id: starIdSchema,
  type: z.enum(STAR_TYPES),
  temperatureK: z.number().nonnegative(),
  massSol: z.number().positive(),
  radiusSol: z.number().nonnegative(),
  luminositySol: z.number().nonnegative(),
})

const baseStarSchema = z.discriminatedUnion('type', [
  mainSequenceStarSchema,
  compactStarSchema,
])

export const starSchema = baseStarSchema.superRefine((star, ctx) => {
  const profile = getStarProfile(star.type, 'class' in star ? star.class : undefined)
  const checks: Array<[field: string, value: number, range: Range]> = [
    ['temperatureK', star.temperatureK, profile.temperatureK],
    ['massSol', star.massSol, profile.massSol],
    ['radiusSol', star.radiusSol, profile.radiusSol],
    ['luminositySol', star.luminositySol, profile.luminositySol],
  ]
  for (const [field, value, range] of checks) {
    if (value < range.min || value > range.max) {
      ctx.addIssue({
        code: 'custom',
        path: [field],
        message: `${field}=${value} outside ${star.type}${star.type === 'main-sequence' ? `-${star.class}` : ''} range [${range.min}, ${range.max}]`,
      })
    }
  }
})

export type Star = z.infer<typeof starSchema>

export function validateStarRanges(star: Star, ctx: z.RefinementCtx) {
  const profile = getStarProfile(star.type, 'class' in star ? star.class : undefined)
  const checks: Array<[field: string, value: number, range: Range]> = [
    ['temperatureK', star.temperatureK, profile.temperatureK],
    ['massSol', star.massSol, profile.massSol],
    ['radiusSol', star.radiusSol, profile.radiusSol],
    ['luminositySol', star.luminositySol, profile.luminositySol],
  ]
  for (const [field, value, range] of checks) {
    if (value < range.min || value > range.max) {
      ctx.addIssue({
        code: 'custom',
        path: [field],
        message: `${field}=${value} outside ${star.type}${star.type === 'main-sequence' ? `-${star.class}` : ''} range [${range.min}, ${range.max}]`,
      })
    }
  }
}