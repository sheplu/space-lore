import { z } from 'zod'
import { anomalySchema, galaxySchema, starSystemSchema, planetSchema } from '../schemas/index.ts'

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
  'starSystemQuadrantMapping',
] as const

export type ContentKind = (typeof CONTENT_KINDS)[number]

export const CONTENT_SCHEMAS: Record<ContentKind, z.ZodType> = {
  galaxy: galaxySchema,
  starSystem: starSystemSchema,
  anomaly: anomalySchema,
  planet: planetSchema,
  moon: planetSchema, // moons are embedded in planets, validated via starSystem
  asteroid: planetSchema, // asteroids are embedded in starSystem
  belt: planetSchema, // belts are embedded in starSystem
  dwarfPlanet: planetSchema, // dwarf planets are embedded in starSystem
  comet: planetSchema, // comets are embedded in starSystem
  starSystemQuadrantMapping: z.object({
    systems: z.record(z.string(), z.string()).optional(),
  }),
}
