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

    // Add stars
    for (const star of system.stars) {
      const starMesh = this.createStarMesh(star);
      group.add(starMesh);
    }

    // Add planets
    for (const planet of system.planets) {
      const planetMesh = this.createPlanetMesh(planet);
      group.add(planetMesh);

      for (const moon of planet.moons) {
        const moonMesh = this.createMoonMesh(moon);
        group.add(moonMesh);
      }
    }

    this.systemMeshes.set(system.id, group);
    return group;
  }

  private createStarMesh(star: Star): THREE.Mesh {
    const radius = star.radiusSol * 0.01;
    
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
    const radius = planet.radiusEarth * 0.001;
    
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
    mesh.position.set(
      planet.orbitalDistanceAu * 1e-6 * Math.cos(0),
      0,
      planet.orbitalDistanceAu * 1e-6 * Math.sin(0)
    );

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

  private createMoonMesh(moon: Moon): THREE.Mesh {
    const radius = moon.radiusKm * 1e-6;
    const material = new THREE.MeshBasicMaterial({
      color: moon.type === 'icy' ? 0xaaaaee : 0x888888,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 8), material);
    mesh.name = `moon-${moon.id}`;
    return mesh;
  }

  private createDwarfPlanetMesh(dwarf: DwarfPlanet): THREE.Mesh {
    const radius = dwarf.radiusKm * 1e-6;
    const material = new THREE.MeshBasicMaterial({
      color: dwarf.type === 'icy' ? 0xaaaaee : 0x887766,
    });
    const dwarfGeometry = new THREE.SphereGeometry(radius, 16, 8);
    const mesh = new THREE.Mesh(dwarfGeometry, material);
    mesh.name = `dwarf-${dwarf.id}`;
    return mesh;
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