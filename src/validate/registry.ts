import { z } from 'zod'
import { anomalySchema, galaxySchema, starSystemSchema, planetSchema } from '../schemas/index.ts'

export const CONTENT_KINDS = ['galaxy', 'starSystem', 'anomaly', 'planet', 'starSystemQuadrantMapping'] as const

export type ContentKind = (typeof CONTENT_KINDS)[number]

export const CONTENT_SCHEMAS: Record<ContentKind, z.ZodType> = {
  galaxy: galaxySchema,
  starSystem: starSystemSchema,
  anomaly: anomalySchema,
  planet: planetSchema,
  starSystemQuadrantMapping: z.object({
    systems: z.record(z.string(), z.string()).optional(),
  }),
}
