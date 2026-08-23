import { z } from 'zod'
import { galaxyIdSchema, loreFieldsSchema } from './common.ts'

export const GALAXY_TYPES = ['spiral', 'barred-spiral', 'elliptical', 'irregular'] as const

export type GalaxyType = (typeof GALAXY_TYPES)[number]

export const galaxySchema = z
  .object({
    ...loreFieldsSchema.shape,
    id: galaxyIdSchema,
    type: z.enum(GALAXY_TYPES),
    diameterLy: z.number().positive(),
    thicknessLy: z.number().positive(),
    estimatedStarCount: z.number().int().positive(),
  })
  .refine((galaxy) => galaxy.thicknessLy <= galaxy.diameterLy, {
    message: 'thicknessLy cannot exceed diameterLy',
    path: ['thicknessLy'],
  })

export type Galaxy = z.infer<typeof galaxySchema>
