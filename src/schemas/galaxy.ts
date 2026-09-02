import { z } from 'zod'
import {
  AGN_TYPES,
  type AgnType,
  getAgnProfile,
  type AgnTypeProfile,
} from '../taxonomy/agn-types.ts'
import { galaxyIdSchema, loreFieldsSchema } from './common.ts'

export const GALAXY_TYPES = ['spiral', 'barred-spiral', 'elliptical', 'irregular'] as const

export type GalaxyType = (typeof GALAXY_TYPES)[number]

type AgnRange = { min: number; max: number }

const agnSchema = z
  .object({
    type: z.enum(AGN_TYPES).optional(),
    blackHoleMassSol: z.number().positive().optional(),
    eddingtonRatio: z.number().min(0).max(10).optional(),
    bolometricLuminosityErgs: z.number().positive().optional(),
    xrayLuminosityErgs: z.number().positive().optional(),
    radioLuminosityErgs: z.number().positive().optional(),
    jetPowerErgs: z.number().positive().optional(),
    variabilityTimescaleDays: z.number().positive().optional(),
    openingAngleDeg: z.number().min(0).max(90).optional(),
    lorenztFactor: z.number().positive().optional(),
    traits: z.array(z.string()).max(15).default([]),
    observedEffects: z.array(z.string()).max(10).default([]),
    dangerLevel: z.enum(['harmless', 'low', 'moderate', 'high', 'extreme']).default('moderate'),
  })
  .superRefine((agn, ctx) => {
    if (!agn.type) return // No AGN present, skip validation
    const profile = getAgnProfile(agn.type)
    const checks: Array<[field: string, value: number | undefined, range: AgnRange]> = [
      ['blackHoleMassSol', agn.blackHoleMassSol, profile.blackHoleMassSol],
      ['eddingtonRatio', agn.eddingtonRatio, profile.eddingtonRatio],
      ['bolometricLuminosityErgs', agn.bolometricLuminosityErgs, profile.bolometricLuminosityErgs],
      ['xrayLuminosityErgs', agn.xrayLuminosityErgs, profile.xrayLuminosityErgs],
      ['radioLuminosityErgs', agn.radioLuminosityErgs, profile.radioLuminosityErgs],
      ['jetPowerErgs', agn.jetPowerErgs, profile.jetPowerErgs],
      ['variabilityTimescaleDays', agn.variabilityTimescaleDays, profile.variabilityTimescaleDays],
      ['openingAngleDeg', agn.openingAngleDeg, profile.openingAngleDeg],
      ['lorenztFactor', agn.lorenztFactor, profile.lorenztFactor],
    ]
    for (const [field, value, range] of checks) {
      if (value !== undefined && (value < range.min || value > range.max)) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: `${field}=${value} outside ${agn.type} AGN range [${range.min}, ${range.max}]`,
        })
      }
    }
    const traitMatch = agn.traits.some((t) => profile.traits.includes(t))
    if (!traitMatch && agn.traits.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['traits'],
        message: `traits should include at least one from ${agn.type} profile: ${profile.traits.join(', ')}`,
      })
    }
  })

export const galaxySchema = z
  .object({
    ...loreFieldsSchema.shape,
    id: galaxyIdSchema,
    type: z.enum(GALAXY_TYPES),
    diameterLy: z.number().positive(),
    thicknessLy: z.number().positive(),
    estimatedStarCount: z.number().int().positive(),
    agn: agnSchema.optional(),
  })
  .refine((galaxy) => galaxy.thicknessLy <= galaxy.diameterLy, {
    message: 'thicknessLy cannot exceed diameterLy',
    path: ['thicknessLy'],
  })

export type Galaxy = z.infer<typeof galaxySchema>
