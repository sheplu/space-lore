import { z } from 'zod'
import { coordinatesSchema } from '../primitives/coords.ts'
import { ANOMALY_CATEGORIES, DANGER_LEVELS } from '../taxonomy/anomaly-categories.ts'
import { anomalyIdSchema, loreFieldsSchema, planetIdSchema, starSystemIdSchema } from './common.ts'

export const anomalyLocationSchema = z.discriminatedUnion('scope', [
  z.object({ scope: z.literal('galaxy'), coordinates: coordinatesSchema }),
  z.object({ scope: z.literal('system'), systemId: starSystemIdSchema }),
  z.object({ scope: z.literal('planet'), planetId: planetIdSchema }),
])

export const anomalySchema = z.object({
  ...loreFieldsSchema.shape,
  id: anomalyIdSchema,
  category: z.enum(ANOMALY_CATEGORIES),
  dangerLevel: z.enum(DANGER_LEVELS),
  location: anomalyLocationSchema,
  observedEffects: z.array(z.string().trim().min(3).max(120)).min(1).max(10),
  containmentPossible: z.boolean(),
})

export type Anomaly = z.infer<typeof anomalySchema>
