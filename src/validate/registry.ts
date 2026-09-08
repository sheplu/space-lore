import { z } from 'zod'
import { anomalySchema, galaxySchema, starSystemSchema, planetSchema, moonSchema, asteroidSchema, beltSchema, dwarfPlanetSchema, cometSchema, nebulaSchema, clusterSchema, snrSchema } from '../schemas/index.ts'
import { starSystemIdSchema } from '../schemas/common.ts'

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
  'snr',
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
  snr: snrSchema,
  // Quadrant mappings are plain objects: systemId -> display name.
  // (validateJsonFile enforces the same shape with file-specific messages.)
  starSystemQuadrantMapping: z.record(starSystemIdSchema, z.string().trim().min(1).max(60)),
}
