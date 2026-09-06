// Simple galaxy renderer
import * as THREE from 'three';
import { Galaxy, StarSystem } from '@/types/galaxy';

const DISK_POINTS = 60000;
const BULGE_POINTS = 15000;

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
  private diskMesh: THREE.Points | null = null;
  private bulgeMesh: THREE.Points | null = null;
  private haloMesh: THREE.Points | null = null;
  private starField: THREE.Points | null = null;
  private systemMarkers: THREE.Points | null = null;
  private systemOrder: StarSystem[] = [];
  private coreGlow: THREE.Sprite | null = null;
  private coreHot: THREE.Sprite | null = null;
  private coreGlowBaseOpacity = 0.85;
  private coreHotBaseOpacity = 0.9;
  private initialized = false;

  constructor(scene: THREE.Scene, galaxyData: { galaxy: Galaxy; systems?: Map<string, StarSystem> }) {
    this.scene = scene;
    this.galaxy = galaxyData.galaxy;
    this.systems = galaxyData.systems ?? new Map();
  }

  build(): void {
    this.createDisk();
    this.createBulge();
    this.createCoreGlow();
    this.createHalo();
    this.createStarField();
    this.createSystemMarkers();
    this.initialized = true;
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
    this.scene.add(this.diskMesh);
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
    this.scene.add(this.bulgeMesh);
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
    this.scene.add(this.coreGlow);

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
    this.scene.add(this.coreHot);
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
    this.scene.add(this.haloMesh);
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
    this.scene.add(this.starField);
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
    this.scene.add(this.systemMarkers);
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
  pickSystem(ndc: THREE.Vector2, camera: THREE.Camera): StarSystem | null {
    if (!this.systemMarkers || this.systemOrder.length === 0) return null;
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 800;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(this.systemMarkers);
    if (hits.length === 0) return null;
    const index = hits[0]?.index ?? -1;
    return this.systemOrder[index] ?? null;
  }

  update(_deltaTime: number): void {
    if (!this.initialized) return;
    const deltaTime = _deltaTime;
    // Slow majestic spin around the galactic axis (disk lies in XZ, so Y)
    if (this.diskMesh) this.diskMesh.rotation.y += deltaTime * 0.005;
    if (this.bulgeMesh) this.bulgeMesh.rotation.y += deltaTime * 0.003;
    if (this.haloMesh) this.haloMesh.rotation.y += deltaTime * 0.001;
    if (this.starField) this.starField.rotation.y -= deltaTime * 0.0002;
    // Gentle living pulse on the core glow
    const pulse = Math.sin(performance.now() * 0.0008) * 0.5 + 0.5;
    if (this.coreGlow) this.coreGlow.material.opacity = this.coreGlowBaseOpacity - pulse * 0.08;
    if (this.coreHot) this.coreHot.material.opacity = this.coreHotBaseOpacity - pulse * 0.1;
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
    this.disposeSprite(this.coreGlow);
    this.disposeSprite(this.coreHot);

    if (this.diskMesh) this.scene.remove(this.diskMesh);
    if (this.bulgeMesh) this.scene.remove(this.bulgeMesh);
    if (this.haloMesh) this.scene.remove(this.haloMesh);
    if (this.starField) this.scene.remove(this.starField);
    if (this.systemMarkers) this.scene.remove(this.systemMarkers);
    if (this.coreGlow) this.scene.remove(this.coreGlow);
    if (this.coreHot) this.scene.remove(this.coreHot);
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
