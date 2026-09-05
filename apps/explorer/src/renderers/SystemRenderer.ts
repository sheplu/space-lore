// System renderer - renders star systems and their bodies
import * as THREE from 'three';
import { StarSystem, Star, Planet, Moon, Asteroid, Belt, Comet, DwarfPlanet, Vec3 } from '@/types/galaxy';
import { ShaderManager } from '@/shaders/ShaderManager';

export class SystemRenderer {
  private scene: THREE.Scene;
  private shaderManager: ShaderManager;
  private galaxyData: { systems: Map<string, StarSystem> };
  
  private systemMeshes: Map<string, THREE.Group> = new Map();
  private currentSystem: string | null = null;
  private systemScale = 1e-6; // Scale factor: 1 unit = 1 AU
  
  private initialized = false;

  constructor(scene: THREE.Scene, shaderManager: ShaderManager, galaxyData: { systems: Map<string, StarSystem> }) {
    this.scene = scene;
    this.shaderManager = shaderManager;
    this.galaxyData = galaxyData;
  }

  build(): void {
    // Pre-build all system meshes (but don't add to scene until visible)
    for (const [id, system] of this.galaxyData.systems) {
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
      
      // Add moons
      for (const moon of planet.moons) {
        const moonMesh = this.createMoonMesh(moon);
        group.add(moonMesh);
      }
    }
    
    // Add dwarf planets
    for (const dwarf of system.dwarfPlanets) {
      const dwarfMesh = this.createDwarfPlanetMesh(dwarf);
      group.add(dwarfMesh);
    }
    
    // Add asteroids (as point cloud)
    if (system.asteroids.length > 0) {
      const asteroidMesh = this.createAsteroidMesh(system.asteroids);
      group.add(asteroidMesh);
    }
    
    // Add belts
    for (const belt of system.belts) {
      const beltMesh = this.createBeltMesh(belt);
      group.add(beltMesh);
    }
    
    // Add comets
    if (system.comets.length > 0) {
      const cometMesh = this.createCometMesh(system.comets);
      group.add(cometMesh);
    }
    
    this.systemMeshes.set(system.id, group);
    return group;
  }

  private createStarMesh(star: Star): THREE.Mesh {
    // Scale: star radius in solar radii -> mesh units
    const radius = star.radiusSol * 0.01; // 1 R_sol = 0.01 AU
    
    const geometry = new THREE.SphereGeometry(radius, 32, 16);
    const material = this.getStarMaterial(star);
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `star-${star.id}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Add corona/glow effect
    const glowGeometry = new THREE.SphereGeometry(radius * 1.3, 16, 8);
    const glowMaterial = this.shaderManager.getMaterial('star-glow', {
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.BackSide,
      color: this.getStarColor(star),
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glowMesh);
    
    return mesh;
  }

  private getStarMaterial(star: Star): THREE.Material {
    const color = this.getStarColor(star);
    const temperature = star.temperatureK;
    
    // Use different materials based on star type
    if (star.type === 'black-hole') {
      return this.shaderManager.getMaterial('black-hole', {
        transparent: true,
        opacity: 1.0,
        depthWrite: true,
      });
    }
    
    if (star.type === 'neutron-star') {
      return this.shaderManager.getMaterial('neutron-star', {
        color,
        temperature,
        emission: color.clone().multiplyScalar(0.5),
      });
    }
    
    // Main sequence and other stars
    return this.shaderManager.getMaterial('star-surface', {
      color,
      temperature,
      emission: color.clone().multiplyScalar(Math.max(0, (temperature - 3000) / 20000)),
    });
  }

  private getStarColor(star: Star): THREE.Color {
    const temp = star.temperatureK;
    
    // Black body approximation
    if (temp < 3500) return new THREE.Color(1.0, 0.4, 0.2);      // Red
    if (temp < 5000) return new THREE.Color(1.0, 0.7, 0.4);      // Orange
    if (temp < 6000) return new THREE.Color(1.0, 0.9, 0.6);      // Yellow
    if (temp < 7500) return new THREE.Color(1.0, 1.0, 0.9);      // Yellow-white
    if (temp < 10000) return new THREE.Color(1.0, 1.0, 1.0);     // White
    if (temp < 30000) return new THREE.Color(0.8, 0.9, 1.0);     // Blue-white
    return new THREE.Color(0.6, 0.7, 1.0);                        // Blue
  }

  private createPlanetMesh(planet: Planet): THREE.Mesh {
    const radius = planet.radiusEarth * 0.001; // Earth radius scaled
    const geometry = new THREE.SphereGeometry(radius, 32, 16);
    const material = this.getPlanetMaterial(planet);
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `planet-${planet.id}`;
    mesh.position.set(
      planet.orbitalDistanceAu * this.systemScale * Math.cos(0),
      0,
      planet.orbitalDistanceAu * this.systemScale * Math.sin(0)
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Add rings if present
    if (planet.hasRings) {
      const ringGeometry = new THREE.RingGeometry(radius * 1.4, radius * 2.2, 64);
      const ringMaterial = this.shaderManager.getMaterial('planet-ring', {
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
      ringMesh.rotation.x = -Math.PI / 2;
      mesh.add(ringMesh);
    }
    
    // Add atmosphere glow for planets with atmosphere
    if (planet.atmosphereDensity > 0.5) {
      const atmoGeometry = new THREE.SphereGeometry(radius * 1.05, 32, 16);
      const atmoMaterial = this.shaderManager.getMaterial('atmosphere', {
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        side: THREE.BackSide,
        color: new THREE.Color(0.5, 0.7, 1.0),
      });
      const atmoMesh = new THREE.Mesh(atmoGeometry, atmoMaterial);
      mesh.add(atmoMesh);
    }
    
    return mesh;
  }

  private createMoonMesh(moon: Moon): THREE.Mesh {
    const radius = moon.radiusKm * 1e-6; // km to AU
    const geometry = new THREE.SphereGeometry(radius, 16, 8);
    const material = this.shaderManager.getMaterial('moon', {
      color: moon.type === 'icy' ? 0xaaaaee : 0x888888,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `moon-${moon.id}`;
    return mesh;
  }

  private createDwarfPlanetMesh(dwarf: DwarfPlanet): THREE.Mesh {
    const radius = dwarf.radiusKm * 1e-6;
    const geometry = new THREE.SphereGeometry(radius, 16, 8);
    const material = this.shaderManager.getMaterial('dwarf-planet', {
      color: dwarf.type === 'icy' ? 0xaaaaee : 0x887766,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `dwarf-${dwarf.id}`;
    return mesh;
  }

  private createAsteroidMesh(asteroids: any[]): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(asteroids.length * 3);
    const sizes = new Float32Array(asteroids.length);
    const colors = new Float32Array(asteroids.length * 3);
    
    for (let i = 0; i < asteroids.length; i++) {
      const ast = asteroids[i];
      positions[i * 3] = ast.orbitalDistanceAu * this.systemScale * Math.cos(0);
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = ast.orbitalDistanceAu * this.systemScale * Math.sin(0);
      sizes[i] = Math.max(1, ast.radiusKm * 1e-6 * 100);
      
      const typeColors: Record<string, number[]> = {
        rocky: [0.8, 0.7, 0.6],
        metallic: [0.9, 0.8, 0.7],
        icy: [0.8, 0.9, 1.0],
        carbonaceous: [0.4, 0.3, 0.2],
      };
      const color = typeColors[ast.type] || [0.6, 0.6, 0.6];
      colors[i * 3] = color[0];
      colors[i * 3 + 1] = color[1];
      colors[i * 3 + 2] = color[2];
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = this.shaderManager.getMaterial('asteroid-field', {
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      vertexColors: true,
      sizeAttenuation: true,
    });
    
    return new THREE.Points(geometry, material);
  }

  private createBeltMesh(belt: Belt): THREE.Points {
    const particleCount = 5000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const r = belt.innerEdgeAu + Math.random() * (belt.outerEdgeAu - belt.innerEdgeAu);
      const angle = Math.random() * Math.PI * 2;
      const inclination = (Math.random() - 0.5) * 0.1; // Small inclination
      
      positions[i * 3] = r * Math.cos(angle) * this.systemScale;
      positions[i * 3 + 1] = r * Math.sin(inclination) * this.systemScale;
      positions[i * 3 + 2] = r * Math.sin(angle) * this.systemScale;
      
      sizes[i] = 1 + Math.random() * 5;
      
      // Color by composition
      const compColors: Record<string, number[]> = {
        rocky: [0.8, 0.7, 0.6],
        metallic: [0.9, 0.8, 0.7],
        icy: [0.8, 0.9, 1.0],
        carbonaceous: [0.4, 0.3, 0.2],
      };
      const comp = belt.composition[Math.floor(Math.random() * belt.composition.length)];
      const color = compColors[comp] || [0.6, 0.6, 0.6];
      colors[i * 3] = color[0];
      colors[i * 3 + 1] = color[1];
      colors[i * 3 + 2] = color[2];
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = this.shaderManager.getMaterial('belt', {
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      vertexColors: true,
      sizeAttenuation: true,
    });
    
    return new THREE.Points(geometry, material);
  }

  private createCometMesh(comets: any[]): THREE.Group {
    const group = new THREE.Group();
    // Simplified - just show nucleus
    return group;
  }

  private createDwarfPlanetMesh(dwarf: any): THREE.Mesh {
    const radius = dwarf.radiusKm * 1e-6;
    const geometry = new THREE.SphereGeometry(radius, 16, 8);
    const material = this.shaderManager.getMaterial('dwarf-planet', {
      color: dwarf.type === 'icy' ? 0xaaaaee : 0x887766,
    });
    return new THREE.Mesh(geometry, material);
  }

  enterSystem(system: StarSystem): void {
    this.currentSystem = system.id;
    const mesh = this.systemMeshes.get(system.id);
    if (mesh) {
      mesh.visible = true;
      this.scene.add(mesh);
      
      // Animate orbits
      this.animateOrbits(system);
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

  private animateOrbits(system: StarSystem): void {
    // Animate orbits using GSAP or custom animation
  }

  setVisibleSystems(systemIds: string[]): void {
    for (const [id, mesh] of this.systemMeshes) {
      mesh.visible = systemIds.includes(id);
    }
  }

  update(deltaTime: number): void {
    if (!this.currentSystem) return;
    
    const system = this.galaxyData.systems.get(this.currentSystem);
    if (!system) return;
    
    // Animate star rotation
    // Animate planet orbits
    // Animate moon orbits
  }

  setVisibleSystems(systemIds: string[]): void {
    for (const [id, mesh] of this.systemMeshes) {
      mesh.visible = systemIds.includes(id);
    }
  }

  update(deltaTime: number): void {
    if (!this.currentSystem) return;
    
    const system = this.galaxyData.systems.get(this.currentSystem);
    if (!system) return;
    
    // Animate star rotation
    // Animate planet orbits
    // Animate moon orbits
  }

  dispose(): void {
    for (const [, mesh] of this.systemMeshes) {
      mesh.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose?.());
          } else {
            obj.material?.dispose?.();
          }
        }
      });
    }
    this.systemMeshes.clear();
  }
}