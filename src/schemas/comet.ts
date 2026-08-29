import { z } from 'zod'
import { loreFieldsSchema, cometIdSchema } from './common.ts'

export const COMET_TYPES = ['short-period', 'long-period', 'sungrazer', 'interstellar'] as const

export type CometType = (typeof COMET_TYPES)[number]

export const cometSchema = z
  .object({
    ...loreFieldsSchema.shape,
    id: cometIdSchema,
    orbitIndex: z.number().int().min(1),
    semiMajorAxisAu: z.number().positive(),
    eccentricity: z.number().min(0).max(1),
    inclinationDeg: z.number().min(0).max(180),
    perihelionAu: z.number().positive(),
    aphelionAu: z.number().positive(),
    orbitalPeriodYears: z.number().positive(),
    type: z.enum(COMET_TYPES),
    nucleusRadiusKm: z.number().positive(),
    isActive: z.boolean(),
    dustProductionRate: z.number().nonnegative().optional(),
    gasProductionRate: z.number().nonnegative().optional(),
  })
  .superRefine((comet, ctx) => {
    if (comet.perihelionAu >= comet.aphelionAu) {
      ctx.addIssue({
        code: 'custom',
        path: ['perihelionAu'],
        message: 'perihelionAu must be less than aphelionAu',
      })
    }
    if (comet.eccentricity < 0 || comet.eccentricity > 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['eccentricity'],
        message: 'eccentricity must be between 0 and 1',
      })
    }
  })

export type Comet = z.infer<typeof cometSchema>