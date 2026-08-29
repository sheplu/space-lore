import { z } from 'zod'
import { loreFieldsSchema, moonIdSchema, planetIdSchema } from './common.ts'

export const moonSchema = z
  .object({
    ...loreFieldsSchema.shape,
    id: moonIdSchema,
    planetId: planetIdSchema,
    orbitIndex: z.number().int().min(1),
    orbitalDistanceKm: z.number().positive(),
    type: z.enum(['rocky', 'icy', 'volcanic', 'captured-asteroid', 'shepherd']),
    radiusKm: z.number().positive(),
    gravityG: z.number().nonnegative(),
    hasAtmosphere: z.boolean(),
  })

export type Moon = z.infer<typeof moonSchema>