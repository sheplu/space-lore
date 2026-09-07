// Quadrant overlay — the middle zoom layer between galaxy and star system.
//
// Classification is resolved in two steps (cheap, done once at build):
//  1. content quadrant mappings (`<galaxy>/<quadrant>/systems.json`), when present
//  2. radial fallback from system coordinates (core / inner-arm / outer-arm / halo)
//
// Rendering cost is intentionally tiny: one label sprite + one flat ring per
// quadrant, with distance-based fading so the layer disappears when it adds
// no information (very far out, or inside a system / planet view).
import * as THREE from 'three';
import { Galaxy, StarSystem, QuadrantMapping } from '@/types/galaxy';

export type QuadrantId = 'core' | 'inner-arm' | 'outer-arm' | 'halo';

export const QUADRANT_IDS: QuadrantId[] = ['core', 'inner-arm', 'outer-arm', 'halo'];

export const QUADRANT_COLORS: Record<QuadrantId, number> = {
  'core': 0xffd9a0,
  'inner-arm': 0x7db8ff,
  'outer-arm': 0x59e6ff,
  'halo': 0xb9a7ff,
};

export const QUADRANT_LABELS: Record<QuadrantId, string> = {
  'core': 'Core',
  'inner-arm': 'Inner Arm',
  'outer-arm': 'Outer Arm',
  'halo': 'Halo',
};

interface QuadrantInfo {
  id: QuadrantId;
  systems: StarSystem[];
  centroid: THREE.Vector3;
  label: THREE.Sprite | null;
  ring: THREE.Mesh | null;
}

function normalizeQuadrantName(name: string): QuadrantId | null {
  const n = name.toLowerCase();
  if (n.includes('core') || n === 'central' || n === 'bar') return 'core';
  if (n.includes('inner')) return 'inner-arm';
  if (n.includes('outer')) return 'outer-arm';
  if (n.includes('halo')) return 'halo';
  return null;
}

export class QuadrantOverlay {
  private scene: THREE.Scene;
  private galaxy: Galaxy;
  private systems: Map<string, StarSystem>;
  private mappings: Map<string, QuadrantMapping>;
  private quadrants = new Map<QuadrantId, QuadrantInfo>();
  private classification = new Map<string, QuadrantId>();
  private built = false;

  constructor(
    scene: THREE.Scene,
    data: {
      galaxy: Galaxy;
      systems: Map<string, StarSystem>;
      quadrantMappings?: Map<string, QuadrantMapping>;
    },
  ) {
    this.scene = scene;
    this.galaxy = data.galaxy;
    this.systems = data.systems;
    this.mappings = data.quadrantMappings ?? new Map();
  }

  build(): void {
    if (this.built) return;
    this.built = true;
    this.classifyAll();

    const radius = this.galaxy.diameterLy / 2;
    for (const q of QUADRANT_IDS) {
      const systems = [...this.systems.values()].filter(
        (s) => this.classification.get(s.id) === q,
      );
      const centroid = this.computeCentroid(systems);
      const label = this.createLabel(q, systems.length, centroid, radius);
      const ring = this.createRing(q, radius);
      if (label) this.scene.add(label);
      if (ring) this.scene.add(ring);
      this.quadrants.set(q, { id: q, systems, centroid, label, ring });
    }
  }

  /** Quadrant for a system id (radial fallback when content has no mapping). */
  classify(systemId: string): QuadrantId {
    return this.classification.get(systemId) ?? 'outer-arm';
  }

  /** Tint color for a system id — consumed by the galaxy marker cloud. */
  colorFor(systemId: string): THREE.Color {
    return new THREE.Color(QUADRANT_COLORS[this.classify(systemId)] ?? 0x66ffff);
  }

  centroidOf(q: QuadrantId): THREE.Vector3 {
    return this.quadrants.get(q)?.centroid.clone() ?? new THREE.Vector3();
  }

  systemsIn(q: QuadrantId): StarSystem[] {
    return this.quadrants.get(q)?.systems ?? [];
  }

  /** Nearest quadrant centroid to a world-space point (for Q-key travel). */
  nearestQuadrant(point: THREE.Vector3): QuadrantId {
    let best: QuadrantId = 'core';
    let bestDist = Infinity;
    for (const q of QUADRANT_IDS) {
      const c = this.quadrants.get(q)?.centroid;
      if (!c) continue;
      const d = c.distanceToSquared(point);
      if (d < bestDist) {
        bestDist = d;
        best = q;
      }
    }
    return best;
  }

  /** Framing distance for a quadrant focus flight. */
  focusDistance(q: QuadrantId): number {
    const radius = this.galaxy.diameterLy / 2;
    const count = this.quadrants.get(q)?.systems.length ?? 0;
    const spread = this.quadrantSpread(q, radius);
    // Frame the quadrant's extent, never closer than a readable distance.
    // Extra systems widen the frame slightly (log scale keeps it bounded).
    return Math.max(spread * 1.1, radius * 0.12) * (1 + Math.log10(1 + count) * 0.15);
  }

  /** Distance-driven LOD: labels/rings only matter at galaxy→quadrant range. */
  update(camera: THREE.Camera, mode: string): void {
    const radius = this.galaxy.diameterLy / 2;
    const dist = camera.position.length();
    const inDeepView = mode === 'system' || mode === 'planet' || mode === 'flight-deep';
    // Fade the whole layer out when extremely far (global silhouette view)
    // and hide it entirely once inside a system.
    const farFade = THREE.MathUtils.clamp(1.6 - dist / (radius * 1.4), 0, 1);
    for (const q of QUADRANT_IDS) {
      const info = this.quadrants.get(q);
      if (!info) continue;
      const highlighted = mode === 'quadrant-focus';
      if (info.label) {
        const mat = info.label.material as THREE.SpriteMaterial;
        mat.opacity = inDeepView ? 0 : (highlighted ? 0.95 : 0.75 * farFade + 0.1);
        info.label.visible = !inDeepView && mat.opacity > 0.02;
      }
      if (info.ring) {
        const mat = info.ring.material as THREE.Material & { opacity: number };
        mat.opacity = inDeepView ? 0 : highlighted ? 0.4 : 0.16 * farFade;
        info.ring.visible = !inDeepView && mat.opacity > 0.01;
      }
    }
  }

  dispose(): void {
    for (const [, info] of this.quadrants) {
      if (info.label) {
        this.scene.remove(info.label);
        const mat = info.label.material as THREE.SpriteMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
      if (info.ring) {
        this.scene.remove(info.ring);
        info.ring.geometry.dispose();
        const mats = Array.isArray(info.ring.material) ? info.ring.material : [info.ring.material];
        for (const m of mats) m.dispose();
      }
    }
    this.quadrants.clear();
    this.classification.clear();
    this.built = false;
  }

  // ---------- internals ----------

  private classifyAll(): void {
    // Step 1: explicit content mappings win.
    for (const [quadrantName, mapping] of this.mappings) {
      const q = normalizeQuadrantName(quadrantName);
      if (!q) continue;
      for (const systemId of Object.keys(mapping.systems ?? {})) {
        this.classification.set(systemId, q);
      }
    }
    // Step 2: radial fallback for unmapped systems.
    const radius = Math.max(1, this.galaxy.diameterLy / 2);
    const thickness = Math.max(1, this.galaxy.thicknessLy);
    for (const [, system] of this.systems) {
      if (this.classification.has(system.id)) continue;
      const { x, y, z } = system.coordinates;
      const rPlanar = Math.sqrt(x * x + z * z) / radius;
      const offPlane = Math.abs(y) / thickness;
      let q: QuadrantId;
      if (offPlane > 2.5 || rPlanar > 0.85) q = 'halo';
      else if (rPlanar < 0.08) q = 'core';
      else if (rPlanar < 0.45) q = 'inner-arm';
      else q = 'outer-arm';
      this.classification.set(system.id, q);
    }
  }

  private computeCentroid(systems: StarSystem[]): THREE.Vector3 {
    const c = new THREE.Vector3();
    if (systems.length === 0) return c;
    for (const s of systems) c.add(new THREE.Vector3(s.coordinates.x, s.coordinates.y, s.coordinates.z));
    return c.multiplyScalar(1 / systems.length);
  }

  private quadrantSpread(q: QuadrantId, radius: number): number {
    const info = this.quadrants.get(q);
    // Centroid is not computed yet on first call — estimate from ring radius.
    if (!info || info.systems.length === 0) {
      return q === 'core' ? radius * 0.16 : q === 'halo' ? radius * 1.2 : radius * 0.5;
    }
    let max = 0;
    for (const s of info.systems) {
      const p = new THREE.Vector3(s.coordinates.x, s.coordinates.y, s.coordinates.z);
      max = Math.max(max, p.distanceTo(info.centroid));
    }
    return Math.max(max, radius * 0.1);
  }

  private createLabel(q: QuadrantId, count: number, pos: THREE.Vector3, radius: number): THREE.Sprite | null {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const color = `#${new THREE.Color(QUADRANT_COLORS[q]).getHexString()}`;
    ctx.font = 'bold 46px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    ctx.fillText(`${QUADRANT_LABELS[q]} · ${count}`, 256, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(material);
    const size = radius * 0.16;
    sprite.scale.set(size, size / 4, 1);
    sprite.position.copy(pos).add(new THREE.Vector3(0, radius * 0.06, 0));
    sprite.renderOrder = 5;
    return sprite;
  }

  private createRing(q: QuadrantId, radius: number): THREE.Mesh | null {
    // Flat extent rings: core = small disc outline, arms = annular bands,
    // halo = wide faint shell outline. One draw call each.
    const fractions: Record<QuadrantId, [number, number]> = {
      'core': [0.02, 0.09],
      'inner-arm': [0.09, 0.46],
      'outer-arm': [0.46, 0.86],
      'halo': [0.86, 1.05],
    };
    const [innerF, outerF] = fractions[q] ?? [0, 1];
    const geometry = new THREE.RingGeometry(radius * innerF, radius * outerF, 128, 1);
    const material = new THREE.MeshBasicMaterial({
      color: QUADRANT_COLORS[q] ?? 0xffffff,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 0;
    return mesh;
  }
}
