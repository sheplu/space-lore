import { createHash } from 'node:crypto'

export const ID_PREFIXES = {
  galaxy: 'gal',
  starSystem: 'sys',
  planet: 'plnt',
  anomaly: 'anom',
} as const

export type EntityKind = keyof typeof ID_PREFIXES

export const ENTITY_KINDS = Object.keys(ID_PREFIXES) as EntityKind[]

export function idPattern(kind: EntityKind): RegExp {
  return new RegExp(`^${ID_PREFIXES[kind]}-[0-9a-f]{8}$`)
}

export function deriveId(kind: EntityKind, ...positionParts: Array<string | number>): string {
  if (positionParts.length === 0) {
    throw new Error(`deriveId(${kind}) requires at least one position part`)
  }
  const key = positionParts.map(String).join('|')
  const hash = createHash('sha256').update(key, 'utf8').digest('hex').slice(0, 8)
  return `${ID_PREFIXES[kind]}-${hash}`
}
