import { z } from 'zod'
import {
  NEBULA_TYPES,
  type NebulaType,
  getNebulaProfile,
  type NebulaTypeProfile,
} from '../taxonomy/nebula-types.ts'
import { loreFieldsSchema, nebulaIdSchema, galaxyIdSchema, starSystemIdSchema } from './common.ts'

type NebulaRange = { min: number; max: number }

export const nebulaSchema = z
  .object({
    ...loreFieldsSchema.shape,
    id: nebulaIdSchema,
    galaxyId: galaxyIdSchema,
    type: z.enum(NEBULA_TYPES),
    coordinates: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    }),
    radiusLy: z.number().positive(),
    temperatureK: z.number().positive(),
    densityCm3: z.number().positive(),
    massSol: z.number().positive(),
    ionizationLevel: z.number().min(0).max(1),
    magneticFieldMicroG: z.number().nonnegative(),
    composition: z.array(z.string()).min(1),
    containedSystemIds: z.array(starSystemIdSchema).default([]),
    starFormationActivity: z.enum(['none', 'low', 'moderate', 'high', 'extreme']),
    colorPalette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).min(3).max(6),
    ageMyr: z.number().nonnegative().optional(),
    centralObjectId: z.string().optional(),
    observedEffects: z.array(z.string()).max(15).default([]),
    dangerLevel: z.enum(['harmless', 'low', 'moderate', 'high', 'extreme']).default('low'),
  })
  .superRefine((nebula, ctx) => {
    const profile = getNebulaProfile(nebula.type)
    const checks: Array<[field: string, value: number, range: NebulaRange]> = [
      ['temperatureK', nebula.temperatureK, profile.temperatureK],
      ['densityCm3', nebula.densityCm3, profile.densityCm3],
      ['radiusLy', nebula.radiusLy, profile.radiusLy],
      ['massSol', nebula.massSol, profile.massSol],
      ['ionizationLevel', nebula.ionizationLevel, profile.ionizationLevel],
      ['magneticFieldMicroG', nebula.magneticFieldMicroG, profile.magneticFieldMicroG],
    ]
    for (const [field, value, range] of checks) {
      if (value < range.min || value > range.max) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: `${field}=${value} outside ${nebula.type} nebula range [${range.min}, ${range.max}]`,
        })
      }
    }
    if (nebula.starFormationActivity !== profile.starFormationActivity) {
      ctx.addIssue({
        code: 'custom',
        path: ['starFormationActivity'],
        message: `starFormationActivity '${nebula.starFormationActivity}' does not match ${nebula.type} profile '${profile.starFormationActivity}'`,
      })
    }
    const paletteMatch = nebula.colorPalette.some((c) => profile.colorPalette.includes(c.toLowerCase()))
    if (!paletteMatch && nebula.colorPalette.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['colorPalette'],
        message: `colorPalette should include at least one color from ${nebula.type} profile: ${profile.colorPalette.join(', ')}`,
      })
    }
  })

export type Nebula = z.infer<typeof nebulaSchema>