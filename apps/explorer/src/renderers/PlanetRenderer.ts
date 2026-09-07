// Planet close-up renderer — the deepest zoom level.
//
// A dedicated stage (not the system stage) so the focused planet gets
// high segment counts, a proper atmosphere shell, rings and orbiting moons
// without paying that cost for every planet in the system view.
// The system stage is hidden while this is active (fewer draw calls +
// less overdraw); surface textures are shared with the system view through
// the seeded planetTextures cache, so focusing a planet costs no
// re-generation.
import * as THREE from 'three';
import { Planet, Moon } from '@/types/galaxy';
import { planetTexture, moonTexture } from '@/renderers/planetTextures';

interface MoonOrbiter {
  obj: THREE.Object3D;
  radius: number;
  angle: number;
  speed: number;
}

export class PlanetRenderer {
  private scene: THREE.Scene;
  private group: THREE.Group | null = null;
  private planetMesh: THREE.Mesh | null = null;
  private moonOrbiters: MoonOrbiter[] = [];
  private currentPlanetId: string | null = null;
  private spin = 0.15;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  get activePlanetId(): string | null {
    return this.currentPlanetId;
  }

  /** Camera framing distance for the close-up stage. */
  focusDistance(): number {
    return 3.6;
  }

  enterPlanet(planet: Planet, starTemperatureK = 5800): void {
    if (this.currentPlanetId === planet.id && this.group) return;
    this.exitPlanet();

    const group = new THREE.Group();
    group.name = `planet-focus-${planet.id}`;

    // Starlight from a fixed direction, tinted by the host star.
    const starLight = new THREE.DirectionalLight(this.starColor(starTemperatureK), 2.6);
    starLight.position.set(5, 2.5, 3);
    group.add(starLight);
    group.add(new THREE.AmbientLight(0x334455, 0.5));

    const surface = new THREE.Mesh(
      new THREE.SphereGeometry(1, 96, 48),
      new THREE.MeshStandardMaterial({
        map: planetTexture(planet.id, planet.type),
        roughness: 0.95,
        metalness: 0,
      }),
    );
    surface.name = `focus-planet-${planet.id}`;
    group.add(surface);
    this.planetMesh = surface;

    if (planet.atmosphereDensity > 0.15) {
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(1.06, 64, 32),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(0.45, 0.65, 1.0),
          transparent: true,
          opacity: Math.min(0.35, planet.atmosphereDensity * 0.12),
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      group.add(shell);
    }

    if (planet.hasRings) {
      const rings = new THREE.Mesh(
        new THREE.RingGeometry(1.35, 2.35, 128, 4),
        new THREE.MeshBasicMaterial({
          color: 0xd8cdb8,
          transparent: true,
          opacity: 0.75,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      rings.rotation.x = -Math.PI / 2 + 0.2;
      group.add(rings);
    }

    planet.moons.forEach((moon, index) => {
      const moonMesh = this.createMoonMesh(moon);
      const orbitRadius = 1.7 + index * 0.6;
      const angle = index * 2.1;
      moonMesh.position.set(orbitRadius * Math.cos(angle), 0, orbitRadius * Math.sin(angle));
      group.add(moonMesh);
      group.add(this.createOrbitLine(orbitRadius));
      this.moonOrbiters.push({
        obj: moonMesh,
        radius: orbitRadius,
        angle,
        speed: 0.45 / Math.sqrt(Math.max(0.1, orbitRadius)),
      });
    });

    group.add(this.createLabel(planet));
    this.scene.add(group);
    this.group = group;
    this.currentPlanetId = planet.id;
  }

  exitPlanet(): void {
    if (this.group) {
      this.scene.remove(this.group);
      this.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          // Materials reference shared cached textures — dispose the
          // material only, never the texture.
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const material of materials) material.dispose();
        } else if (obj instanceof THREE.Line) {
          obj.geometry.dispose();
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const material of materials) material.dispose();
        } else if (obj instanceof THREE.Sprite) {
          const mat = obj.material as THREE.SpriteMaterial;
          mat.map?.dispose();
          mat.dispose();
        }
      });
      this.group = null;
    }
    this.planetMesh = null;
    this.moonOrbiters = [];
    this.currentPlanetId = null;
  }

  update(deltaTime: number): void {
    if (!this.group) return;
    if (this.planetMesh) this.planetMesh.rotation.y += this.spin * deltaTime;
    for (const m of this.moonOrbiters) {
      m.angle += m.speed * deltaTime;
      m.obj.position.set(m.radius * Math.cos(m.angle), 0, m.radius * Math.sin(m.angle));
      m.obj.rotation.y += 0.2 * deltaTime;
    }
  }

  dispose(): void {
    this.exitPlanet();
  }

  // ---------- internals ----------

  private starColor(temperatureK: number): THREE.Color {
    if (temperatureK < 3500) return new THREE.Color(1.0, 0.4, 0.2);
    if (temperatureK < 5000) return new THREE.Color(1.0, 0.7, 0.4);
    if (temperatureK < 6000) return new THREE.Color(1.0, 0.9, 0.75);
    if (temperatureK < 7500) return new THREE.Color(1.0, 1.0, 0.95);
    if (temperatureK < 10000) return new THREE.Color(0.9, 0.95, 1.0);
    return new THREE.Color(0.7, 0.8, 1.0);
  }

  private createMoonMesh(moon: Moon): THREE.Mesh {
    const radius = Math.max(moon.radiusKm * 8e-5, 0.035);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 16),
      new THREE.MeshStandardMaterial({
        map: moonTexture(moon.id, moon.type),
        roughness: 1,
        metalness: 0,
      }),
    );
    mesh.name = `focus-moon-${moon.id}`;
    return mesh;
  }

  private createOrbitLine(radius: number): THREE.LineLoop {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < 96; i++) {
      const angle = (i / 96) * Math.PI * 2;
      points.push(new THREE.Vector3(radius * Math.cos(angle), 0, radius * Math.sin(angle)));
    }
    return new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0x3a5a8a, transparent: true, opacity: 0.4 }),
    );
  }

  private createLabel(planet: Planet): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    const moonText = planet.moons.length === 1 ? '1 moon' : `${planet.moons.length} moons`;
    const lines = [
      planet.name,
      `${planet.type} · ${planet.meanTempC}°C · ${planet.gravityG}g · life: ${planet.life} · ${moonText}${planet.hasRings ? ' · ringed' : ''}`,
    ];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px ui-monospace, monospace';
    ctx.fillText(lines[0] ?? planet.name, 512, 56);
    ctx.fillStyle = '#9fd8ff';
    ctx.font = '34px ui-monospace, monospace';
    ctx.fillText(lines[1] ?? '', 512, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    }));
    sprite.scale.set(2.6, 0.49, 1);
    sprite.position.y = 1.75;
    sprite.renderOrder = 10;
    return sprite;
  }
}
