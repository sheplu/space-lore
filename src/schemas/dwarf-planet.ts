import { z } from 'zod'
import { loreFieldsSchema, dwarfPlanetIdSchema } from './common.ts'

export const DWARF_PLANET_TYPES = ['icy', 'rocky', 'hybrid'] as const

export type DwarfPlanetType = (typeof DWARF_PLANET_TYPES)[number]

export const dwarfPlanetSchema = z
  .object({
    ...loreFieldsSchema.shape,
    id: dwarfPlanetIdSchema,
    orbitIndex: z.number().int().min(1),
    orbitalDistanceAu: z.number().positive(),
    type: z.enum(DWARF_PLANET_TYPES),
    radiusKm: z.number().positive(),
    gravityG: z.number().nonnegative(),
    meanTempC: z.number(),
    hasAtmosphere: z.boolean(),
    moonCount: z.number().int().min(0).max(5),
  })

export type DwarfPlanet = z.infer<typeof dwarfPlanetSchema>