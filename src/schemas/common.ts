import { z } from 'zod'
import { idPattern, type EntityKind } from '../primitives/id.ts'

export const loreFieldsSchema = z.object({
  name: z.string().trim().min(3).max(60),
  description: z.string().trim().min(80).max(2000),
  tags: z.array(z.string().trim().min(1).max(30)).max(10),
})

export function entityIdSchema(kind: EntityKind) {
  return z
    .string()
    .regex(idPattern(kind), {
      message: `invalid ${kind} id, expected format '${idPattern(kind).source}' (derive it with: npm run id -- ${kind} <parts...>)`,
    })
}

export const galaxyIdSchema = entityIdSchema('galaxy')
export const starSystemIdSchema = entityIdSchema('starSystem')
export const starIdSchema = entityIdSchema('star')
export const planetIdSchema = entityIdSchema('planet')
export const moonIdSchema = entityIdSchema('moon')
export const asteroidIdSchema = entityIdSchema('asteroid')
export const beltIdSchema = entityIdSchema('belt')
export const dwarfPlanetIdSchema = entityIdSchema('dwarfPlanet')
export const cometIdSchema = entityIdSchema('comet')
export const anomalyIdSchema = entityIdSchema('anomaly')
