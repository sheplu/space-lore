import { z } from 'zod'
import { loreFieldsSchema, asteroidIdSchema } from './common.ts'

export const asteroidSchema = z
  .object({
    ...loreFieldsSchema.shape,
    id: asteroidIdSchema,
    orbitIndex: z.number().int().min(1),
    orbitalDistanceAu: z.number().positive(),
    type: z.enum(['rocky', 'metallic', 'icy', 'carbonaceous']),
    radiusKm: z.number().positive(),
    massKg: z.number().positive(),
    albedo: z.number().min(0).max(1),
    rotationPeriodHours: z.number().positive(),
  })

export type Asteroid = z.infer<typeof asteroidSchema>