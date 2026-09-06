// Nebula renderer
import * as THREE from 'three';
import { Nebula } from '@/types/galaxy';
import { ShaderManager } from '@/shaders/ShaderManager';

export class NebulaRenderer {
  private scene: THREE.Scene;
  private shaderManager: ShaderManager;
  private nebulae: Map<string, Nebula>;
  private meshes: Map<string, THREE.Object3D> = new Map();

  constructor(scene: THREE.Scene, shaderManager: ShaderManager, galaxyData: { nebulae: Map<string, Nebula> }) {
    this.scene = scene;
    this.shaderManager = shaderManager;
    this.nebulae = galaxyData.nebulae;
  }

  build(): void {
    for (const [, nebula] of this.nebulae) {
      this.createNebulaMesh(nebula);
    }
  }

  private createNebulaMesh(nebula: Nebula): void {
    const group = new THREE.Group();
    group.name = `nebula-${nebula.id}`;

    const radius = nebula.radiusLy;
    const geometry = new THREE.SphereGeometry(radius, 32, 16);
    
    // Pick a color from palette
    const colorHex = nebula.colorPalette[0] ?? '#ff3300';
    const color = new THREE.Color(colorHex);
    
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(1);
    group.add(mesh);

    // Add outer glow
    const glowGeometry = new THREE.SphereGeometry(radius * 1.3, 16, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glowMesh);

    // Position
    group.position.set(
      nebula.coordinates.x,
      nebula.coordinates.y,
      nebula.coordinates.z
    );

    this.meshes.set(nebula.id, group);
    this.scene.add(group);
  }

  update(deltaTime: number): void {
    // Slow rotation
    for (const [, mesh] of this.meshes) {
      mesh.rotation.y += deltaTime * 0.00001;
    }
  }

  setVisible(ids: string[]): void {
    for (const [id, mesh] of this.meshes) {
      mesh.visible = ids.includes(id);
    }
  }

  dispose(): void {
    for (const [, mesh] of this.meshes) {
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
    this.meshes.clear();
  }
}