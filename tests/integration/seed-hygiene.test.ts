import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

// Seed-content hygiene: committed lore must never contain authoring markers.
// Structural floors (name/description lengths) are enforced by schemas;
// this guards the semantic leftovers schemas cannot see.
const BANNED = ['placeholder', 'todo', 'fixme', 'lorem', 'must be replaced', 'tbd']

function jsonFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...jsonFiles(full))
    else if (entry.endsWith('.json')) out.push(full)
  }
  return out
}

function findings(raw: string): string[] {
  const lower = raw.toLowerCase()
  return BANNED.filter((marker) => lower.includes(marker))
}

describe('seed content hygiene', () => {
  it('contains no authoring markers', () => {
    const root = join(import.meta.dirname, '..', '..', 'content')
    const offenders: string[] = []
    for (const file of jsonFiles(root)) {
      const hit = findings(readFileSync(file, 'utf8'))
      if (hit.length > 0) offenders.push(`${file}: ${hit.join(', ')}`)
    }
    assert.deepEqual(offenders, [])
  })
})
