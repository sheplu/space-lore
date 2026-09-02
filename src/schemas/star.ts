import { z } from 'zod'
import {
  STAR_CLASS_PROFILES,
  STAR_TYPE_PROFILES,
  NEUTRON_STAR_SUBTYPE_PROFILES,
  NEUTRON_STAR_SUBTYPES,
  STAR_CLASSES,
  STAR_TYPES,
  type StarClass,
  type StarType,
  type NeutronStarSubtype,
  type Range,
  getStarProfile,
  getNeutronStarSubtypeProfile,
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

const neutronStarSchema = z.object({
  ...loreFieldsSchema.shape,
  id: starIdSchema,
  type: z.literal('neutron-star'),
  subtype: z.enum(NEUTRON_STAR_SUBTYPES).default('normal'),
  temperatureK: z.number().nonnegative(),
  massSol: z.number().positive(),
  radiusSol: z.number().nonnegative(),
  luminositySol: z.number().nonnegative(),
  periodSeconds: z.number().positive().optional(),
  periodDerivative: z.number().positive().optional(),
  magneticFieldGauss: z.number().positive().optional(),
})

const otherCompactStarSchema = z.object({
  ...loreFieldsSchema.shape,
  id: starIdSchema,
  type: z.enum(STAR_TYPES.filter((t) => t !== 'neutron-star')),
  temperatureK: z.number().nonnegative(),
  massSol: z.number().positive(),
  radiusSol: z.number().nonnegative(),
  luminositySol: z.number().nonnegative(),
})

const baseStarSchema = z.discriminatedUnion('type', [
  mainSequenceStarSchema,
  neutronStarSchema,
  otherCompactStarSchema,
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

  // Additional validation for neutron star subtypes
  if (star.type === 'neutron-star') {
    const subtype = star.subtype
    const subtypeProfile = getNeutronStarSubtypeProfile(subtype)
    const subtypeChecks: Array<[field: string, value: number | undefined, range: Range]> = [
      ['temperatureK', star.temperatureK, subtypeProfile.temperatureK],
      ['massSol', star.massSol, subtypeProfile.massSol],
      ['radiusSol', star.radiusSol, subtypeProfile.radiusSol],
      ['luminositySol', star.luminositySol, subtypeProfile.luminositySol],
      ['periodSeconds', star.periodSeconds, subtypeProfile.periodSeconds],
      ['periodDerivative', star.periodDerivative, subtypeProfile.periodDerivative],
      ['magneticFieldGauss', star.magneticFieldGauss, subtypeProfile.magneticFieldGauss],
    ]
    for (const [field, value, range] of subtypeChecks) {
      if (value !== undefined && (value < range.min || value > range.max)) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: `${field}=${value} outside ${star.type}-${subtype} range [${range.min}, ${range.max}]`,
        })
      }
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