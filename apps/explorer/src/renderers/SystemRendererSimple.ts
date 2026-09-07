// Rich system renderer - lit bodies with procedural textures, orbit lines,
// ring systems, labels, belts, and orbital animation.
// Stage units: 1 unit = 1 AU, centered on the primary star. Body sizes are
// exaggerated (not to scale) so everything stays visible and navigable.
import * as THREE from 'three';
import { StarSystem, Star, Planet, Moon, DwarfPlanet, Belt, Asteroid, Comet } from '@/types/galaxy';

interface Orbiter {
  obj: THREE.Object3D;
  /** Anchor whose live position is the orbit center (group = system origin). */
  center: THREE.Object3D;
  radius: number;
  angle: number;
  /** Radians per second. */
  speed: number;
  /** Self-rotation radians per second. */
  spin: number;
}

const TEX_W = 256;
const TEX_H = 128;

export type SystemPick =
  | { kind: 'planet'; planet: Planet; object: THREE.Object3D }
  | { kind: 'moon'; moon: Moon; planet: Planet | null; object: THREE.Object3D }
  | { kind: 'star'; star: Star; object: THREE.Object3D }
  | { kind: 'dwarf'; dwarf: DwarfPlanet; object: THREE.Object3D };

interface SystemLod {
  labels: THREE.Sprite[];
  orbitLines: THREE.Object3D[];
  dust: THREE.Object3D[];
}

export class SystemRenderer {
  /** Max fully-built system stages kept in memory; LRU-evicted beyond this. */
  private static readonly MAX_CACHED_SYSTEMS = 8;

  private scene: THREE.Scene;
  private systems: Map<string, StarSystem>;
  private currentSystem: string | null = null;
  private currentSystemData: StarSystem | null = null;
  private systemMeshes = new Map<string, THREE.Group>();
  private orbitersBySystem = new Map<string, Orbiter[]>();
  private activeOrbiters: Orbiter[] = [];
  private lodBySystem = new Map<string, SystemLod>();
  private buildOrder: string[] = [];
  private raycaster = new THREE.Raycaster();

  constructor(scene: THREE.Scene, systems: Map<string, StarSystem>) {
    this.scene = scene;
    this.systems = systems;
  }

  build(): void {
    // Intentionally lazy: stages (meshes + procedural textures) are built on
    // first enterSystem() and cached with an LRU cap, so GPU/CPU cost scales
    // with visited systems, not total galaxy content.
  }

  // ---------- mesh construction ----------

  private createSystemMesh(system: StarSystem): THREE.Group {
    const group = new THREE.Group();
    group.name = `system-${system.id}`;
    group.visible = false;
    const orbiters: Orbiter[] = [];

    // Lights: star point light + faint ambient so night sides aren't pitch black
    const primary = system.stars[0];
    const starColor = primary ? this.starColor(primary.temperatureK) : new THREE.Color(1, 1, 1);
    const starLight = new THREE.PointLight(starColor.clone(), 2.5, 0, 0);
    group.add(starLight);
    group.add(new THREE.AmbientLight(0x334455, 0.35));

    for (const star of system.stars) {
      const starMesh = this.createStarMesh(star);
      group.add(starMesh);
      orbiters.push({ obj: starMesh, center: group, radius: 0, angle: 0, speed: 0, spin: 0.05 });
    }

    for (const planet of system.planets) {
      const planetMesh = this.createPlanetMesh(planet);
      const startAngle = planet.orbitIndex * 1.1 + 0.4;
      planetMesh.position.set(
        planet.orbitalDistanceAu * Math.cos(startAngle),
        0,
        planet.orbitalDistanceAu * Math.sin(startAngle),
      );
      group.add(planetMesh);
      group.add(this.createOrbitLine(planet.orbitalDistanceAu));
      orbiters.push({
        obj: planetMesh,
        center: group,
        radius: planet.orbitalDistanceAu,
        angle: startAngle,
        speed: 0.12 / Math.pow(Math.max(0.2, planet.orbitalDistanceAu), 1.5),
        spin: 0.3,
      });

      planet.moons.forEach((moon, index) => {
        const moonMesh = this.createMoonMesh(moon, planetMesh, index);
        group.add(moonMesh);
        const planetRadius = (planetMesh.geometry as THREE.SphereGeometry).parameters.radius;
        const orbitDist = Math.max(moon.orbitalDistanceKm * 1e-7, planetRadius * 2.5);
        orbiters.push({
          obj: moonMesh,
          center: planetMesh,
          radius: orbitDist,
          angle: index * 2.1,
          speed: 0.5 / Math.pow(Math.max(0.01, orbitDist), 0.5),
          spin: 0.2,
        });
      });
    }

    for (const dwarf of system.dwarfPlanets) {
      const dwarfMesh = this.createDwarfPlanetMesh(dwarf);
      const startAngle = dwarf.orbitIndex * 1.1 + 1.3;
      dwarfMesh.position.set(
        dwarf.orbitalDistanceAu * Math.cos(startAngle),
        0,
        dwarf.orbitalDistanceAu * Math.sin(startAngle),
      );
      group.add(dwarfMesh);
      group.add(this.createOrbitLine(dwarf.orbitalDistanceAu));
      orbiters.push({
        obj: dwarfMesh,
        center: group,
        radius: dwarf.orbitalDistanceAu,
        angle: startAngle,
        speed: 0.12 / Math.pow(Math.max(0.2, dwarf.orbitalDistanceAu), 1.5),
        spin: 0.25,
      });
    }

    for (const belt of system.belts) {
      group.add(this.createBeltMesh(belt, system.id));
    }

    if (system.asteroids.length > 0) {
      group.add(this.createAsteroidMesh(system.asteroids, system.id));
    }

    if (system.comets.length > 0) {
      group.add(this.createCometMesh(system.comets, system.id));
    }

    this.systemMeshes.set(system.id, group);
    this.orbitersBySystem.set(system.id, orbiters);

    // Collect LOD toggles once: labels fade first, then dust, orbit lines last.
    const lod: SystemLod = { labels: [], orbitLines: [], dust: [] };
    group.traverse((obj) => {
      if (obj instanceof THREE.Sprite) lod.labels.push(obj);
      else if (obj instanceof THREE.LineLoop) lod.orbitLines.push(obj);
      else if (obj instanceof THREE.Points) lod.dust.push(obj);
    });
    this.lodBySystem.set(system.id, lod);
    return group;
  }

  private createStarMesh(star: Star): THREE.Mesh {
    // Exaggerated: true Sun = 0.00465 AU, clamped so giants don't swallow the stage
    const radius = THREE.MathUtils.clamp(star.radiusSol * 0.05, 0.02, 1.5);
    const color = this.starColor(star.temperatureK);
    const material = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), material);
    mesh.name = `star-${star.id}`;

    // Glow sprite
    const glowSize = radius * 7;
    const glowMaterial = new THREE.SpriteMaterial({
      map: this.glowTexture('rgba(255, 240, 220, 1)', 'rgba(255, 180, 120, 0.3)'),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.9,
    });
    const glow = new THREE.Sprite(glowMaterial);
    glow.scale.set(glowSize, glowSize, 1);
    mesh.add(glow);

    mesh.add(this.createLabel(star.name, false, radius + 0.55));
    return mesh;
  }

  private starColor(temperatureK: number): THREE.Color {
    const temp = temperatureK;
    if (temp < 3500) return new THREE.Color(1.0, 0.4, 0.2);
    if (temp < 5000) return new THREE.Color(1.0, 0.7, 0.4);
    if (temp < 6000) return new THREE.Color(1.0, 0.9, 0.6);
    if (temp < 7500) return new THREE.Color(1.0, 1.0, 0.9);
    if (temp < 10000) return new THREE.Color(1.0, 1.0, 1.0);
    if (temp < 30000) return new THREE.Color(0.8, 0.9, 1.0);
    return new THREE.Color(0.6, 0.7, 1.0);
  }

  private createPlanetMesh(planet: Planet): THREE.Mesh {
    const radius = Math.max(planet.radiusEarth * 0.01, 0.005);
    const material = new THREE.MeshStandardMaterial({
      map: this.planetTexture(planet),
      roughness: 0.95,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), material);
    mesh.name = `planet-${planet.id}`;
    // Label rides the planet so it follows the orbit; green = harbors complex life
    mesh.add(this.createLabel(planet.name, planet.life === 'complex' || planet.life === 'intelligent', radius + 0.22));

    if (planet.hasRings) {
      const ringMesh = this.createRingMesh(radius, planet.id);
      ringMesh.rotation.x = -Math.PI / 2 + 0.15;
      mesh.add(ringMesh);
    }

    if (planet.atmosphereDensity > 0.15) {
      const shellGeometry = new THREE.SphereGeometry(radius * 1.18, 32, 16);
      const shellMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.45, 0.65, 1.0),
        transparent: true,
        opacity: Math.min(0.35, planet.atmosphereDensity * 0.12),
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      mesh.add(new THREE.Mesh(shellGeometry, shellMaterial));
    }

    return mesh;
  }

  private createRingMesh(planetRadius: number, seed: string): THREE.Mesh {
    const inner = planetRadius * 1.4;
    const outer = planetRadius * 2.4;
    const geometry = new THREE.RingGeometry(inner, outer, 96, 4);

    // Remap UVs radially so the band texture runs across the ring width
    const pos = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r = Math.sqrt(x * x + y * y);
      uv.setXY(i, (r - inner) / (outer - inner), 0.5);
    }
    uv.needsUpdate = true;

    const material = new THREE.MeshBasicMaterial({
      map: this.ringTexture(seed),
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    return new THREE.Mesh(geometry, material);
  }

  private createMoonMesh(moon: Moon, planetMesh: THREE.Mesh, index: number): THREE.Mesh {
    const radius = Math.max(moon.radiusKm * 1e-5, 0.003);
    const material = new THREE.MeshStandardMaterial({
      map: this.moonTexture(moon),
      roughness: 1,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 12), material);
    mesh.name = `moon-${moon.id}`;
    const planetRadius = (planetMesh.geometry as THREE.SphereGeometry).parameters.radius;
    const orbitDist = Math.max(moon.orbitalDistanceKm * 1e-7, planetRadius * 2.5);
    const angle = index * 2.1;
    mesh.position.set(
      planetMesh.position.x + orbitDist * Math.cos(angle),
      0,
      planetMesh.position.z + orbitDist * Math.sin(angle),
    );
    return mesh;
  }

  private createDwarfPlanetMesh(dwarf: DwarfPlanet): THREE.Mesh {
    const radius = Math.max(dwarf.radiusKm * 1e-5, 0.003);
    const material = new THREE.MeshStandardMaterial({
      color: dwarf.type === 'icy' ? new THREE.Color(0x9db8dd) : new THREE.Color(0x8a7360),
      roughness: 1,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 12), material);
    mesh.name = `dwarf-${dwarf.id}`;
    return mesh;
  }

  private createOrbitLine(radiusAu: number): THREE.LineLoop {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      points.push(new THREE.Vector3(radiusAu * Math.cos(angle), 0, radiusAu * Math.sin(angle)));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x3a5a8a,
      transparent: true,
      opacity: 0.35,
    });
    return new THREE.LineLoop(geometry, material);
  }

  private createLabel(text: string, highlight: boolean, yOffset?: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    ctx.font = '44px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = highlight ? '#7dff9a' : '#cfe8ff';
    ctx.fillText(text, 256, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.9, 0.225, 1);
    sprite.renderOrder = 10;
    if (yOffset !== undefined) {
      sprite.position.y = yOffset;
    } else {
      sprite.position.y = 0.28;
    }
    return sprite;
  }

  private createBeltMesh(belt: Belt, seedSuffix: string): THREE.Points {
    const count = 3000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const rand = this.mulberry32(this.hashSeed(`belt-${belt.id}-${seedSuffix}`));
    const compColors: Record<string, [number, number, number]> = {
      rocky: [0.55, 0.48, 0.4],
      metallic: [0.65, 0.6, 0.55],
      icy: [0.6, 0.7, 0.85],
      carbonaceous: [0.3, 0.24, 0.18],
    };
    for (let i = 0; i < count; i++) {
      const r = belt.innerEdgeAu + rand() * (belt.outerEdgeAu - belt.innerEdgeAu);
      const angle = rand() * Math.PI * 2;
      positions[i * 3] = r * Math.cos(angle);
      positions[i * 3 + 1] = this.gaussian(rand) * (belt.outerEdgeAu - belt.innerEdgeAu) * 0.03;
      positions[i * 3 + 2] = r * Math.sin(angle);
      const comp = belt.composition[Math.floor(rand() * belt.composition.length)] ?? 'rocky';
      const color = compColors[comp] ?? [0.5, 0.5, 0.5];
      const shade = 0.7 + rand() * 0.5;
      colors[i * 3] = (color[0] ?? 0.5) * shade;
      colors[i * 3 + 1] = (color[1] ?? 0.5) * shade;
      colors[i * 3 + 2] = (color[2] ?? 0.5) * shade;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });
    return new THREE.Points(geometry, material);
  }

  private createAsteroidMesh(asteroids: Asteroid[], seedSuffix: string): THREE.Points {
    const positions = new Float32Array(asteroids.length * 3);
    const rand = this.mulberry32(this.hashSeed(`asteroids-${seedSuffix}`));
    asteroids.forEach((ast, i) => {
      const angle = rand() * Math.PI * 2;
      positions[i * 3] = ast.orbitalDistanceAu * Math.cos(angle);
      positions[i * 3 + 1] = this.gaussian(rand) * 0.05;
      positions[i * 3 + 2] = ast.orbitalDistanceAu * Math.sin(angle);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x998877,
      size: 0.015,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });
    return new THREE.Points(geometry, material);
  }

  private createCometMesh(comets: Comet[], seedSuffix: string): THREE.Points {
    const positions = new Float32Array(comets.length * 3);
    const rand = this.mulberry32(this.hashSeed(`comets-${seedSuffix}`));
    comets.forEach((comet, i) => {
      const angle = rand() * Math.PI * 2;
      positions[i * 3] = comet.aphelionAu * Math.cos(angle);
      positions[i * 3 + 1] = this.gaussian(rand) * 0.3;
      positions[i * 3 + 2] = comet.aphelionAu * Math.sin(angle);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xaaddff,
      size: 0.03,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });
    return new THREE.Points(geometry, material);
  }

  // ---------- procedural textures ----------

  private hashSeed(str: string): number {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  private mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  private gaussian(rand: () => number): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /** Tileable-ish value noise in [0,1]. */
  private valueNoise(width: number, height: number, cells: number, rand: () => number, octaves = 4): Float32Array {
    const data = new Float32Array(width * height);
    let amplitude = 1;
    let total = 0;
    let freq = cells;
    for (let o = 0; o < octaves; o++) {
      const gw = freq + 1;
      const gh = Math.max(2, Math.floor(freq * (height / width)) + 1);
      const grid = new Float32Array(gw * gh);
      for (let i = 0; i < grid.length; i++) grid[i] = rand();
      for (let y = 0; y < height; y++) {
        const gy = (y / height) * (gh - 1);
        const y0 = Math.floor(gy);
        const fy = gy - y0;
        const sy = fy * fy * (3 - 2 * fy);
        for (let x = 0; x < width; x++) {
          const gx = (x / width) * (gw - 1);
          const x0 = Math.floor(gx);
          const fx = gx - x0;
          const sx = fx * fx * (3 - 2 * fx);
          const v00 = grid[y0 * gw + x0] ?? 0;
          const v10 = grid[y0 * gw + Math.min(x0 + 1, gw - 1)] ?? 0;
          const v01 = grid[Math.min(y0 + 1, gh - 1) * gw + x0] ?? 0;
          const v11 = grid[Math.min(y0 + 1, gh - 1) * gw + Math.min(x0 + 1, gw - 1)] ?? 0;
          const top = v00 + (v10 - v00) * sx;
          const bottom = v01 + (v11 - v01) * sx;
          data[y * width + x] = (data[y * width + x] ?? 0) + (top + (bottom - top) * sy) * amplitude;
        }
      }
      total += amplitude;
      amplitude *= 0.5;
      freq *= 2;
    }
    for (let i = 0; i < data.length; i++) data[i] = (data[i] ?? 0) / total;
    return data;
  }

  private canvasTexture(paint: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    paint(ctx);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private glowTexture(inner: string, mid: string): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.3, mid);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private planetTexture(planet: Planet): THREE.CanvasTexture {
    const rand = this.mulberry32(this.hashSeed(`planet-${planet.id}`));
    const noise = this.valueNoise(TEX_W, TEX_H, 6, rand);
    const detail = this.valueNoise(TEX_W, TEX_H, 24, rand, 3);

    switch (planet.type) {
      case 'gas-giant':
        return this.canvasTexture((ctx) => this.paintBands(ctx, noise, detail, [
          [210, 180, 140], [190, 140, 100], [230, 210, 180], [170, 110, 80], [220, 190, 150],
        ], 9, true));
      case 'ice-giant':
        return this.canvasTexture((ctx) => this.paintBands(ctx, noise, detail, [
          [170, 210, 230], [140, 190, 220], [190, 225, 240], [120, 170, 210],
        ], 6, false));
      case 'oceanic':
        return this.canvasTexture((ctx) => this.paintTerrain(ctx, noise, detail,
          [18, 55, 115], [[45, 110, 60], [110, 95, 55]], 0.52, true, true));
      case 'terrestrial':
        return this.canvasTexture((ctx) => this.paintTerrain(ctx, noise, detail,
          [25, 70, 110], [[60, 120, 60], [130, 110, 70]], 0.55, true, true));
      case 'rocky':
        return this.canvasTexture((ctx) => this.paintTerrain(ctx, noise, detail,
          [110, 95, 80], [[70, 60, 50], [140, 125, 105]], 0.5, false, false));
      case 'desert':
        return this.canvasTexture((ctx) => this.paintTerrain(ctx, noise, detail,
          [205, 165, 105], [[170, 130, 80], [230, 200, 150]], 0.5, false, false));
      case 'volcanic':
        return this.canvasTexture((ctx) => this.paintVolcanic(ctx, noise, detail));
      case 'frozen':
        return this.canvasTexture((ctx) => this.paintTerrain(ctx, noise, detail,
          [190, 215, 235], [[150, 180, 210], [230, 240, 250]], 0.5, true, false));
      default:
        return this.canvasTexture((ctx) => this.paintTerrain(ctx, noise, detail,
          [120, 120, 120], [[90, 90, 90], [150, 150, 150]], 0.5, false, false));
    }
  }

  private paintTerrain(
    ctx: CanvasRenderingContext2D,
    noise: Float32Array,
    detail: Float32Array,
    ocean: [number, number, number],
    land: [[number, number, number], [number, number, number]],
    landThreshold: number,
    clouds: boolean,
    iceCaps: boolean,
  ): void {
    const img = ctx.createImageData(TEX_W, TEX_H);
    for (let y = 0; y < TEX_H; y++) {
      const lat = Math.abs(y / TEX_H - 0.5) * 2; // 0 equator -> 1 poles
      for (let x = 0; x < TEX_W; x++) {
        const i = y * TEX_W + x;
        const n = (noise[i] ?? 0.5) + ((detail[i] ?? 0.5) - 0.5) * 0.35;
        let r: number;
        let g: number;
        let b: number;
        if (n > landThreshold) {
          const t = Math.min(1, (n - landThreshold) * 3);
          r = land[0][0] + (land[1][0] - land[0][0]) * t;
          g = land[0][1] + (land[1][1] - land[0][1]) * t;
          b = land[0][2] + (land[1][2] - land[0][2]) * t;
        } else {
          const shade = 0.85 + n * 0.3;
          r = ocean[0] * shade;
          g = ocean[1] * shade;
          b = ocean[2] * shade;
        }
        if (iceCaps && lat > 0.82 - (n - 0.5) * 0.2) {
          r = 235; g = 242; b = 250;
        }
        if (clouds && (detail[(y * TEX_W + ((x + 47) % TEX_W))] ?? 0) > 0.68) {
          r = r * 0.35 + 255 * 0.65;
          g = g * 0.35 + 255 * 0.65;
          b = b * 0.35 + 255 * 0.65;
        }
        img.data[i * 4] = Math.min(255, r);
        img.data[i * 4 + 1] = Math.min(255, g);
        img.data[i * 4 + 2] = Math.min(255, b);
        img.data[i * 4 + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  private paintBands(
    ctx: CanvasRenderingContext2D,
    noise: Float32Array,
    detail: Float32Array,
    palette: [number, number, number][],
    bands: number,
    storm: boolean,
  ): void {
    const img = ctx.createImageData(TEX_W, TEX_H);
    for (let y = 0; y < TEX_H; y++) {
      for (let x = 0; x < TEX_W; x++) {
        const i = y * TEX_W + x;
        const warp = ((noise[i] ?? 0.5) - 0.5) * 2.2;
        const bandPos = ((y / TEX_H) * bands + warp + bands) % bands;
        const bandIndex = Math.floor(bandPos) % palette.length;
        const band = palette[bandIndex] ?? [200, 200, 200];
        const shade = 0.9 + ((detail[i] ?? 0.5) - 0.5) * 0.25;
        img.data[i * 4] = Math.min(255, band[0] * shade);
        img.data[i * 4 + 1] = Math.min(255, band[1] * shade);
        img.data[i * 4 + 2] = Math.min(255, band[2] * shade);
        img.data[i * 4 + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    if (storm) {
      // Great-spot-style storm oval
      ctx.fillStyle = 'rgba(225, 150, 110, 0.9)';
      ctx.beginPath();
      ctx.ellipse(TEX_W * 0.68, TEX_H * 0.62, 22, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(240, 200, 160, 0.9)';
      ctx.beginPath();
      ctx.ellipse(TEX_W * 0.68, TEX_H * 0.62, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private paintVolcanic(ctx: CanvasRenderingContext2D, noise: Float32Array, detail: Float32Array): void {
    const img = ctx.createImageData(TEX_W, TEX_H);
    for (let y = 0; y < TEX_H; y++) {
      for (let x = 0; x < TEX_W; x++) {
        const i = y * TEX_W + x;
        const n = noise[i] ?? 0.5;
        const d = detail[i] ?? 0.5;
        // Ridged cracks glow with lava
        const crack = 1 - Math.min(1, Math.abs(n - 0.5) * 6);
        const lava = Math.max(0, crack - 0.45) * 1.8;
        const shade = 0.5 + d * 0.5;
        const r = 35 * shade + lava * 255;
        const g = 25 * shade + lava * 110;
        const b = 22 * shade + lava * 20;
        img.data[i * 4] = Math.min(255, r);
        img.data[i * 4 + 1] = Math.min(255, g);
        img.data[i * 4 + 2] = Math.min(255, b);
        img.data[i * 4 + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  private moonTexture(moon: Moon): THREE.CanvasTexture {
    const rand = this.mulberry32(this.hashSeed(`moon-${moon.id}`));
    const noise = this.valueNoise(TEX_W, TEX_H, 8, rand);
    const base: [number, number, number] = moon.type === 'icy' ? [170, 185, 220] : [135, 125, 115];
    return this.canvasTexture((ctx) => {
      const img = ctx.createImageData(TEX_W, TEX_H);
      for (let i = 0; i < TEX_W * TEX_H; i++) {
        const n = noise[i] ?? 0.5;
        // Craters: dark pits where noise dips low
        const crater = n < 0.32 ? 0.55 : 1;
        const shade = (0.75 + n * 0.5) * crater;
        img.data[i * 4] = Math.min(255, base[0] * shade);
        img.data[i * 4 + 1] = Math.min(255, base[1] * shade);
        img.data[i * 4 + 2] = Math.min(255, base[2] * shade);
        img.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    });
  }

  private ringTexture(seed: string): THREE.CanvasTexture {
    const rand = this.mulberry32(this.hashSeed(`rings-${seed}`));
    const width = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = 8;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    const img = ctx.createImageData(width, 8);
    // Cassini-like division gap
    const gapCenter = 0.62 + (rand() - 0.5) * 0.06;
    for (let x = 0; x < width; x++) {
      const t = x / width;
      let alpha = 0.55 + rand() * 0.1 + Math.sin(t * 40) * 0.12 + Math.sin(t * 13) * 0.1;
      if (Math.abs(t - gapCenter) < 0.025) alpha *= 0.08; // division gap
      if (t < 0.04 || t > 0.97) alpha *= (t < 0.04 ? t / 0.04 : (1 - t) / 0.03); // soft edges
      alpha = Math.max(0, Math.min(1, alpha));
      const tint = 200 + rand() * 30;
      for (let y = 0; y < 8; y++) {
        img.data[(y * width + x) * 4] = tint;
        img.data[(y * width + x) * 4 + 1] = tint * 0.93;
        img.data[(y * width + x) * 4 + 2] = tint * 0.82;
        img.data[(y * width + x) * 4 + 3] = alpha * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // ---------- navigation / lifecycle ----------

  /** Build (or fetch from LRU cache) the stage for a system. */
  private ensureSystemBuilt(system: StarSystem): THREE.Group {
    const existing = this.systemMeshes.get(system.id);
    if (existing) {
      this.touchBuildOrder(system.id);
      return existing;
    }
    // Evict least-recently-used stages first (never the current one).
    while (this.buildOrder.length >= SystemRenderer.MAX_CACHED_SYSTEMS) {
      const oldest = this.buildOrder[0];
      if (oldest === undefined || oldest === this.currentSystem) break;
      this.buildOrder.shift();
      if (oldest !== undefined) this.disposeSystem(oldest);
    }
    const group = this.createSystemMesh(system);
    this.buildOrder.push(system.id);
    return group;
  }

  private touchBuildOrder(systemId: string): void {
    this.buildOrder = this.buildOrder.filter((id) => id !== systemId);
    this.buildOrder.push(systemId);
  }

  /** Is this system's stage already built (no build cost on entry)? */
  isBuilt(systemId: string): boolean {
    return this.systemMeshes.has(systemId);
  }

  enterSystem(system: StarSystem): void {
    const mesh = this.ensureSystemBuilt(system);
    this.currentSystem = system.id;
    this.currentSystemData = system;
    mesh.visible = true;
    this.scene.add(mesh);
    this.activeOrbiters = this.orbitersBySystem.get(system.id) ?? [];
  }

  exitSystem(): void {
    if (this.currentSystem) {
      const mesh = this.systemMeshes.get(this.currentSystem);
      if (mesh) {
        mesh.visible = false;
        this.scene.remove(mesh);
      }
      this.currentSystem = null;
      this.currentSystemData = null;
    }
    this.activeOrbiters = [];
  }

  /** Distance-driven LOD for the active stage (stage is centered on origin). */
  updateLOD(camera: THREE.Camera): void {
    if (!this.currentSystem || !this.currentSystemData) return;
    const lod = this.lodBySystem.get(this.currentSystem);
    if (!lod) return;
    const maxOrbit = this.getMaxOrbit(this.currentSystemData);
    const dist = camera.position.length();
    // Labels go first (clutter), then belt/comet dust, orbit lines last.
    const showLabels = dist < maxOrbit * 12;
    const showDust = dist < maxOrbit * 9;
    const showOrbits = dist < maxOrbit * 30;
    for (const label of lod.labels) label.visible = showLabels;
    for (const dust of lod.dust) dust.visible = showDust;
    for (const line of lod.orbitLines) line.visible = showOrbits;
  }

  /** Pick a body in the active system (NDC coords), or null. */
  pickBody(ndc: THREE.Vector2, camera: THREE.Camera): SystemPick | null {
    if (!this.currentSystem || !this.currentSystemData) return null;
    const group = this.systemMeshes.get(this.currentSystem);
    if (!group) return null;
    this.raycaster.setFromCamera(ndc, camera);
    const hits = this.raycaster.intersectObjects(group.children, true);
    for (const hit of hits) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj && obj !== group) {
        const name = obj.name;
        if (name.startsWith('planet-')) {
          const planet = this.currentSystemData.planets.find((p) => `planet-${p.id}` === name);
          if (planet) return { kind: 'planet', planet, object: obj };
          return null;
        }
        if (name.startsWith('moon-')) {
          const moonId = name.slice('moon-'.length);
          for (const planet of this.currentSystemData.planets) {
            const moon = planet.moons.find((m) => m.id === moonId);
            if (moon) return { kind: 'moon', moon, planet, object: obj };
          }
          return null;
        }
        if (name.startsWith('star-')) {
          const star = this.currentSystemData.stars.find((s) => `star-${s.id}` === name);
          if (star) return { kind: 'star', star, object: obj };
          return null;
        }
        if (name.startsWith('dwarf-')) {
          const dwarf = this.currentSystemData.dwarfPlanets.find((d) => `dwarf-${d.id}` === name);
          if (dwarf) return { kind: 'dwarf', dwarf, object: obj };
          return null;
        }
        obj = obj.parent;
      }
    }
    return null;
  }

  /** Live world position of a planet in the active system (for camera follow). */
  getPlanetWorldPosition(planetId: string, out: THREE.Vector3): boolean {
    if (!this.currentSystem) return false;
    const group = this.systemMeshes.get(this.currentSystem);
    if (!group) return false;
    const obj = group.getObjectByName(`planet-${planetId}`);
    if (!obj) return false;
    obj.getWorldPosition(out);
    return true;
  }

  /** Planet data by id (active system only). */
  getPlanet(planetId: string): Planet | null {
    return this.currentSystemData?.planets.find((p) => p.id === planetId) ?? null;
  }

  setVisibleSystems(systemIds: string[]): void {
    for (const [id, mesh] of this.systemMeshes) {
      mesh.visible = systemIds.includes(id);
    }
  }

  /** Widest orbit in AU — used to frame the camera when flying into the system. */
  getMaxOrbit(system: StarSystem): number {
    let max = 5;
    for (const planet of system.planets) {
      max = Math.max(max, planet.orbitalDistanceAu);
    }
    for (const dwarf of system.dwarfPlanets) {
      max = Math.max(max, dwarf.orbitalDistanceAu);
    }
    return max;
  }

  update(deltaTime: number): void {
    if (!this.currentSystem) return;
    for (const orbiter of this.activeOrbiters) {
      if (orbiter.speed !== 0) {
        orbiter.angle += orbiter.speed * deltaTime;
        const center = orbiter.center.position;
        orbiter.obj.position.set(
          center.x + orbiter.radius * Math.cos(orbiter.angle),
          0,
          center.z + orbiter.radius * Math.sin(orbiter.angle),
        );
      }
      if (orbiter.spin !== 0) {
        orbiter.obj.rotation.y += orbiter.spin * deltaTime;
      }
    }
  }

  private disposeSystem(systemId: string): void {
    const mesh = this.systemMeshes.get(systemId);
    if (!mesh) return;
    if (this.currentSystem === systemId) {
      this.scene.remove(mesh);
      this.currentSystem = null;
      this.currentSystemData = null;
      this.activeOrbiters = [];
    }
    this.disposeGroup(mesh);
    this.systemMeshes.delete(systemId);
    this.orbitersBySystem.delete(systemId);
    this.lodBySystem.delete(systemId);
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const material of materials) {
          const withMap = material as THREE.MeshStandardMaterial;
          withMap.map?.dispose();
          material.dispose();
        }
      } else if (obj instanceof THREE.Points) {
        obj.geometry.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const material of materials) material.dispose();
      } else if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const material of materials) material.dispose();
      } else if (obj instanceof THREE.Sprite) {
        const spriteMaterial = obj.material as THREE.SpriteMaterial;
        spriteMaterial.map?.dispose();
        spriteMaterial.dispose();
      }
    });
  }

  dispose(): void {
    for (const mesh of this.systemMeshes.values()) {
      this.scene.remove(mesh);
      this.disposeGroup(mesh);
    }
    this.systemMeshes.clear();
    this.orbitersBySystem.clear();
    this.lodBySystem.clear();
    this.buildOrder = [];
    this.activeOrbiters = [];
    this.currentSystem = null;
    this.currentSystemData = null;
  }
}
