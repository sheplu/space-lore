// SNR renderer
import * as THREE from 'three';
import { Snr } from '@/types/galaxy';
import { ShaderManager } from '@/shaders/ShaderManager';

export class SnrRenderer {
  private scene: THREE.Scene;
  private shaderManager: ShaderManager;
  private snrs: Map<string, Snr>;
  private meshes: Map<string, THREE.Object3D> = new Map();

  constructor(scene: THREE.Scene, shaderManager: ShaderManager, galaxyData: { snrs: Map<string, Snr> }) {
    this.scene = scene;
    this.shaderManager = shaderManager;
    this.snrs = galaxyData.snrs;
  }

  build(): void {
    for (const [, snr] of this.snrs) {
      this.createSnrMesh(snr);
    }
  }

  private createSnrMesh(snr: Snr): void {
    const group = new THREE.Group();
    group.name = `snr-${snr.id}`;

    const radius = snr.radiusLy;
    const geometry = new THREE.SphereGeometry(radius, 24, 12);
    
    // Color based on SNR type
    const typeColors: Record<string, number> = {
      young: 0xff3300,
      'middle-aged': 0xff8800,
      old: 0x884400,
      plerion: 0x00ffff,
      'thermal-composite': 0xff8844,
    };
    
    const color = new THREE.Color(typeColors[snr.type] ?? 0xff4400);
    
    // Main shell
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: snr.type === 'plerion' ? 0.3 : 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const shellMesh = new THREE.Mesh(geometry, material);
    group.add(shellMesh);

    // For plerions, add central pulsar glow
    if (snr.type === 'plerion' && snr.hasPulsar) {
      const pulsarGeometry = new THREE.SphereGeometry(radius * 0.1, 16, 8);
      const pulsarMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const pulsarMesh = new THREE.Mesh(pulsarGeometry, pulsarMaterial);
      group.add(pulsarMesh);
    }

    // Position
    group.position.set(
      snr.coordinates.x,
      snr.coordinates.y,
      snr.coordinates.z
    );

    this.meshes.set(snr.id, group);
    this.scene.add(group);
  }

  update(deltaTime: number): void {
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