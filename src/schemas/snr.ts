import { z } from 'zod'
import {
  SNR_TYPES,
  type SnrType,
  getSnrProfile,
  type SnrTypeProfile,
} from '../taxonomy/snr-types.ts'
import { loreFieldsSchema, snrIdSchema, galaxyIdSchema } from './common.ts'

type SnrRange = { min: number; max: number }

export const snrSchema = z
  .object({
    ...loreFieldsSchema.shape,
    id: snrIdSchema,
    galaxyId: galaxyIdSchema,
    type: z.enum(SNR_TYPES),
    coordinates: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    }),
    ageYr: z.number().int().positive(),
    radiusLy: z.number().positive(),
    expansionVelocityKms: z.number().positive(),
    temperatureK: z.number().positive(),
    luminosityXrayErgs: z.number().positive(),
    luminosityRadioErgs: z.number().positive(),
    magneticFieldMicroG: z.number().nonnegative(),
    densityCm3: z.number().positive(),
    sweptUpMassSol: z.number().positive(),
    ejectaMassSol: z.number().positive(),
    composition: z.array(z.string()).min(1),
    shockStage: z.enum(['free-expansion', 'sedov-taylor', 'radiative', 'plerionic']),
    hasPulsar: z.boolean(),
    hasPwn: z.boolean(),
    centralPulsarId: z.string().optional(),
    traits: z.array(z.string()).max(15).default([]),
    observedEffects: z.array(z.string()).max(10).default([]),
    dangerLevel: z.enum(['harmless', 'low', 'moderate', 'high', 'extreme']).default('moderate'),
  })
  .superRefine((snr, ctx) => {
    const profile = getSnrProfile(snr.type)
    const checks: Array<[field: string, value: number, range: SnrRange]> = [
      ['ageYr', snr.ageYr, profile.ageYr],
      ['radiusLy', snr.radiusLy, profile.radiusLy],
      ['expansionVelocityKms', snr.expansionVelocityKms, profile.expansionVelocityKms],
      ['temperatureK', snr.temperatureK, profile.temperatureK],
      ['luminosityXrayErgs', snr.luminosityXrayErgs, profile.luminosityXrayErgs],
      ['luminosityRadioErgs', snr.luminosityRadioErgs, profile.luminosityRadioErgs],
      ['magneticFieldMicroG', snr.magneticFieldMicroG, profile.magneticFieldMicroG],
      ['densityCm3', snr.densityCm3, profile.densityCm3],
      ['sweptUpMassSol', snr.sweptUpMassSol, profile.sweptUpMassSol],
      ['ejectaMassSol', snr.ejectaMassSol, profile.ejectaMassSol],
    ]
    for (const [field, value, range] of checks) {
      if (value < range.min || value > range.max) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: `${field}=${value} outside ${snr.type} SNR range [${range.min}, ${range.max}]`,
        })
      }
    }
    if (snr.shockStage !== profile.shockStage) {
      ctx.addIssue({
        code: 'custom',
        path: ['shockStage'],
        message: `shockStage '${snr.shockStage}' does not match ${snr.type} profile '${profile.shockStage}'`,
      })
    }
    if (snr.hasPulsar !== profile.hasPulsar) {
      ctx.addIssue({
        code: 'custom',
        path: ['hasPulsar'],
        message: `hasPulsar=${snr.hasPulsar} does not match ${snr.type} profile (${profile.hasPulsar})`,
      })
    }
    if (snr.hasPwn !== profile.hasPwn) {
      ctx.addIssue({
        code: 'custom',
        path: ['hasPwn'],
        message: `hasPwn=${snr.hasPwn} does not match ${snr.type} profile (${profile.hasPwn})`,
      })
    }
    if (snr.hasPulsar && !snr.centralPulsarId) {
      ctx.addIssue({
        code: 'custom',
        path: ['centralPulsarId'],
        message: 'centralPulsarId required when hasPulsar=true',
      })
    }
    const traitMatch = snr.traits.some((t) => profile.traits.includes(t))
    if (!traitMatch && snr.traits.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['traits'],
        message: `traits should include at least one from ${snr.type} profile: ${profile.traits.join(', ')}`,
      })
    }
  })

export type Snr = z.infer<typeof snrSchema>