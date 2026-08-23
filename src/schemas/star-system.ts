import { z } from 'zod'
import { deriveId } from '../primitives/id.ts'
import { coordinatesSchema } from '../primitives/coords.ts'
import { galaxyIdSchema, loreFieldsSchema, starSystemIdSchema } from './common.ts'
import { planetSchema } from './planet.ts'
import { starSchema } from './star.ts'

export const MAX_STARS_PER_SYSTEM = 5
export const MAX_PLANETS_PER_SYSTEM = 20

export const starSystemSchema = z
  .object({
    ...loreFieldsSchema.shape,
    id: starSystemIdSchema,
    galaxyId: galaxyIdSchema,
    coordinates: coordinatesSchema,
    ageBillionYears: z.number().min(0.001).max(13.8),
    stars: z.array(starSchema).min(1).max(MAX_STARS_PER_SYSTEM),
    planets: z.array(planetSchema).max(MAX_PLANETS_PER_SYSTEM),
  })
  .superRefine((system, ctx) => {
    let previousOrbit = 0
    for (const [index, planet] of system.planets.entries()) {
      if (planet.orbitIndex <= previousOrbit) {
        ctx.addIssue({
          code: 'custom',
          path: ['planets', index, 'orbitIndex'],
          message: `orbitIndex values must be strictly ascending, found ${planet.orbitIndex} after ${previousOrbit}`,
        })
        break
      }
      const expectedId = deriveId('planet', system.id, planet.orbitIndex)
      if (planet.id !== expectedId) {
        ctx.addIssue({
          code: 'custom',
          path: ['planets', index, 'id'],
          message: `planet id '${planet.id}' does not match position-derived id '${expectedId}' for orbit ${planet.orbitIndex}`,
        })
      }
      previousOrbit = planet.orbitIndex
    }
  })

export type StarSystem = z.infer<typeof starSystemSchema>
