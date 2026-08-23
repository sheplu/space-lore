import type { z } from 'zod'
import { anomalySchema, galaxySchema, starSystemSchema } from '../schemas/index.ts'

export const CONTENT_KINDS = ['galaxy', 'starSystem', 'anomaly'] as const

export type ContentKind = (typeof CONTENT_KINDS)[number]

export const CONTENT_SCHEMAS: Record<ContentKind, z.ZodType> = {
  galaxy: galaxySchema,
  starSystem: starSystemSchema,
  anomaly: anomalySchema,
}
