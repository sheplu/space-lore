import { z } from 'zod'

export const coordinatesSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
})

export type Coordinates3d = z.infer<typeof coordinatesSchema>

export function formatPositionKey(coords: Coordinates3d): string {
  return `${coords.x}|${coords.y}|${coords.z}`
}
