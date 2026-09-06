// Simple system renderer
import * as THREE from 'three';
import { StarSystem, Star, Planet, Moon, DwarfPlanet } from '@/types/galaxy';

export class SystemRenderer {
  private scene: THREE.Scene;
  private systems: Map<string, StarSystem>;
  private currentSystem: string | null = null;
  private systemMeshes = new Map<string, THREE.Group>();

  constructor(scene: THREE.Scene, systems: Map<string, StarSystem>) {
    this.scene = scene;
    this.systems = systems;
  }

  build(): void {
    for (const [, system] of this.systems) {
      this.createSystemMesh(system);
    }
  }

  private createSystemMesh(system: StarSystem): THREE.Group {
    const group = new THREE.Group();
    group.name = `system-${system.id}`;
    group.visible = false;

    // System stage uses 1 unit = 1 AU, centered on the primary star.
    // Body sizes are exaggerated (not to scale) so everything is navigable.

    // Add stars
    for (const star of system.stars) {
      const starMesh = this.createStarMesh(star);
      group.add(starMesh);
    }

    // Add planets (with their moons positioned relative to the planet)
    for (const planet of system.planets) {
      const planetMesh = this.createPlanetMesh(planet);
      group.add(planetMesh);

      planetMesh.updateMatrixWorld(true);
      const planetPos = new THREE.Vector3();
      planetMesh.getWorldPosition(planetPos);

      planet.moons.forEach((moon, index) => {
        const planetRadius = (planetMesh.geometry as THREE.SphereGeometry).parameters.radius;
        const moonMesh = this.createMoonMesh(moon, planetPos, planetRadius, index);
        group.add(moonMesh);
      });
    }

    // Add dwarf planets at their true orbital distances
    for (const dwarf of system.dwarfPlanets) {
      const dwarfMesh = this.createDwarfPlanetMesh(dwarf);
      group.add(dwarfMesh);
    }

    this.systemMeshes.set(system.id, group);
    return group;
  }

  private createStarMesh(star: Star): THREE.Mesh {
    // Exaggerated: true Sun = 0.00465 AU, clamped so giants don't swallow the stage
    const radius = THREE.MathUtils.clamp(star.radiusSol * 0.05, 0.02, 1.5);
    
    // Star color based on temperature
    const temp = star.temperatureK;
    let color = new THREE.Color(1, 1, 1);
    if (temp < 3500) color.set(1.0, 0.4, 0.2);
    else if (temp < 5000) color.set(1.0, 0.7, 0.4);
    else if (temp < 6000) color.set(1.0, 0.9, 0.6);
    else if (temp < 7500) color.set(1.0, 1.0, 0.9);
    else if (temp < 10000) color.set(1.0, 1.0, 1.0);
    else if (temp < 30000) color.set(0.8, 0.9, 1.0);
    else color.set(0.6, 0.7, 1.0);

    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: false,
    });

    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), material);
    mesh.name = `star-${star.id}`;
    
    // Add glow
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.BackSide,
    });
    const glowMesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.3, 16, 8), glowMaterial);
    mesh.add(glowMesh);

    return mesh;
  }

  private createPlanetMesh(planet: Planet): THREE.Mesh {
    const radius = Math.max(planet.radiusEarth * 0.01, 0.005);
    
    // Planet color by type
    const typeColors: Record<string, number> = {
      rocky: 0x887766, oceanic: 0x2266aa, 'gas-giant': 0xddaa88,
      'ice-giant': 0x88bbdd, desert: 0xddaa66, volcanic: 0xdd4422,
      frozen: 0xaaccff, terrestrial: 0x448844,
    };
    const color = new THREE.Color(typeColors[planet.type] || 0x888888);

    const material = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), material);
    mesh.name = `planet-${planet.id}`;
    mesh.position.set(planet.orbitalDistanceAu, 0, 0);

    if (planet.hasRings) {
      const ringGeometry = new THREE.RingGeometry(radius * 1.4, radius * 2.2, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
      ringMesh.rotation.x = -Math.PI / 2;
      mesh.add(ringMesh);
    }

    return mesh;
  }

  private createMoonMesh(moon: Moon, planetPos: THREE.Vector3, planetRadius: number, index: number): THREE.Mesh {
    const radius = Math.max(moon.radiusKm * 1e-5, 0.003);
    const material = new THREE.MeshBasicMaterial({
      color: moon.type === 'icy' ? 0xaaaaee : 0x888888,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 8), material);
    mesh.name = `moon-${moon.id}`;
    // True Moon distance (384400 km = 0.0026 AU) would hug the planet,
    // so exaggerate while keeping moons clearly bound to their planet.
    const orbitDist = Math.max(moon.orbitalDistanceKm * 1e-7, planetRadius * 2.5);
    const angle = (index / Math.max(1, 4)) * Math.PI * 2 + 0.7;
    mesh.position.set(
      planetPos.x + orbitDist * Math.cos(angle),
      0,
      planetPos.z + orbitDist * Math.sin(angle),
    );
    return mesh;
  }

  private createDwarfPlanetMesh(dwarf: DwarfPlanet): THREE.Mesh {
    const radius = Math.max(dwarf.radiusKm * 1e-5, 0.003);
    const material = new THREE.MeshBasicMaterial({
      color: dwarf.type === 'icy' ? 0xaaaaee : 0x887766,
    });
    const dwarfGeometry = new THREE.SphereGeometry(radius, 16, 8);
    const mesh = new THREE.Mesh(dwarfGeometry, material);
    mesh.name = `dwarf-${dwarf.id}`;
    mesh.position.set(dwarf.orbitalDistanceAu, 0, 0);
    return mesh;
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

  enterSystem(system: StarSystem): void {
    this.currentSystem = system.id;
    const mesh = this.systemMeshes.get(system.id);
    if (mesh) {
      mesh.visible = true;
      this.scene.add(mesh);
    }
  }

  exitSystem(): void {
    if (this.currentSystem) {
      const mesh = this.systemMeshes.get(this.currentSystem);
      if (mesh) {
        mesh.visible = false;
        this.scene.remove(mesh);
      }
      this.currentSystem = null;
    }
  }

  setVisibleSystems(systemIds: string[]): void {
    for (const [id, mesh] of this.systemMeshes) {
      mesh.visible = systemIds.includes(id);
    }
  }

  update(_deltaTime: number): void {
    if (!this.currentSystem) return;
  }

  dispose(): void {
    for (const [, mesh] of this.systemMeshes) {
      mesh.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const material = obj.material as THREE.Material | THREE.Material[];
          if (Array.isArray(material)) {
            for (const m of material) m.dispose();
          } else {
            material.dispose();
          }
        }
      });
    }
    this.systemMeshes.clear();
  }
}