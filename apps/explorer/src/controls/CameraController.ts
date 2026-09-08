// Camera controller
import * as THREE from 'three';
import { isEditableTarget } from '@/utils/dom';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private target: THREE.Object3D | null = null;
  
  // Movement state
  moveForward = false;
  moveBackward = false;
  moveLeft = false;
  moveRight = false;
  moveUp = false;
  moveDown = false;
  
  // Movement speed
  private speed = 4000;
  private boost = 1;

  // Suspended while a scripted camera flight is running
  enabled = true;

  // Zoom anchor (galaxy center or system star) used for travel clamping
  readonly zoomTarget = new THREE.Vector3(0, 0, 0);
  private maxZoomDistance = 5e8;
  
  // Rotation
  private yaw = 0;
  private pitch = 0;
  private pointerLocked = false;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, _galaxyData?: { systems: Map<string, unknown> }) {
    this.camera = camera;
    this.domElement = domElement;
    
    // Event listeners
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
    domElement.addEventListener('click', this.requestPointerLock.bind(this));
    document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.01, speed);
  }

  private onWheel(event: WheelEvent): void {
    if (!this.enabled) return;
    event.preventDefault();

    // Fly along the view direction: zoom where you're looking, not at the center.
    // Exponential step scaled by distance, so one notch feels the same
    // at galaxy scale (thousands of units) and inside a system (fractions).
    const viewDir = new THREE.Vector3();
    this.camera.getWorldDirection(viewDir);
    const reference = Math.max(this.camera.position.distanceTo(this.zoomTarget), 0.5);
    const step = reference * (1 - Math.exp(event.deltaY * 0.0012));
    this.camera.position.addScaledVector(viewDir, step);

    // Keep the camera inside a sane bubble around the anchor
    const offset = this.camera.position.clone().sub(this.zoomTarget);
    if (offset.length() > this.maxZoomDistance) {
      offset.setLength(this.maxZoomDistance);
      this.camera.position.copy(this.zoomTarget).add(offset);
    }
  }

  /** Re-align yaw/pitch with the current camera orientation (call after scripted flights). */
  syncOrientation(): void {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this.pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
    this.yaw = Math.atan2(-dir.x, -dir.z);
  }

  private requestPointerLock(): void {
    this.domElement.requestPointerLock();
  }

  private onPointerLockChange(): void {
    this.pointerLocked = document.pointerLockElement === this.domElement;
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.pointerLocked) return;
    
    this.yaw -= event.movementX * 0.002;
    this.pitch -= event.movementY * 0.002;
    this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (isEditableTarget(event)) return;
    switch (event.code) {
      case 'KeyW': this.moveForward = true; break;
      case 'KeyS': this.moveBackward = true; break;
      case 'KeyA': this.moveLeft = true; break;
      case 'KeyD': this.moveRight = true; break;
      case 'KeyE': this.moveUp = true; break;
      case 'KeyQ': this.moveDown = true; break;
      case 'ShiftLeft': this.boost = 10; break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (isEditableTarget(event)) return;
    switch (event.code) {
      case 'KeyW': this.moveForward = false; break;
      case 'KeyS': this.moveBackward = false; break;
      case 'KeyA': this.moveLeft = false; break;
      case 'KeyD': this.moveRight = false; break;
      case 'KeyE': this.moveUp = false; break;
      case 'KeyQ': this.moveDown = false; break;
      case 'ShiftLeft': this.boost = 1; break;
      case 'KeyR': this.reset(); break;
    }
  }

  setTarget(target: THREE.Object3D | null): void {
    this.target = target;
  }

  clearTarget(): void {
    this.target = null;
  }

  reset(): void {
    this.camera.position.set(0, 5000, 15000);
    this.yaw = 0;
    this.pitch = 0;
  }

  update(deltaTime: number): void {
    if (!this.enabled) return;
    const speed = this.speed * this.boost * deltaTime;
    
    // Get forward/right vectors from camera
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    
    const move = new THREE.Vector3();
    if (this.moveForward) move.add(forward);
    if (this.moveBackward) move.sub(forward);
    if (this.moveRight) move.add(right);
    if (this.moveLeft) move.sub(right);
    if (this.moveUp) move.y += 1;
    if (this.moveDown) move.y -= 1;
    
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed);
      this.camera.position.add(move);
    }
    
    // Update camera rotation
    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    this.camera.quaternion.slerp(quaternion, 0.1);
  }
}