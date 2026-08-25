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
    planetNameMapping: z
      .record(z.string(), z.string())
      .optional()
      .default({}),
  })
  .superRefine((system, ctx) => {
    const expectedPlanetIds: string[] = []
    for (let orbitIndex = 1; orbitIndex <= MAX_PLANETS_PER_SYSTEM; orbitIndex++) {
      const expectedId = deriveId('planet', system.id, orbitIndex)
      expectedPlanetIds.push(expectedId)
    }

    // Validate that planetNameMapping keys are valid planet IDs derived from this system
    if (system.planetNameMapping) {
      const mappingKeys = Object.keys(system.planetNameMapping)
      for (const key of mappingKeys) {
        const isValidDerivation = expectedPlanetIds.includes(key)
        if (!isValidDerivation) {
          ctx.addIssue({
            code: 'custom',
            path: ['planetNameMapping', key],
            message: `planet id '${key}' in planetNameMapping does not match position-derived id for any orbit index (1-${MAX_PLANETS_PER_SYSTEM})`,
          })
        }
      }
    }
  })

export type StarSystem = z.infer<typeof starSystemSchema>
