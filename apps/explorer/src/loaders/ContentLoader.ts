// Content loader - loads all galaxy data from JSON files via HTTP
import {
  Galaxy, StarSystem, Nebula, Cluster, Snr, Anomaly,
  QuadrantMapping,
} from '@/types/galaxy';

const API_BASE = '/api/content';
const KNOWN_QUADRANTS = [
  'core', 'inner-arm', 'outer-arm', 'halo', 'bar',
  'inner-halo', 'outer-halo', 'central',
  'region-1', 'region-2', 'region-3',
];

export class ContentLoader {
  private baseUrl: string;
  private cache: Map<string, unknown> = new Map();

  constructor(baseUrl: string = '/content') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return response.json() as Promise<T>;
    } catch {
      return null;
    }
  }

  private async listDirectory(dirPath: string): Promise<Array<{ name: string; path: string; isDirectory: boolean }>> {
    try {
      const clean = dirPath.replace(/^\/+/, '').replace(/\/+$/, '');
      const response = await fetch(clean ? `${API_BASE}/${clean}` : API_BASE);
      if (!response.ok) return [];
      return response.json() as Promise<Array<{ name: string; path: string; isDirectory: boolean }>>;
    } catch {
      return [];
    }
  }

  async listGalaxies(): Promise<Array<{ id: string; name: string; type: string }>> {
    const entries = await this.listDirectory('');
    const galaxies: Array<{ id: string; name: string; type: string }> = [];
    
    for (const entry of entries) {
      if (entry.isDirectory && entry.name.startsWith('gal-')) {
        const galaxy = await this.fetchJson<{ id: string; name: string; type: string }>(`${this.baseUrl}/${entry.name}/galaxy.json`);
        if (galaxy) {
          galaxies.push({ id: galaxy.id, name: galaxy.name, type: galaxy.type });
        }
      }
    }
    
    return galaxies;
  }

  async loadGalaxy(galaxyId: string): Promise<{
    galaxy: Galaxy;
    systems: Map<string, StarSystem>;
    nebulae: Map<string, Nebula>;
    clusters: Map<string, Cluster>;
    snrs: Map<string, Snr>;
    anomalies: Map<string, Anomaly>;
    quadrantMappings: Map<string, QuadrantMapping>;
  }> {
    // Load all content in parallel
    const [
      galaxyRes,
      systemsEntries,
      nebulaeEntries,
      clustersEntries,
      snrsEntries,
      anomaliesEntries,
    ] = await Promise.all([
      this.fetchJson<Galaxy>(`${this.baseUrl}/${galaxyId}/galaxy.json`),
      this.listDirectory(`${galaxyId}/systems`),
      this.listDirectory(`${galaxyId}/nebulae`),
      this.listDirectory(`${galaxyId}/clusters`),
      this.listDirectory(`${galaxyId}/snr`),
      this.listDirectory(`${galaxyId}/anomalies`),
    ]);

    const galaxy = galaxyRes;
    if (!galaxy) {
      throw new Error(`Failed to load galaxy ${galaxyId}`);
    }
    
    // Load all systems from individual files
    const systems = new Map<string, StarSystem>();
    const systemFiles = systemsEntries.filter((e) => !e.isDirectory && e.name.endsWith('.json'));
    const loadedSystems = await Promise.all(
      systemFiles.map((e) => this.fetchJson<StarSystem>(`${this.baseUrl}/${galaxyId}/systems/${e.name}`)),
    );
    for (const system of loadedSystems) {
      if (system) systems.set(system.id, system);
    }
    
    // Load nebulae from individual files
    const nebulae = new Map<string, Nebula>();
    for (const entry of nebulaeEntries) {
      if (!entry.isDirectory && entry.name.endsWith('.json')) {
        const nebula = await this.fetchJson<Nebula>(`${this.baseUrl}/${galaxyId}/nebulae/${entry.name}`);
        if (nebula) {
          nebulae.set(nebula.id, nebula);
        }
      }
    }
    
    // Load clusters
    const clusters = new Map<string, Cluster>();
    for (const entry of clustersEntries) {
      if (!entry.isDirectory && entry.name.endsWith('.json')) {
        const cluster = await this.fetchJson<Cluster>(`${this.baseUrl}/${galaxyId}/clusters/${entry.name}`);
        if (cluster) {
          clusters.set(cluster.id, cluster);
        }
      }
    }
    
    // Load SNRs
    const snrs = new Map<string, Snr>();
    for (const entry of snrsEntries) {
      if (!entry.isDirectory && entry.name.endsWith('.json')) {
        const snr = await this.fetchJson<Snr>(`${this.baseUrl}/${galaxyId}/snr/${entry.name}`);
        if (snr) {
          snrs.set(snr.id, snr);
        }
      }
    }
    
    // Load anomalies
    const anomalies = new Map<string, Anomaly>();
    for (const entry of anomaliesEntries) {
      if (!entry.isDirectory && entry.name.endsWith('.json')) {
        const anomaly = await this.fetchJson<Anomaly>(`${this.baseUrl}/${galaxyId}/anomalies/${entry.name}`);
        if (anomaly) {
          anomalies.set(anomaly.id, anomaly);
        }
      }
    }
    
    // Load quadrant mappings (one systems.json per quadrant dir)
    const quadrantMappings = new Map<string, QuadrantMapping>();
    const quadrantResults = await Promise.all(
      KNOWN_QUADRANTS.map(async (q) => ({
        q,
        mapping: await this.fetchJson<QuadrantMapping>(`${this.baseUrl}/${galaxyId}/${q}/systems.json`),
      })),
    );
    for (const { q, mapping } of quadrantResults) {
      if (mapping) quadrantMappings.set(q, mapping);
    }
    
    return {
      galaxy,
      systems,
      nebulae,
      clusters,
      snrs,
      anomalies,
      quadrantMappings,
    };
  }

  async loadSystem(systemId: string): Promise<StarSystem | null> {
    return this.fetchJson<StarSystem>(`${this.baseUrl}/${systemId}.json`);
  }

  dispose(): void {
    this.cache.clear();
  }
}
