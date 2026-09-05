// Content loader - loads all galaxy data from JSON files
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, dirname, basename } from 'node:path';
import { 
  Galaxy, StarSystem, Nebula, Cluster, Snr, Anomaly, 
  GalaxyRenderData, QuadrantName, QuadrantMapping, Vec3,
  ContentKind
} from '@/types/galaxy';

interface RawFile {
  path: string;
  kind: ContentKind | null;
  data: unknown;
}

export class ContentLoader {
  private contentRoot: string;
  private cache: Map<string, unknown> = new Map();

  constructor(contentRoot: string) {
    this.contentRoot = contentRoot;
  }

  async listGalaxies(): Promise<Array<{ id: string; name: string; type: string }>> {
    const galaxies: Array<{ id: string; name: string; type: string }> = [];
    const entries = readdirSync(this.contentRoot, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('gal-')) {
        const galaxyPath = join(this.contentRoot, entry.name, 'galaxy.json');
        try {
          const data = JSON.parse(readFileSync(galaxyPath, 'utf8')) as { id: string; name: string; type: string };
          galaxies.push({ id: data.id, name: data.name, type: data.type });
        } catch {
          // Invalid galaxy file
        }
      }
    }
    
    return galaxies;
  }

  async loadGalaxy(galaxyId: string): Promise<GalaxyRenderData> {
    const galaxyDir = join(this.contentRoot, galaxyId);
    const galaxyPath = join(galaxyDir, 'galaxy.json');
    
    const galaxy = JSON.parse(readFileSync(galaxyPath, 'utf8')) as Galaxy;
    
    // Load all content
    const systems = new Map<string, StarSystem>();
    const nebulae = new Map<string, Nebula>();
    const clusters = new Map<string, Cluster>();
    const snrs = new Map<string, Snr>();
    const anomalies = new Map<string, Anomaly>();
    const quadrantMappings = new Map<string, QuadrantMapping>();
    
    // Load star systems
    const systemsDir = join(galaxyDir, 'systems');
    if (await this.dirExists(join(galaxyDir, 'systems'))) {
      const systemFiles = this.listJsonFiles(join(galaxyDir, 'systems'));
      for (const file of systemFiles) {
        const system = JSON.parse(readFileSync(file, 'utf8')) as StarSystem;
        systems.set(system.id, system);
      }
    }
    
    // Load nebulae
    if (await this.dirExists(join(galaxyDir, 'nebulae'))) {
      const nebulaFiles = this.listJsonFiles(join(galaxyDir, 'nebulae'));
      for (const file of nebulaFiles) {
        const nebula = JSON.parse(readFileSync(file, 'utf8')) as Nebula;
        nebulae.set(nebula.id, nebula);
      }
    }
    
    // Load clusters
    if (await this.dirExists(join(galaxyDir, 'clusters'))) {
      const clusterFiles = this.listJsonFiles(join(galaxyDir, 'clusters'));
      for (const file of clusterFiles) {
        const cluster = JSON.parse(readFileSync(file, 'utf8')) as Cluster;
        clusters.set(cluster.id, cluster);
      }
    }
    
    // Load SNRs
    if (await this.dirExists(join(galaxyDir, 'snr'))) {
      const snrFiles = this.listJsonFiles(join(galaxyDir, 'snr'));
      for (const file of snrFiles) {
        const snr = JSON.parse(readFileSync(file, 'utf8')) as Snr;
        snrs.set(snr.id, snr);
      }
    }
    
    // Load anomalies
    if (await this.dirExists(join(galaxyDir, 'anomalies'))) {
      const anomalyFiles = this.listJsonFiles(join(galaxyDir, 'anomalies'));
      for (const file of anomalyFiles) {
        const anomaly = JSON.parse(readFileSync(file, 'utf8')) as Anomaly;
        anomalies.set(anomaly.id, anomaly);
      }
    }
    
    // Load quadrant mappings
    if (await this.dirExists(join(galaxyDir, 'quadrants'))) {
      const quadrants = ['core', 'inner-arm', 'outer-arm', 'halo', 'bar', 'inner-halo', 'outer-halo', 'central', 'region-1', 'region-2', 'region-3'];
      for (const q of quadrants) {
        const qPath = join(galaxyDir, 'quadrants', q, 'systems.json');
        if (await this.fileExists(qPath)) {
          const data = JSON.parse(readFileSync(qPath, 'utf8')) as QuadrantMapping;
          quadrantMappings.set(q as QuadrantName, data);
        }
      }
    }
    
    return {
      galaxy: { ...galaxy },
      systems,
      nebulae,
      clusters,
      snrs,
      anomalies,
      quadrantMappings,
    };
  }

  private async dirExists(path: string): Promise<boolean> {
    try {
      const stat = statSync(path);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      const stat = statSync(path);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  private listJsonFiles(dir: string): string[] {
    try {
      const files = readdirSync(dir);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => join(dir, f));
    } catch {
      return [];
    }
  }

  detectKind(filePath: string): ContentKind | null {
    const base = basename(filePath);
    if (base === 'galaxy.json') return 'galaxy';
    if (base === 'systems.json') return 'starSystemQuadrantMapping';
    if (base.endsWith('.json')) {
      if (base.startsWith('sys-')) return 'starSystem';
      if (base.startsWith('neb-')) return 'nebula';
      if (base.startsWith('clu-')) return 'cluster';
      if (base.startsWith('snr-')) return 'snr';
      if (base.startsWith('anom-')) return 'anomaly';
    }
    if (filePath.includes('/systems/') && base.startsWith('sys-')) return 'starSystem';
    if (filePath.includes('/nebulae/') && base.startsWith('neb-')) return 'nebula';
    if (filePath.includes('/clusters/') && base.startsWith('clu-')) return 'cluster';
    if (filePath.includes('/snr/') && base.startsWith('snr-')) return 'snr';
    if (filePath.includes('/anomalies/') && base.startsWith('anom-')) return 'anomaly';
    return null;
  }

  dispose(): void {
    this.cache.clear();
  }
}