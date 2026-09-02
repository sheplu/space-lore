import { z } from 'zod'
import { anomalySchema, galaxySchema, starSystemSchema, planetSchema, moonSchema, asteroidSchema, beltSchema, dwarfPlanetSchema, cometSchema, nebulaSchema, clusterSchema } from '../schemas/index.ts'

export const CONTENT_KINDS = [
  'galaxy',
  'starSystem',
  'anomaly',
  'planet',
  'moon',
  'asteroid',
  'belt',
  'dwarfPlanet',
  'comet',
  'nebula',
  'cluster',
  'starSystemQuadrantMapping',
] as const

export type ContentKind = (typeof CONTENT_KINDS)[number]

export const CONTENT_SCHEMAS: Record<ContentKind, z.ZodType> = {
  galaxy: galaxySchema,
  starSystem: starSystemSchema,
  anomaly: anomalySchema,
  planet: planetSchema,
  moon: moonSchema,
  asteroid: asteroidSchema,
  belt: beltSchema,
  dwarfPlanet: dwarfPlanetSchema,
  comet: cometSchema,
  nebula: nebulaSchema,
  cluster: clusterSchema,
  starSystemQuadrantMapping: z.object({
    systems: z.record(z.string(), z.string()).optional(),
  }),
}
