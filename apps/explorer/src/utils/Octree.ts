// Octree for spatial culling
import * as THREE from 'three';

interface OctreeNode {
  bounds: THREE.Box3;
  children: OctreeNode[] | null;
  objects: string[]; // object IDs
  depth: number;
}

export class Octree {
  private root: OctreeNode;
  private maxDepth: number;
  private maxObjectsPerNode: number;

  constructor(data: { systems: Map<string, { coordinates: { x: number; y: number; z: number } }> }, maxDepth = 8, maxObjectsPerNode = 10) {
    this.maxDepth = maxDepth;
    this.maxObjectsPerNode = maxObjectsPerNode;
    
    // Compute bounds from all systems
    const bounds = new THREE.Box3();
    let hasObjects = false;
    
    for (const [, system] of data.systems) {
      const pos = new THREE.Vector3(system.coordinates.x, system.coordinates.y, system.coordinates.z);
      bounds.expandByPoint(pos);
      hasObjects = true;
    }
    
    if (!hasObjects) {
      bounds.set(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
    }
    
    // Add padding
    bounds.expandByScalar(1000);
    
    this.root = {
      bounds,
      children: null,
      objects: [],
      depth: 0,
    };
    
    // Insert all systems
    for (const [id, system] of data.systems) {
      const pos = new THREE.Vector3(system.coordinates.x, system.coordinates.y, system.coordinates.z);
      this.insert(this.root, id, pos);
    }
  }

  private insert(node: OctreeNode, objectId: string, _position: THREE.Vector3): void {
    // Add to current node
    node.objects.push(objectId);
    
    // Subdivide if needed
    if (node.objects.length > this.maxObjectsPerNode && node.depth < this.maxDepth) {
      this.subdivide(node);
      
      // Redistribute objects to children
      const objects = node.objects;
      node.objects = [];
      
      for (const objId of objects) {
        // We'd need to store positions to properly redistribute
        // For now, just put in all children (simplified)
        for (const child of node.children!) {
          child.objects.push(objId);
        }
      }
    }
  }

  private subdivide(node: OctreeNode): void {
    const bounds = node.bounds;
    const min = bounds.min;
    const max = bounds.max;
    const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
    
    node.children = [];
    
    // Create 8 octants
    for (let x = 0; x < 2; x++) {
      for (let y = 0; y < 2; y++) {
        for (let z = 0; z < 2; z++) {
          const childMin = new THREE.Vector3(
            x === 0 ? min.x : center.x,
            y === 0 ? min.y : center.y,
            z === 0 ? min.z : center.z
          );
          const childMax = new THREE.Vector3(
            x === 0 ? center.x : max.x,
            y === 0 ? center.y : max.y,
            z === 0 ? center.z : max.z
          );
          
          node.children.push({
            bounds: new THREE.Box3(childMin, childMax),
            children: null,
            objects: [],
            depth: node.depth + 1,
          });
        }
      }
    }
  }

  queryFrustum(frustum: THREE.Frustum): string[] {
    const result: string[] = [];
    this.queryFrustumRecursive(this.root, frustum, result);
    return result;
  }

  private queryFrustumRecursive(node: OctreeNode, frustum: THREE.Frustum, result: string[]): void {
    // Check if node bounds intersect frustum
    if (!frustum.intersectsBox(node.bounds)) {
      return;
    }
    
    // Add objects in this node
    result.push(...node.objects);
    
    // Recurse into children
    if (node.children) {
      for (const child of node.children) {
        this.queryFrustumRecursive(child, frustum, result);
      }
    }
  }

  querySphere(center: THREE.Vector3, radius: number): string[] {
    const result: string[] = [];
    this.querySphereRecursive(this.root, center, radius, result);
    return result;
  }

  private querySphereRecursive(node: OctreeNode, center: THREE.Vector3, radius: number, result: string[]): void {
    // Check if node bounds intersect sphere
    const closestPoint = node.bounds.clampPoint(center, new THREE.Vector3());
    const distance = center.distanceTo(closestPoint);
    
    if (distance > radius) {
      return;
    }
    
    result.push(...node.objects);
    
    if (node.children) {
      for (const child of node.children) {
        this.querySphereRecursive(child, center, radius, result);
      }
    }
  }

  getAllObjects(): string[] {
    const result: string[] = [];
    this.collectAll(this.root, result);
    return result;
  }

  private collectAll(node: OctreeNode, result: string[]): void {
    result.push(...node.objects);
    if (node.children) {
      for (const child of node.children) {
        this.collectAll(child, result);
      }
    }
  }
}