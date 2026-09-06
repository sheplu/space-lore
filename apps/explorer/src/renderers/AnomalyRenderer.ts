// Anomaly renderer
import * as THREE from 'three';
import { Anomaly } from '@/types/galaxy';
import { ShaderManager } from '@/shaders/ShaderManager';

export class AnomalyRenderer {
  private scene: THREE.Scene;
  private shaderManager: ShaderManager;
  private anomalies: Map<string, Anomaly>;
  private meshes: Map<string, THREE.Object3D> = new Map();

  constructor(scene: THREE.Scene, shaderManager: ShaderManager, galaxyData: { anomalies: Map<string, Anomaly> }) {
    this.scene = scene;
    this.shaderManager = shaderManager;
    this.anomalies = galaxyData.anomalies;
  }

  build(): void {
    for (const [, anomaly] of this.anomalies) {
      this.createAnomalyMesh(anomaly);
    }
  }

  private createAnomalyMesh(anomaly: Anomaly): void {
    const group = new THREE.Group();
    group.name = `anomaly-${anomaly.id}`;

    // Visual representation based on danger level
    const dangerColors: Record<string, number> = {
      harmless: 0x00ff00,
      low: 0xffff00,
      moderate: 0xff8800,
      high: 0xff4400,
      extreme: 0xff0000,
    };

    const color = new THREE.Color(dangerColors[anomaly.dangerLevel] || 0xffffff);

    const geometry = new THREE.SphereGeometry(100, 16, 8);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    // Add pulsing glow
    const glowGeometry = new THREE.SphereGeometry(150, 16, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glowMesh);

    // Position - for galaxy-scoped anomalies use coordinates, for system/planet bound we'd need to look up
    if (anomaly.location.scope === 'galaxy' && anomaly.location.coordinates) {
      group.position.set(
        anomaly.location.coordinates.x,
        anomaly.location.coordinates.y,
        anomaly.location.coordinates.z
      );
    }

    this.meshes.set(anomaly.id, group);
    this.scene.add(group);
  }

  update(deltaTime: number): void {
    for (const [, mesh] of this.meshes) {
      mesh.rotation.y += deltaTime * 0.0001;
      // Pulsing animation
      const time = performance.now() * 0.001;
      const scale = 1 + Math.sin(time * 2) * 0.1;
      mesh.scale.setScalar(scale);
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