import { z } from 'zod'
import { loreFieldsSchema, beltIdSchema, asteroidIdSchema } from './common.ts'

export const beltSchema = z
  .object({
    ...loreFieldsSchema.shape,
    id: beltIdSchema,
    orbitIndex: z.number().int().min(1),
    innerEdgeAu: z.number().positive(),
    outerEdgeAu: z.number().positive(),
    type: z.enum(['main', 'kuiper', 'scattered', 'trojan']),
    totalMassEarth: z.number().positive(),
    largestBodyId: asteroidIdSchema.optional(),
    composition: z.array(z.enum(['rocky', 'metallic', 'icy', 'carbonaceous'])).min(1),
  })
  .superRefine((belt, ctx) => {
    if (belt.innerEdgeAu >= belt.outerEdgeAu) {
      ctx.addIssue({
        code: 'custom',
        path: ['innerEdgeAu'],
        message: 'innerEdgeAu must be less than outerEdgeAu',
      })
    }
  })

export type Belt = z.infer<typeof beltSchema>