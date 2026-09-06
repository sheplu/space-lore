// Simple galaxy renderer
import * as THREE from 'three';
import { Galaxy } from '@/types/galaxy';

export class GalaxyRenderer {
  private scene: THREE.Scene;
  private galaxy: Galaxy;
  private diskMesh: THREE.Points | null = null;
  private bulgeMesh: THREE.Mesh | null = null;
  private haloMesh: THREE.Points | null = null;
  private starField: THREE.Points | null = null;
  private initialized = false;

  constructor(scene: THREE.Scene, galaxyData: { galaxy: Galaxy }) {
    this.scene = scene;
    this.galaxy = galaxyData.galaxy;
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
    const segments = 128;
    
    const positions = new Float32Array(segments * 3);
    const colors = new Float32Array(segments * 3);
    
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const r = radius * (0.1 + 0.9 * Math.random());
      const armCount = 4;
      const armPhase = (angle * armCount) % (Math.PI * 2);
      const armStrength = 0.15;
      
      const x = r * Math.cos(angle + armStrength * Math.sin(armPhase));
      const y = (Math.random() - 0.5) * thickness * 0.1;
      const z = r * Math.sin(angle + armStrength * Math.sin(armPhase));
      
      const i3 = i * 3;
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
      
      // Color based on arm
      const arm = Math.sin(armPhase) > 0 ? 1.0 : 0.5;
      const t = i / segments;
      const color = new THREE.Color().setHSL(0.05 + 0.1 * arm, 0.6, 0.5 + 0.2 * t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 50,
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      sizeAttenuation: true,
    });
    
    this.diskMesh = new THREE.Points(geometry, material);
    this.diskMesh.renderOrder = 1;
    this.scene.add(this.diskMesh);
  }

  private createBulge(): void {
    const radius = this.galaxy.diameterLy * 0.02;
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffddaa,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    
    this.bulgeMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.bulgeMesh);
  }

  private createHalo(): void {
    const particleCount = 20000;
    
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

  update(_deltaTime: number): void {
    if (!this.initialized) return;
    const deltaTime = _deltaTime;
    if (this.diskMesh) this.diskMesh.rotation.z += deltaTime * 0.00001;
    if (this.bulgeMesh) this.bulgeMesh.rotation.y += deltaTime * 0.000005;
    if (this.haloMesh) this.haloMesh.rotation.y += deltaTime * 0.000002;
    if (this.starField) this.starField.rotation.y -= deltaTime * 0.000001;
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
    
    if (this.diskMesh) this.scene.remove(this.diskMesh);
    if (this.bulgeMesh) this.scene.remove(this.bulgeMesh);
    if (this.haloMesh) this.scene.remove(this.haloMesh);
    if (this.starField) this.scene.remove(this.starField);
  }

  private disposeMaterial(material: THREE.Material | THREE.Material[] | null | undefined): void {
    if (!material) return;
    if (Array.isArray(material)) {
      for (const m of material) m.dispose();
    } else {
      material.dispose();
    }
  }
}