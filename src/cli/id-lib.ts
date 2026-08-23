import { ID_PREFIXES, deriveId, type EntityKind } from '../primitives/id.ts'

const KIND_ALIASES: Record<string, EntityKind> = Object.fromEntries(
  Object.entries(ID_PREFIXES).flatMap(([kind, prefix]) => [
    [kind, kind as EntityKind],
    [prefix, kind as EntityKind],
  ]),
)

export const USAGE_MESSAGE = `Usage: npm run id -- <kind> <parts...>
kinds: ${Object.keys(KIND_ALIASES).join(', ')}
examples:
  npm run id -- galaxy "andromeda-rise"
  npm run id -- sys gal-1a2b3c4d 1200 -34000 550
  npm run id -- plnt sys-9f8e7d6c 3
  npm run id -- anom gal-1a2b3c4d 5000 100 -2200`

export class IdUsageError extends Error {}

export function resolveIdArgs(positionals: string[]): string {
  const kind = KIND_ALIASES[positionals[0] ?? '']
  const parts = positionals.slice(1)
  if (!kind || parts.length === 0) {
    throw new IdUsageError(USAGE_MESSAGE)
  }
  return deriveId(kind, ...parts)
}
