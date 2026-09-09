// Simple galaxy renderer
import * as THREE from 'three';
import { Anomaly, Cluster, Galaxy, Nebula, Snr, StarSystem } from '@/types/galaxy';

const DISK_POINTS = 60000;
const BULGE_POINTS = 15000;

/** Marker colors for non-system entities in galaxy view. */
const ENTITY_COLORS = {
  nebula: [0.7, 0.45, 1.0],
  cluster: [1.0, 0.8, 0.35],
  snr: [1.0, 0.45, 0.2],
  anomaly: [1.0, 0.3, 0.85],
} as const;

export type EntityMarkerKind = keyof typeof ENTITY_COLORS;

export interface EntityMarkerItem {
  kind: EntityMarkerKind;
  id: string;
  x: number;
  y: number;
  z: number;
}

export interface EntityMarkerSource {
  systems: Map<string, StarSystem>;
  nebulae: Nebula[];
  clusters: Cluster[];
  snrs: Snr[];
  anomalies: Anomaly[];
}

/**
 * Collect one marker per nebula/cluster/remnant/anomaly. System/planet-bound
 * anomalies resolve through their parent system position; unresolvable ones
 * are skipped. Pure data — no three.js.
 */
export function collectEntityMarkers(source: EntityMarkerSource): EntityMarkerItem[] {
  const items: EntityMarkerItem[] = [];
  for (const nebula of source.nebulae) {
    items.push({ kind: 'nebula', id: nebula.id, ...nebula.coordinates });
  }
  for (const cluster of source.clusters) {
    items.push({ kind: 'cluster', id: cluster.id, ...cluster.coordinates });
  }
  for (const snr of source.snrs) {
    items.push({ kind: 'snr', id: snr.id, ...snr.coordinates });
  }
  for (const anomaly of source.anomalies) {
    const point = anomalyPosition(anomaly, source.systems);
    if (point) items.push({ kind: 'anomaly', id: anomaly.id, ...point });
  }
  return items;
}

function anomalyPosition(
  anomaly: Anomaly,
  systems: Map<string, StarSystem>,
): { x: number; y: number; z: number } | null {
  const loc = anomaly.location;
  if (loc.scope === 'galaxy' && loc.coordinates) return loc.coordinates;
  if (loc.scope === 'system' && loc.systemId) {
    return systems.get(loc.systemId)?.coordinates ?? null;
  }
  if (loc.scope === 'planet' && loc.planetId) {
    for (const system of systems.values()) {
      if (system.planets.some((p) => p.id === loc.planetId)) return system.coordinates;
    }
    return null;
  }
  return null;
}

function gaussian(): number {
  // Box-Muller transform, mean 0, stddev 1
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export class GalaxyRenderer {
  private scene: THREE.Scene;
  private galaxy: Galaxy;
  private systems: Map<string, StarSystem>;
  private nebulae: Nebula[];
  private clusters: Cluster[];
  private snrs: Snr[];
  private anomalies: Anomaly[];
  private group = new THREE.Group();
  private diskMesh: THREE.Points | null = null;
  private bulgeMesh: THREE.Points | null = null;
  private haloMesh: THREE.Points | null = null;
  private starField: THREE.Points | null = null;
  private systemMarkers: THREE.Points | null = null;
  private systemOrder: StarSystem[] = [];
  private entityMarkers: THREE.Points | null = null;
  private entityOrder: EntityMarkerItem[] = [];
  private coreGlow: THREE.Sprite | null = null;
  private coreHot: THREE.Sprite | null = null;
  private coreGlowBaseOpacity = 0.85;
  private coreHotBaseOpacity = 0.9;
  private fadeables: Array<{ material: THREE.Material; baseOpacity: number }> = [];
  private fade = 1;
  private layerVisible = true;
  private initialized = false;

  constructor(
    scene: THREE.Scene,
    galaxyData: {
      galaxy: Galaxy;
      systems?: Map<string, StarSystem>;
      nebulae?: Nebula[];
      clusters?: Cluster[];
      snrs?: Snr[];
      anomalies?: Anomaly[];
    },
  ) {
    this.scene = scene;
    this.galaxy = galaxyData.galaxy;
    this.systems = galaxyData.systems ?? new Map();
    this.nebulae = galaxyData.nebulae ?? [];
    this.clusters = galaxyData.clusters ?? [];
    this.snrs = galaxyData.snrs ?? [];
    this.anomalies = galaxyData.anomalies ?? [];
    this.scene.add(this.group);
  }

  build(): void {
    this.createDisk();
    this.createBulge();
    this.createCoreGlow();
    this.createHalo();
    this.createStarField();
    this.createSystemMarkers();
    this.createEntityMarkers();
    this.applyFade();
    this.initialized = true;
  }

  /** Fade the whole galaxy layer (1 = fully visible, 0 = hidden). Used for seamless zoom transitions. */
  setFade(t: number): void {
    this.fade = THREE.MathUtils.clamp(t, 0, 1);
    this.applyFade();
  }

  private trackFadeable(material: THREE.Material, baseOpacity: number): void {
    this.fadeables.push({ material, baseOpacity });
  }

  private applyFade(): void {
    this.group.visible = this.layerVisible && this.fade > 0.01;
    for (const { material, baseOpacity } of this.fadeables) {
      const mat = material as THREE.PointsMaterial | THREE.SpriteMaterial;
      if ('opacity' in mat) mat.opacity = baseOpacity * this.fade;
    }
  }

  private createDisk(): void {
    const radius = this.galaxy.diameterLy / 2;
    const thickness = this.galaxy.thicknessLy;
    const armCount = this.galaxy.type.includes('barred') ? 2 : 4;

    const positions = new Float32Array(DISK_POINTS * 3);
    const colors = new Float32Array(DISK_POINTS * 3);

    const coreColor = new THREE.Color(1.0, 0.82, 0.6);
    const armColor = new THREE.Color(0.55, 0.72, 1.0);
    const youngBlue = new THREE.Color(0.65, 0.8, 1.0);
    const tmp = new THREE.Color();

    for (let i = 0; i < DISK_POINTS; i++) {
      // Centrally concentrated radius
      const t = Math.pow(Math.random(), 0.6);
      const r = radius * (0.03 + 0.97 * t);

      // Logarithmic-ish spiral: twist grows with radius
      const arm = Math.floor(Math.random() * armCount);
      const armOffset = (arm / armCount) * Math.PI * 2;
      const twist = (r / radius) * 4.2;
      const jitter = gaussian() * 0.35 * (1 - (r / radius) * 0.5);
      const angle = armOffset + twist + jitter;

      const x = r * Math.cos(angle) + gaussian() * radius * 0.012;
      // Layered vertical structure (real spirals are not uniform slabs):
      // - 25% young lane stars: razor-thin, bright, blue (the dust lane)
      // - 75% old disk stars: puffier (sigma ~= 0.4 x thickness) and
      //   flaring outward (thicker at the rim), like real disks
      const tNorm = r / radius;
      const isLaneStar = Math.random() < 0.25;
      const flare = isLaneStar ? 0.8 + 0.4 * tNorm : 0.7 + 0.9 * tNorm;
      const sigma = thickness * (isLaneStar ? 0.1 : 0.4) * flare;
      const y = gaussian() * sigma;
      const z = r * Math.sin(angle) + gaussian() * radius * 0.012;

      const i3 = i * 3;
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      // Warm core -> cool blue arms, with per-star brightness variation.
      // Lane (young) stars skew brighter and bluer.
      tmp.copy(coreColor).lerp(armColor, Math.min(1, (r / radius) * 1.4));
      if (isLaneStar) tmp.lerp(youngBlue, 0.55);
      const brightness = isLaneStar ? 0.85 + Math.random() * 0.45 : 0.45 + Math.random() * 0.55;
      colors[i3] = tmp.r * brightness;
      colors[i3 + 1] = tmp.g * brightness;
      colors[i3 + 2] = tmp.b * brightness;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 90,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });

    this.diskMesh = new THREE.Points(geometry, material);
    this.diskMesh.renderOrder = 1;
    this.trackFadeable(material, 0.85);
    this.group.add(this.diskMesh);
  }

  private createBulge(): void {
    const radius = this.galaxy.diameterLy * 0.02;

    const positions = new Float32Array(BULGE_POINTS * 3);
    const colors = new Float32Array(BULGE_POINTS * 3);
    const tmp = new THREE.Color();

    for (let i = 0; i < BULGE_POINTS; i++) {
      // Concentrated gaussian spheroid, flattened like a real bulge
      const spread = radius * 0.45;
      positions[i * 3] = gaussian() * spread;
      positions[i * 3 + 1] = gaussian() * spread * 0.6;
      positions[i * 3 + 2] = gaussian() * spread;

      // Warm old-star palette with variation
      const t = Math.random();
      tmp.setRGB(1.0, 0.72 + t * 0.18, 0.5 + t * 0.2);
      const brightness = 0.25 + Math.random() * 0.4;
      colors[i * 3] = tmp.r * brightness;
      colors[i * 3 + 1] = tmp.g * brightness;
      colors[i * 3 + 2] = tmp.b * brightness;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 60,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });

    this.bulgeMesh = new THREE.Points(geometry, material);
    this.bulgeMesh.renderOrder = 2;
    this.trackFadeable(material, 0.5);
    this.group.add(this.bulgeMesh);
  }

  private makeGlowTexture(inner: string, mid: string): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.25, mid);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }

  private createCoreGlow(): void {
    // Broad warm halo glow + small hot white core: the "true galaxy" look
    const glowSize = this.galaxy.diameterLy * 0.16;
    const glowMaterial = new THREE.SpriteMaterial({
      map: this.makeGlowTexture('rgba(255, 240, 210, 1)', 'rgba(255, 180, 110, 0.35)'),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: this.coreGlowBaseOpacity,
    });
    this.coreGlow = new THREE.Sprite(glowMaterial);
    this.coreGlow.scale.set(glowSize, glowSize, 1);
    this.coreGlow.renderOrder = 2;
    this.trackFadeable(glowMaterial, this.coreGlowBaseOpacity);
    this.group.add(this.coreGlow);

    const hotSize = this.galaxy.diameterLy * 0.045;
    const hotMaterial = new THREE.SpriteMaterial({
      map: this.makeGlowTexture('rgba(255, 255, 255, 1)', 'rgba(255, 230, 190, 0.4)'),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: this.coreHotBaseOpacity,
    });
    this.coreHot = new THREE.Sprite(hotMaterial);
    this.coreHot.scale.set(hotSize, hotSize, 1);
    this.coreHot.renderOrder = 3;
    this.trackFadeable(hotMaterial, this.coreHotBaseOpacity);
    this.group.add(this.coreHot);
  }

  private createHalo(): void {
    const particleCount = 15000;

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const r = this.galaxy.diameterLy * 0.5 * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = 10 + Math.random() * 50;

      const t = Math.random();
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.6 + t * 0.3;
      colors[i * 3 + 2] = 0.3 + t * 0.2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 10,
      vertexColors: true,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.haloMesh = new THREE.Points(geometry, material);
    this.trackFadeable(material, 0.15);
    this.group.add(this.haloMesh);
  }

  private createStarField(): void {
    const particleCount = 10000;
    const radius = this.galaxy.diameterLy * 2;

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const r = radius * (0.8 + Math.random() * 0.2);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = 50 + Math.random() * 200;

      const starTypes = [
        [1.0, 1.0, 1.0],
        [1.0, 0.9, 0.7],
        [1.0, 0.7, 0.5],
        [0.7, 0.8, 1.0],
      ];
      const type = starTypes[Math.floor(Math.random() * starTypes.length)] ?? [1.0, 1.0, 1.0];
      colors[i * 3] = type[0] ?? 1.0;
      colors[i * 3 + 1] = type[1] ?? 1.0;
      colors[i * 3 + 2] = type[2] ?? 1.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 50,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.starField = new THREE.Points(geometry, material);
    this.starField.renderOrder = -1;
    this.trackFadeable(material, 0.8);
    this.group.add(this.starField);
  }

  private createSystemMarkers(): void {
    if (this.systems.size === 0) return;

    const count = this.systems.size;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    let i = 0;
    this.systemOrder = [];
    for (const [, system] of this.systems) {
      positions[i * 3] = system.coordinates.x;
      positions[i * 3 + 1] = system.coordinates.y;
      positions[i * 3 + 2] = system.coordinates.z;

      // Bright cyan markers so real content stands out from the disk
      colors[i * 3] = 0.4;
      colors[i * 3 + 1] = 1.0;
      colors[i * 3 + 2] = 1.0;
      this.systemOrder.push(system);
      i++;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 350,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      depthTest: false,
      sizeAttenuation: true,
    });

    this.systemMarkers = new THREE.Points(geometry, material);
    this.systemMarkers.renderOrder = 3;
    this.trackFadeable(material, 0.95);
    this.group.add(this.systemMarkers);
  }

  /**
   * One marker cloud for nebulae, clusters, remnants and anomalies so every
   * searchable entity is visible in galaxy view.
   */
  private createEntityMarkers(): void {
    const items = collectEntityMarkers({
      systems: this.systems,
      nebulae: this.nebulae,
      clusters: this.clusters,
      snrs: this.snrs,
      anomalies: this.anomalies,
    });
    if (items.length === 0) return;

    const positions = new Float32Array(items.length * 3);
    const colors = new Float32Array(items.length * 3);
    this.entityOrder = [];
    items.forEach((item, i) => {
      positions[i * 3] = item.x;
      positions[i * 3 + 1] = item.y;
      positions[i * 3 + 2] = item.z;
      const c = ENTITY_COLORS[item.kind];
      colors[i * 3] = c[0] ?? 1;
      colors[i * 3 + 1] = c[1] ?? 1;
      colors[i * 3 + 2] = c[2] ?? 1;
      this.entityOrder.push(item);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 450,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      depthTest: false,
      sizeAttenuation: true,
    });

    this.entityMarkers = new THREE.Points(geometry, material);
    this.entityMarkers.renderOrder = 3;
    this.trackFadeable(material, 0.9);
    this.group.add(this.entityMarkers);
  }

  /** Number of entity markers (test hook). */
  entityMarkerCount(): number {
    return this.entityOrder.length;
  }

  /** Distance from a world-space point to a system's marker. */
  distanceToSystem(system: StarSystem, point: THREE.Vector3): number {    const dx = system.coordinates.x - point.x;
    const dy = system.coordinates.y - point.y;
    const dz = system.coordinates.z - point.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Best system roughly along the view ray (for zoom-to-enter).
   * Returns the system with the smallest angular separation from the ray,
   * provided it is in front of the camera, within maxDist, and within
   * maxAngleDeg of the view direction.
   */
  findSystemAlongView(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDist = Infinity,
    maxAngleDeg = 12,
  ): { system: StarSystem; distance: number } | null {
    const minCos = Math.cos(THREE.MathUtils.degToRad(maxAngleDeg));
    const toSys = new THREE.Vector3();
    let best: StarSystem | null = null;
    let bestCos = minCos;
    let bestDist = maxDist;
    for (const [, system] of this.systems) {
      toSys.set(
        system.coordinates.x - origin.x,
        system.coordinates.y - origin.y,
        system.coordinates.z - origin.z,
      );
      const dist = toSys.length();
      if (dist > maxDist || dist === 0) continue;
      const cos = toSys.divideScalar(dist).dot(direction);
      if (cos < minCos) continue;
      // Prefer the most centered candidate; break ties by distance.
      if (cos > bestCos || (cos === bestCos && dist < bestDist)) {
        best = system;
        bestCos = cos;
        bestDist = dist;
      }
    }
    return best ? { system: best, distance: bestDist } : null;
  }

  /** Show/hide the whole galaxy layer (hidden for planet close-ups: saves fill rate). */
  setVisible(visible: boolean): void {
    this.layerVisible = visible;
    this.applyFade();
  }

  /** Recolor system markers per quadrant — one buffer upload, no new draw calls. */
  applyQuadrantTint(colorFor: (systemId: string) => THREE.Color): void {
    if (!this.systemMarkers || this.systemOrder.length === 0) return;
    const attr = this.systemMarkers.geometry.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < this.systemOrder.length; i++) {
      const system = this.systemOrder[i];
      if (!system) continue;
      const c = colorFor(system.id);
      attr.setXYZ(i, c.r, c.g, c.b);
    }
    attr.needsUpdate = true;
  }

  /** World-space position of a system marker (for quadrant framing flights). */
  getSystemPosition(systemId: string): THREE.Vector3 | null {
    for (const system of this.systemOrder) {
      if (system.id === systemId) {
        return new THREE.Vector3(system.coordinates.x, system.coordinates.y, system.coordinates.z);
      }
    }
    return null;
  }

  /** Nearest system to a world-space point (used for "fly to nearest" travel). */
  findNearestSystem(point: THREE.Vector3): StarSystem | null {
    let best: StarSystem | null = null;
    let bestDist = Infinity;
    const tmp = new THREE.Vector3();
    for (const [, system] of this.systems) {
      tmp.set(system.coordinates.x, system.coordinates.y, system.coordinates.z);
      const dist = tmp.distanceToSquared(point);
      if (dist < bestDist) {
        bestDist = dist;
        best = system;
      }
    }
    return best;
  }

  /** System whose marker was clicked (NDC coords), or null. */
  pickSystem(ndc: THREE.Vector2, camera: THREE.Camera): StarSystem | null {    if (!this.systemMarkers || this.systemOrder.length === 0) return null;
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 800;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(this.systemMarkers);
    if (hits.length === 0) return null;
    const index = hits[0]?.index ?? -1;
    return this.systemOrder[index] ?? null;
  }

  /** Entity (nebula/cluster/snr/anomaly) whose marker was clicked, or null. */
  pickEntity(ndc: THREE.Vector2, camera: THREE.Camera): EntityMarkerItem | null {
    if (!this.entityMarkers || this.entityOrder.length === 0) return null;
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 800;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(this.entityMarkers);
    if (hits.length === 0) return null;
    const index = hits[0]?.index ?? -1;
    return this.entityOrder[index] ?? null;
  }

  update(_deltaTime: number): void {
    if (!this.initialized) return;
    const deltaTime = _deltaTime;
    // Slow majestic spin around the galactic axis (disk lies in XZ, so Y)
    if (this.diskMesh) this.diskMesh.rotation.y += deltaTime * 0.005;
    if (this.bulgeMesh) this.bulgeMesh.rotation.y += deltaTime * 0.003;
    if (this.haloMesh) this.haloMesh.rotation.y += deltaTime * 0.001;
    if (this.starField) this.starField.rotation.y -= deltaTime * 0.0002;
    // Gentle living pulse on the core glow (scaled by layer fade)
    const pulse = Math.sin(performance.now() * 0.0008) * 0.5 + 0.5;
    if (this.coreGlow) this.coreGlow.material.opacity = (this.coreGlowBaseOpacity - pulse * 0.08) * this.fade;
    if (this.coreHot) this.coreHot.material.opacity = (this.coreHotBaseOpacity - pulse * 0.1) * this.fade;
  }

  dispose(): void {
    this.diskMesh?.geometry.dispose();
    this.disposeMaterial(this.diskMesh?.material);
    this.bulgeMesh?.geometry.dispose();
    this.disposeMaterial(this.bulgeMesh?.material);
    this.haloMesh?.geometry.dispose();
    this.disposeMaterial(this.haloMesh?.material);
    this.starField?.geometry.dispose();
    this.disposeMaterial(this.starField?.material);
    this.systemMarkers?.geometry.dispose();
    this.disposeMaterial(this.systemMarkers?.material);
    this.entityMarkers?.geometry.dispose();
    this.disposeMaterial(this.entityMarkers?.material);
    this.disposeSprite(this.coreGlow);
    this.disposeSprite(this.coreHot);

    if (this.diskMesh) this.group.remove(this.diskMesh);
    if (this.bulgeMesh) this.group.remove(this.bulgeMesh);
    if (this.haloMesh) this.group.remove(this.haloMesh);
    if (this.starField) this.group.remove(this.starField);
    if (this.systemMarkers) this.group.remove(this.systemMarkers);
    if (this.entityMarkers) this.group.remove(this.entityMarkers);
    if (this.coreGlow) this.group.remove(this.coreGlow);
    if (this.coreHot) this.group.remove(this.coreHot);
  }

  private disposeMaterial(material: THREE.Material | THREE.Material[] | null | undefined): void {
    if (!material) return;
    if (Array.isArray(material)) {
      for (const m of material) m.dispose();
    } else {
      material.dispose();
    }
  }

  private disposeSprite(sprite: THREE.Sprite | null): void {
    if (!sprite) return;
    sprite.material.map?.dispose();
    sprite.material.dispose();
  }
}
