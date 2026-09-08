// Client-side search index over loaded galaxy content.
// Pure data module: no DOM, no three.js — fully unit-testable.
import type { StarSystem } from '@/types/galaxy';

export type SearchEntryKind = 'system' | 'planet';

export interface SearchEntry {
  kind: SearchEntryKind;
  /** System id for systems, planet id for planets. */
  id: string;
  name: string;
  /** One-line context shown under the name, e.g. "oceanic planet · Emberwatch". */
  detail: string;
  /** Parent system id (equals id for systems). Used to navigate. */
  systemId: string;
  /** Present for planet entries. */
  planetId?: string;
  /** Lowercase searchable extras (tags). Never displayed. */
  keywords: string;
}

/** Build one flat entry list from every loaded system (+ embedded planets). */
export function buildSearchIndex(systems: Iterable<StarSystem>): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const system of systems) {
    const starSummary =
      system.stars.length > 0
        ? system.stars.map((s) => (s.type === 'main-sequence' && s.class ? `${s.class} star` : s.type)).join(' + ')
        : 'starless';
    entries.push({
      kind: 'system',
      id: system.id,
      name: system.name,
      detail: `${system.planets.length} planet${system.planets.length === 1 ? '' : 's'} · ${starSummary}`,
      systemId: system.id,
      keywords: system.tags.join(' ').toLowerCase(),
    });
    for (const planet of system.planets) {
      entries.push({
        kind: 'planet',
        id: planet.id,
        name: planet.name,
        detail: `${planet.type} planet · ${system.name}`,
        systemId: system.id,
        planetId: planet.id,
        keywords: [...planet.tags, ...system.tags].join(' ').toLowerCase(),
      });
    }
  }
  return entries;
}

interface Scored {
  entry: SearchEntry;
  score: number;
}

/**
 * Rank entries against a free-text query (case-insensitive, all tokens must match).
 * Name prefix > name substring > tag/type/detail match. Returns at most `limit`.
 */
export function searchEntries(entries: SearchEntry[], query: string, limit = 8): SearchEntry[] {
  const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return [];
  const scored: Scored[] = [];
  for (const entry of entries) {
    const name = entry.name.toLowerCase();
    const detail = entry.detail.toLowerCase();
    const keywords = entry.keywords;
    let score = 0;
    let matched = true;
    for (const token of tokens) {
      if (name.startsWith(token)) {
        score += 100;
      } else if (name.includes(token)) {
        score += 50;
      } else if (detail.includes(token) || keywords.includes(token)) {
        score += 10;
      } else {
        matched = false;
        break;
      }
    }
    if (matched) scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));
  return scored.slice(0, limit).map((s) => s.entry);
}
