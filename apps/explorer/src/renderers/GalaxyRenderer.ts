// Galaxy renderer - renders the galaxy disk, bulge, halo
import * as THREE from 'three';
import { Galaxy, Vec3 } from '@/types/galaxy';
import { ShaderManager } from '@/shaders/ShaderManager';

interface GalaxyRenderConfig {
  galaxy: Galaxy;
  segments: number;
  diskOpacity: number;
  bulgeIntensity: number;
  haloOpacity: number;
}

export class GalaxyRenderer {
  private scene: THREE.Scene;
  private shaderManager: ShaderManager;
  private galaxy: Galaxy;
  private config: GalaxyRenderConfig;
  
  private diskMesh: THREE.Mesh | null = null;
  private bulgeMesh: THREE.Mesh | null = null;
  private haloMesh: THREE.Mesh | null = null;
  private starField: THREE.Points | null = null;
  
  private initialized = false;

  constructor(scene: THREE.Scene, shaderManager: ShaderManager, galaxyData: { galaxy: Galaxy }) {
    this.scene = scene;
    this.shaderManager = shaderManager;
    this.galaxy = galaxyData.galaxy;
    this.config = {
      galaxy: this.galaxy,
      segments: 128,
      diskOpacity: 0.3,
      bulgeIntensity: 1.0,
      haloOpacity: 0.15,
    };
  }

  build(): void {
    this.createDisk();
    this.createBulge();
    this.createHalo();
    this.createStarField();
    this.initialized = true;
  }

  private createDisk(): void {
    const radius = this.galaxy.diameterLy / 2;
    const thickness = this.galaxy.thicknessLy;
    
    // Galaxy disk geometry - spiral arms using custom geometry
    const segments = this.config.segments;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(segments * 3);
    const uvs = new Float32Array(segments * 2);
    const arms = new Float32Array(segments);
    
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const r = radius * (0.1 + 0.9 * Math.random()); // Vary radius
      
      // Add spiral arm perturbation
      const armCount = this.galaxy.type.includes('barred') ? 2 : 4;
      const armPhase = (angle * armCount) % (Math.PI * 2);
      const armStrength = 0.15;
      
      positions[i * 3] = r * Math.cos(angle + armStrength * Math.sin(armPhase));
      positions[i * 3 + 1] = (Math.random() - 0.5) * thickness * 0.1;
      positions[i * 3 + 2] = r * Math.sin(angle + armStrength * Math.sin(armPhase));
      
      uvs[i * 2] = (positions[i * 3] + radius) / (radius * 2);
      uvs[i * 2 + 1] = (positions[i * 3 + 2] + radius) / (radius * 2);
      
      arms[i] = Math.sin(armPhase) > 0 ? 1.0 : 0.5;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setAttribute('arm', new THREE.BufferAttribute(arms, 1));
    
    const material = this.shaderManager.getMaterial('galaxy-disk', {
      transparent: true,
      opacity: this.config.diskOpacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    
    this.diskMesh = new THREE.Points(geometry, material);
    this.diskMesh.renderOrder = 1;
    this.scene.add(this.diskMesh);
  }

  private createBulge(): void {
    const radius = this.galaxy.diameterLy * 0.02; // ~2% of diameter
    
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = this.shaderManager.getMaterial('galaxy-bulge', {
      transparent: true,
      opacity: this.config.bulgeIntensity * 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    
    this.bulgeMesh = new THREE.Mesh(geometry, material);
    this.bulgeMesh.renderOrder = 2;
    this.scene.add(this.bulgeMesh);
  }

  private createHalo(): void {
    const radius = this.galaxy.diameterLy / 2;
    
    // Halo as sparse particle field
    const particleCount = 50000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      // Spherical distribution with r^-2 density falloff
      const r = radius * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      sizes[i] = 10 + Math.random() * 50;
      
      // Old, red stars
      const t = Math.random();
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.6 + t * 0.3;
      colors[i * 3 + 2] = 0.3 + t * 0.2;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = this.shaderManager.getMaterial('galaxy-halo', {
      transparent: true,
      opacity: this.config.haloOpacity,
      depthWrite: false,
      vertexColors: true,
      sizeAttenuation: true,
    });
    
    this.haloMesh = new THREE.Points(geometry, material);
    this.haloMesh.renderOrder = 0;
    this.scene.add(this.haloMesh);
  }

  private createStarField(): void {
    // Background stars (Milky Way style)
    const particleCount = 20000;
    const radius = this.galaxy.diameterLy * 2;
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      // Uniform spherical distribution at large distance
      const r = radius * (0.8 + Math.random() * 0.2);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      sizes[i] = 50 + Math.random() * 200;
      
      // Various star colors
      const t = Math.random();
      const starTypes = [
        [1.0, 1.0, 1.0],    // White
        [1.0, 0.9, 0.7],    // Yellow-white
        [1.0, 0.7, 0.5],    // Orange
        [0.7, 0.8, 1.0],    // Blue
      ];
      const type = starTypes[Math.floor(Math.random() * starTypes.length)];
      colors[i * 3] = type[0];
      colors[i * 3 + 1] = type[1];
      colors[i * 3 + 2] = type[2];
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = this.shaderManager.getMaterial('star-field', {
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      vertexColors: true,
      sizeAttenuation: true,
    });
    
    this.starField = new THREE.Points(geometry, material);
    this.starField.renderOrder = -1;
    this.scene.add(this.starField);
  }

  update(deltaTime: number): void {
    if (!this.initialized) return;
    
    const time = performance.now() * 0.001;
    
    // Slow galaxy rotation
    if (this.diskMesh) {
      this.diskMesh.rotation.z += deltaTime * 0.00001;
    }
    if (this.bulgeMesh) {
      this.bulgeMesh.rotation.y += deltaTime * 0.000005;
    }
    if (this.haloMesh) {
      this.haloMesh.rotation.y += deltaTime * 0.000002;
    }
    if (this.starField) {
      this.starField.rotation.y -= deltaTime * 0.000001;
    }
  }

  dispose(): void {
    this.diskMesh?.geometry.dispose();
    this.diskMesh?.material?.dispose?.();
    this.bulgeMesh?.geometry.dispose();
    this.bulgeMesh?.material?.dispose?.();
    this.haloMesh?.geometry.dispose();
    this.haloMesh?.material?.dispose?.();
    this.starField?.geometry.dispose();
    this.starField?.material?.dispose?.();
    
    this.scene.remove(this.diskMesh!);
    this.scene.remove(this.bulgeMesh!);
    this.scene.remove(this.haloMesh!);
    this.scene.remove(this.starField!);
  }
}