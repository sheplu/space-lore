import { z } from 'zod'
import {
  STAR_CLASS_PROFILES,
  STAR_TYPE_PROFILES,
  NEUTRON_STAR_SUBTYPE_PROFILES,
  NEUTRON_STAR_SUBTYPES,
  XRB_SUBTYPE_PROFILES,
  XRB_SUBTYPES,
  BLACK_HOLE_SUBTYPE_PROFILES,
  BLACK_HOLE_SUBTYPES,
  STAR_CLASSES,
  STAR_TYPES,
  type StarClass,
  type StarType,
  type NeutronStarSubtype,
  type XrbSubtype,
  type BlackHoleSubtype,
  type Range,
  getStarProfile,
  getNeutronStarSubtypeProfile,
  getXrbSubtypeProfile,
  getBlackHoleSubtypeProfile,
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
  subtype: z.union([z.enum(NEUTRON_STAR_SUBTYPES), z.enum(XRB_SUBTYPES)]).default('normal'),
  temperatureK: z.number().nonnegative(),
  massSol: z.number().positive(),
  radiusSol: z.number().nonnegative(),
  luminositySol: z.number().nonnegative(),
  periodSeconds: z.number().positive().optional(),
  periodDerivative: z.number().positive().optional(),
  magneticFieldGauss: z.number().positive().optional(),
  xrayLuminosityErgs: z.number().positive().optional(),
  accretionRateEddington: z.number().positive().optional(),
  diskTemperatureK: z.number().positive().optional(),
  hasJets: z.boolean().optional(),
  jetPowerErgs: z.number().positive().optional(),
})

const blackHoleSchema = z.object({
  ...loreFieldsSchema.shape,
  id: starIdSchema,
  type: z.literal('black-hole'),
  subtype: z.enum(BLACK_HOLE_SUBTYPES).default('normal'),
  temperatureK: z.number().nonnegative(),
  massSol: z.number().positive(),
  radiusSol: z.number().nonnegative(),
  luminositySol: z.number().nonnegative(),
  xrayLuminosityErgs: z.number().positive().optional(),
  accretionRateEddington: z.number().positive().optional(),
  diskTemperatureK: z.number().positive().optional(),
  hasJets: z.boolean().optional(),
  jetPowerErgs: z.number().positive().optional(),
})

const otherCompactStarSchema = z.object({
  ...loreFieldsSchema.shape,
  id: starIdSchema,
  type: z.enum(STAR_TYPES.filter((t) => t !== 'neutron-star' && t !== 'black-hole')),
  temperatureK: z.number().nonnegative(),
  massSol: z.number().positive(),
  radiusSol: z.number().nonnegative(),
  luminositySol: z.number().nonnegative(),
})

const baseStarSchema = z.discriminatedUnion('type', [
  mainSequenceStarSchema,
  neutronStarSchema,
  blackHoleSchema,
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
    const isXrb = XRB_SUBTYPES.includes(subtype as XrbSubtype)
    
    if (isXrb) {
      const subtypeProfile = getXrbSubtypeProfile(subtype as XrbSubtype)
      const baseChecks: Array<[field: string, value: number | undefined, range: Range]> = [
        ['temperatureK', star.temperatureK, subtypeProfile.temperatureK],
        ['massSol', star.massSol, subtypeProfile.massSol],
        ['radiusSol', star.radiusSol, subtypeProfile.radiusSol],
        ['luminositySol', star.luminositySol, subtypeProfile.luminositySol],
      ]
      const xrbChecks: Array<[field: string, value: number | undefined, range: Range]> = [
        ['xrayLuminosityErgs', star.xrayLuminosityErgs, subtypeProfile.xrayLuminosityErgs],
        ['accretionRateEddington', star.accretionRateEddington, subtypeProfile.accretionRateEddington],
        ['diskTemperatureK', star.diskTemperatureK, subtypeProfile.diskTemperatureK],
        ['jetPowerErgs', star.jetPowerErgs, subtypeProfile.jetPowerErgs],
      ]
      const hasJetsCheck = star.hasJets !== undefined && subtypeProfile.hasJets !== star.hasJets
      
      const checks = [...baseChecks, ...xrbChecks]
      
      for (const [field, value, range] of checks) {
        if (value !== undefined && (value < range.min || value > range.max)) {
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: `${field}=${value} outside ${star.type}-${subtype} range [${range.min}, ${range.max}]`,
          })
        }
      }
      if (hasJetsCheck) {
        ctx.addIssue({
          code: 'custom',
          path: ['hasJets'],
          message: `hasJets=${star.hasJets} does not match ${star.type}-${subtype} (expected ${subtypeProfile.hasJets})`,
        })
      }
    } else {
      const subtypeProfile = getNeutronStarSubtypeProfile(subtype as NeutronStarSubtype)
      const baseChecks: Array<[field: string, value: number | undefined, range: Range]> = [
        ['temperatureK', star.temperatureK, subtypeProfile.temperatureK],
        ['massSol', star.massSol, subtypeProfile.massSol],
        ['radiusSol', star.radiusSol, subtypeProfile.radiusSol],
        ['luminositySol', star.luminositySol, subtypeProfile.luminositySol],
      ]
      const nsChecks: Array<[field: string, value: number | undefined, range: Range]> = [
        ['periodSeconds', star.periodSeconds, subtypeProfile.periodSeconds],
        ['periodDerivative', star.periodDerivative, subtypeProfile.periodDerivative],
        ['magneticFieldGauss', star.magneticFieldGauss, subtypeProfile.magneticFieldGauss],
      ]
      
      const checks = [...baseChecks, ...nsChecks]
      
      for (const [field, value, range] of checks) {
        if (value !== undefined && (value < range.min || value > range.max)) {
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: `${field}=${value} outside ${star.type}-${subtype} range [${range.min}, ${range.max}]`,
          })
        }
      }
    }
  }

  // Additional validation for black hole subtypes
  if (star.type === 'black-hole') {
    const subtype = star.subtype
    const subtypeProfile = getBlackHoleSubtypeProfile(subtype)
    const subtypeChecks: Array<[field: string, value: number | undefined, range: Range]> = [
      ['temperatureK', star.temperatureK, subtypeProfile.temperatureK],
      ['massSol', star.massSol, subtypeProfile.massSol],
      ['radiusSol', star.radiusSol, subtypeProfile.radiusSol],
      ['luminositySol', star.luminositySol, subtypeProfile.luminositySol],
      ['xrayLuminosityErgs', star.xrayLuminosityErgs, subtypeProfile.xrayLuminosityErgs],
      ['accretionRateEddington', star.accretionRateEddington, subtypeProfile.accretionRateEddington],
      ['diskTemperatureK', star.diskTemperatureK, subtypeProfile.diskTemperatureK],
      ['jetPowerErgs', star.jetPowerErgs, subtypeProfile.jetPowerErgs],
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
    // Boolean field checks
    if (star.hasJets !== undefined && star.hasJets !== subtypeProfile.hasJets) {
      ctx.addIssue({
        code: 'custom',
        path: ['hasJets'],
        message: `hasJets=${star.hasJets} does not match ${star.type}-${subtype} (expected ${subtypeProfile.hasJets})`,
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