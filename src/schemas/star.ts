import { z } from 'zod'
import { STAR_CLASS_PROFILES, STAR_CLASSES, type Range } from '../taxonomy/star-classes.ts'
import { loreFieldsSchema } from './common.ts'

export const starSchema = z
  .object({
    ...loreFieldsSchema.shape,
    class: z.enum(STAR_CLASSES),
    temperatureK: z.number().positive(),
    massSol: z.number().positive(),
    radiusSol: z.number().positive(),
    luminositySol: z.number().nonnegative(),
  })
  .superRefine((star, ctx) => {
    const profile = STAR_CLASS_PROFILES[star.class]
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
          message: `${field}=${value} outside ${profile.class}-class range [${range.min}, ${range.max}]`,
        })
      }
    }
  })

export type Star = z.infer<typeof starSchema>
