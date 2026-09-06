// Cluster renderer
import * as THREE from 'three';
import { Cluster } from '@/types/galaxy';
import { ShaderManager } from '@/shaders/ShaderManager';

export class ClusterRenderer {
  private scene: THREE.Scene;
  private shaderManager: ShaderManager;
  private clusters: Map<string, Cluster>;
  private meshes: Map<string, THREE.Object3D> = new Map();

  constructor(scene: THREE.Scene, shaderManager: ShaderManager, galaxyData: { clusters: Map<string, Cluster> }) {
    this.scene = scene;
    this.shaderManager = shaderManager;
    this.clusters = galaxyData.clusters;
  }

  build(): void {
    for (const [, cluster] of this.clusters) {
      this.createClusterMesh(cluster);
    }
  }

  private createClusterMesh(cluster: Cluster): void {
    const group = new THREE.Group();
    group.name = `cluster-${cluster.id}`;

    const radius = cluster.tidalRadiusLy;
    const geometry = new THREE.SphereGeometry(radius, 16, 8);
    
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    // Add core
    const coreGeometry = new THREE.SphereGeometry(cluster.coreRadiusLy, 16, 8);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffee,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(coreMesh);

    group.position.set(
      cluster.coordinates.x,
      cluster.coordinates.y,
      cluster.coordinates.z
    );

    this.meshes.set(cluster.id, group);
    this.scene.add(group);
  }

  update(deltaTime: number): void {
    for (const [, mesh] of this.meshes) {
      mesh.rotation.y += deltaTime * 0.000005;
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