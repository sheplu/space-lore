import { z } from 'zod'
import { deriveId } from '../primitives/id.ts'
import { coordinatesSchema } from '../primitives/coords.ts'
import { galaxyIdSchema, loreFieldsSchema, starSystemIdSchema } from './common.ts'
import { planetSchema } from './planet.ts'
import { dwarfPlanetSchema } from './dwarf-planet.ts'
import { asteroidSchema } from './asteroid.ts'
import { beltSchema } from './belt.ts'
import { cometSchema } from './comet.ts'
import { starSchema, validateStarRanges } from './star.ts'

export const MAX_STARS_PER_SYSTEM = 5
export const MAX_BODIES_PER_SYSTEM = 20

export const starOrbitSchema = z.object({
  index: z.number().int().positive(),
  starIds: z.array(z.string()).min(1).max(3),
})

export const starSystemSchema = z
  .object({
    ...loreFieldsSchema.shape,
    id: starSystemIdSchema,
    galaxyId: galaxyIdSchema,
    coordinates: coordinatesSchema,
    ageBillionYears: z.number().min(0.001).max(13.8),
    stars: z.array(starSchema).min(1).max(MAX_STARS_PER_SYSTEM),
    starOrbits: z.array(starOrbitSchema).optional().default([]),
    planets: z.array(planetSchema).default([]),
    dwarfPlanets: z.array(dwarfPlanetSchema).default([]),
    asteroids: z.array(asteroidSchema).default([]),
    belts: z.array(beltSchema).default([]),
    comets: z.array(cometSchema).default([]),
    planetNameMapping: z
      .record(z.string(), z.string())
      .optional()
      .default({}),
  })
  .superRefine((system, ctx) => {
    for (const star of system.stars) {
      validateStarRanges(star, ctx)
    }

    const allOrbitIndices: Array<{ index: number; type: string; id: string }> = []

    for (const planet of system.planets) {
      allOrbitIndices.push({ index: planet.orbitIndex, type: 'planet', id: planet.id })
    }
    for (const dp of system.dwarfPlanets) {
      allOrbitIndices.push({ index: dp.orbitIndex, type: 'dwarfPlanet', id: dp.id })
    }
    for (const ast of system.asteroids) {
      allOrbitIndices.push({ index: ast.orbitIndex, type: 'asteroid', id: ast.id })
    }
    for (const belt of system.belts) {
      allOrbitIndices.push({ index: belt.orbitIndex, type: 'belt', id: belt.id })
    }
    for (const comet of system.comets) {
      allOrbitIndices.push({ index: comet.orbitIndex, type: 'comet', id: comet.id })
    }

    const seen = new Map<number, Array<{ type: string; id: string }>>()
    for (const body of allOrbitIndices) {
      if (!seen.has(body.index)) {
        seen.set(body.index, [])
      }
      seen.get(body.index)!.push({ type: body.type, id: body.id })
    }

    for (const [index, bodies] of seen.entries()) {
      if (bodies.length > 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['orbitIndex'],
          message: `orbitIndex ${index} is used by multiple bodies: ${bodies.map((b) => `${b.type}:${b.id}`).join(', ')}`,
        })
      }
    }

    const expectedPlanetIds: string[] = []
    for (let orbitIndex = 1; orbitIndex <= MAX_BODIES_PER_SYSTEM; orbitIndex++) {
      const expectedId = deriveId('planet', system.id, orbitIndex)
      expectedPlanetIds.push(expectedId)
    }

    if (system.planetNameMapping) {
      const mappingKeys = Object.keys(system.planetNameMapping)
      for (const key of mappingKeys) {
        const isValidDerivation = expectedPlanetIds.includes(key)
        if (!isValidDerivation) {
          ctx.addIssue({
            code: 'custom',
            path: ['planetNameMapping', key],
            message: `planet id '${key}' in planetNameMapping does not match position-derived id for any orbit index (1-${MAX_BODIES_PER_SYSTEM})`,
          })
        }
      }
    }

    for (const belt of system.belts) {
      if (belt.largestBodyId) {
        const found = system.asteroids.some((a) => a.id === belt.largestBodyId)
        if (!found) {
          ctx.addIssue({
            code: 'custom',
            path: ['belts'],
            message: `belt '${belt.id}' references largestBodyId '${belt.largestBodyId}' which does not exist in system asteroids`,
          })
        }
      }
    }

    const starIds = system.stars.map((s) => s.id)
    for (const orbit of system.starOrbits) {
      for (const id of orbit.starIds) {
        if (!starIds.includes(id)) {
          ctx.addIssue({
            code: 'custom',
            path: ['starOrbits'],
            message: `starOrbit references unknown star id '${id}'`,
          })
        }
      }
    }
  })

export type StarSystem = z.infer<typeof starSystemSchema>
export type StarOrbit = z.infer<typeof starOrbitSchema>