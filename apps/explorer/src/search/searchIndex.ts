// Client-side search index over loaded galaxy content.
// Pure data module: no DOM, no three.js — fully unit-testable.
import type { Anomaly, Cluster, Nebula, Snr, StarSystem, Vec3 } from '@/types/galaxy';

export type SearchEntryKind = 'system' | 'planet' | 'nebula' | 'cluster' | 'snr' | 'anomaly';

export interface SearchEntry {
  kind: SearchEntryKind;
  /** Entity id (system id for systems, planet id for planets, …). */
  id: string;
  name: string;
  /** One-line context shown under the name, e.g. "oceanic planet · Emberwatch". */
  detail: string;
  /** Parent system id for systems/planets (equals id for systems). */
  systemId?: string;
  /** Present for planet entries. */
  planetId?: string;
  /** Galaxy-space fly-to target for point entities (nebula/cluster/snr/anomaly). */
  point?: Vec3;
  /** Camera standoff distance for point fly-to. */
  approach?: number;
  /** Lowercase searchable extras (tags, types, categories). Never displayed. */
  keywords: string;
}

export interface SearchContent {
  systems: Iterable<StarSystem>;
  nebulae?: Iterable<Nebula>;
  clusters?: Iterable<Cluster>;
  snrs?: Iterable<Snr>;
  anomalies?: Iterable<Anomaly>;
}

/** Build one flat entry list from every loaded entity. */
export function buildSearchIndex(content: SearchContent): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const systemsById = new Map<string, StarSystem>();
  for (const system of content.systems) {
    systemsById.set(system.id, system);
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

  for (const nebula of content.nebulae ?? []) {
    entries.push({
      kind: 'nebula',
      id: nebula.id,
      name: nebula.name,
      detail: `${nebula.type} nebula · ${nebula.radiusLy} ly wide`,
      point: nebula.coordinates,
      approach: Math.max(nebula.radiusLy * 6, 800),
      keywords: [nebula.type, nebula.dangerLevel, ...nebula.tags].join(' ').toLowerCase(),
    });
  }

  for (const cluster of content.clusters ?? []) {
    entries.push({
      kind: 'cluster',
      id: cluster.id,
      name: cluster.name,
      detail: `${cluster.type} cluster · ${cluster.massSol.toLocaleString('en-US')} M☉`,
      point: cluster.coordinates,
      approach: Math.max(cluster.tidalRadiusLy * 6, 800),
      keywords: [cluster.type, ...cluster.tags].join(' ').toLowerCase(),
    });
  }

  for (const snr of content.snrs ?? []) {
    entries.push({
      kind: 'snr',
      id: snr.id,
      name: snr.name,
      detail: `${snr.type} remnant · ${snr.ageYr.toLocaleString('en-US')} yr old`,
      point: snr.coordinates,
      approach: Math.max(snr.radiusLy * 8, 600),
      keywords: [snr.type, snr.dangerLevel, ...snr.tags].join(' ').toLowerCase(),
    });
  }

  for (const anomaly of content.anomalies ?? []) {
    const point = anomalyPoint(anomaly, systemsById);
    if (!point) continue; // parent system/planet not loaded — nothing to fly to
    entries.push({
      kind: 'anomaly',
      id: anomaly.id,
      name: anomaly.name,
      detail: `${anomaly.category} anomaly · ${anomaly.dangerLevel}`,
      point,
      approach: 1500,
      keywords: [anomaly.category, anomaly.dangerLevel, ...anomaly.tags].join(' ').toLowerCase(),
    });
  }
  return entries;
}

/** Resolve an anomaly to galaxy-space coordinates via its binding. */
function anomalyPoint(anomaly: Anomaly, systemsById: Map<string, StarSystem>): Vec3 | null {
  const loc = anomaly.location;
  if (loc.scope === 'galaxy' && loc.coordinates) return loc.coordinates;
  if (loc.scope === 'system' && loc.systemId) {
    const system = systemsById.get(loc.systemId);
    return system ? system.coordinates : null;
  }
  if (loc.scope === 'planet' && loc.planetId) {
    for (const system of systemsById.values()) {
      if (system.planets.some((p) => p.id === loc.planetId)) return system.coordinates;
    }
    return null;
  }
  return null;
}

interface Scored {
  entry: SearchEntry;
  score: number;
}

/**
 * Rank entries against a free-text query (case-insensitive, all tokens must match).
 * Name prefix > name substring > detail/keyword match. Returns at most `limit`.
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
