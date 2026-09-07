// Simple galaxy explorer - minimal working version
import * as THREE from 'three';
import { Galaxy, StarSystem } from '@/types/galaxy';
import { ContentLoader } from '@/loaders/ContentLoader';
import { CameraController } from '@/controls/CameraController';
import { TimeController } from '@/controls/TimeController';
import { GalaxyRenderer } from '@/renderers/GalaxyRendererSimple';
import { SystemRenderer } from '@/renderers/SystemRendererSimple';

export interface ExplorerConfig {
  canvas: HTMLCanvasElement;
  contentRoot: string;
  galaxyId?: string;
  debug: boolean;
  enableWebGPU?: boolean;
}

export class GalaxyExplorer {
  private static readonly GALAXY_SPEED = 4000;
  private static readonly SYSTEM_SPEED = 3;

  private config: ExplorerConfig;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private cameraController!: CameraController;
  private timeController!: TimeController;
  private contentLoader!: ContentLoader;

  private galaxyRenderer!: GalaxyRenderer;
  private systemRenderer!: SystemRenderer;

  private galaxyData!: { galaxy: Galaxy; systems: Map<string, StarSystem> };
  private animationId: number | null = null;
  private lastFrameTime = 0;

  private mode: 'galaxy' | 'flight' | 'system' = 'galaxy';
  private currentSystem: StarSystem | null = null;
  private galaxyViewpoint = new THREE.Vector3(0, 5000, 15000);
  private flight: {
    t: number;
    dur: number;
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    lookAt: THREE.Vector3;
    onArrive?: () => void;
  } | null = null;

  private hudLocation: HTMLElement | null = null;
  private hudMessage: HTMLElement | null = null;
  private messageTimer: number | null = null;

  constructor(config: ExplorerConfig) {
    this.config = config;
  }
  
  async initialize(): Promise<void> {
    await this.initializeRenderer();
    this.initializeScene();
    this.contentLoader = new ContentLoader(this.config.contentRoot);
    await this.loadGalaxyData();
    this.initializeRenderers();
    this.initializeControls();
    this.startRenderLoop();
  }

  private async initializeRenderer(): Promise<void> {
    const { canvas } = this.config;
    
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    window.addEventListener('resize', () => this.onResize());
  }

  private initializeScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000005);
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1e9
    );
    this.camera.position.set(0, 5000, 15000);
  }

  private async loadGalaxyData(): Promise<void> {
    const galaxies = await this.contentLoader.listGalaxies();
    const targetGalaxy = this.config.galaxyId 
      ? galaxies.find(g => g.id === this.config.galaxyId)
      : galaxies[0];
    
    if (!targetGalaxy) throw new Error('No galaxy found');
    
    this.galaxyData = await this.contentLoader.loadGalaxy(targetGalaxy.id);
    console.log(`Loaded galaxy: ${this.galaxyData.galaxy.name} with ${this.galaxyData.systems.size} systems`);
  }

  private initializeRenderers(): void {
    this.galaxyRenderer = new GalaxyRenderer(this.scene, { galaxy: this.galaxyData.galaxy, systems: this.galaxyData.systems });
    this.galaxyRenderer.build();
    this.systemRenderer = new SystemRenderer(this.scene, this.galaxyData.systems);
    this.systemRenderer.build();
  }

  private initializeControls(): void {
    this.cameraController = new CameraController(this.camera, this.renderer.domElement);
    this.cameraController.setSpeed(GalaxyExplorer.GALAXY_SPEED);
    this.timeController = new TimeController();
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    this.renderer.domElement.addEventListener('dblclick', (e) => this.onDoubleClick(e));

    this.hudLocation = document.getElementById('hud-location');
    this.hudMessage = document.getElementById('hud-msg');
    this.setHudLocation(this.galaxyData.galaxy.name);
  }

  private startRenderLoop(): void {
    const animate = (time: number) => {
      this.animationId = requestAnimationFrame(animate);
      const deltaTime = (time - this.lastFrameTime) / 1000;
      this.lastFrameTime = time;

      this.timeController.update(deltaTime);
      this.updateFlight(deltaTime);
      this.cameraController.update(deltaTime);

      this.galaxyRenderer.update(deltaTime);
      this.systemRenderer.update(deltaTime);

      this.renderer.render(this.scene, this.camera);
    };

    this.lastFrameTime = performance.now();
    animate(this.lastFrameTime);
  }

  // --- Galaxy <-> system travel ---

  private startFlight(toPos: THREE.Vector3, lookAt: THREE.Vector3, duration: number, onArrive?: () => void): void {
    this.mode = 'flight';
    this.cameraController.enabled = false;
    this.cameraController.moveForward = false;
    this.cameraController.moveBackward = false;
    this.cameraController.moveLeft = false;
    this.cameraController.moveRight = false;
    this.cameraController.moveUp = false;
    this.cameraController.moveDown = false;
    this.flight = {
      t: 0,
      dur: duration,
      fromPos: this.camera.position.clone(),
      toPos: toPos.clone(),
      lookAt: lookAt.clone(),
      onArrive,
    };
  }

  private updateFlight(deltaTime: number): void {
    if (!this.flight) return;
    this.flight.t += deltaTime;
    const k = Math.min(1, this.flight.t / this.flight.dur);
    const smooth = k * k * (3 - 2 * k);
    this.camera.position.lerpVectors(this.flight.fromPos, this.flight.toPos, smooth);
    this.camera.lookAt(this.flight.lookAt);
    if (k >= 1) {
      const onArrive = this.flight.onArrive;
      this.flight = null;
      this.cameraController.enabled = true;
      this.cameraController.syncOrientation();
      onArrive?.();
    }
  }

  private flyToSystem(system: StarSystem): void {
    if (this.mode === 'flight') return;
    if (this.mode === 'system') {
      if (this.currentSystem?.id === system.id) return;
      this.systemRenderer.exitSystem();
    } else {
      this.galaxyViewpoint.copy(this.camera.position);
    }

    const maxOrbit = this.systemRenderer.getMaxOrbit(system);
    const dist = Math.max(maxOrbit * 1.6, 2);
    this.setHudMessage(`Flying to ${system.name}…`);
    this.startFlight(
      new THREE.Vector3(0, dist * 0.45, dist),
      new THREE.Vector3(0, 0, 0),
      2.5,
      () => {
        this.mode = 'system';
        this.currentSystem = system;
        this.systemRenderer.enterSystem(system);
        this.cameraController.setSpeed(GalaxyExplorer.SYSTEM_SPEED);
        this.cameraController.zoomTarget.set(0, 0, 0);
        this.setHudLocation(`${this.galaxyData.galaxy.name} → ${system.name}`);
        this.setHudMessage('');
      },
    );
  }

  private flyToNearestSystem(): void {
    if (this.mode === 'flight') return;
    const system = this.galaxyRenderer.findNearestSystem(this.camera.position);
    if (!system) {
      this.setHudMessage('No star systems in this galaxy');
      return;
    }
    this.flyToSystem(system);
  }

  private returnToGalaxy(): void {
    if (this.mode !== 'system' || this.flight) return;
    if (this.currentSystem) this.systemRenderer.exitSystem();
    this.currentSystem = null;
    this.setHudMessage('Returning to galaxy view…');
    this.startFlight(this.galaxyViewpoint, new THREE.Vector3(0, 0, 0), 2.5, () => {
      this.mode = 'galaxy';
      this.cameraController.setSpeed(GalaxyExplorer.GALAXY_SPEED);
      this.cameraController.zoomTarget.set(0, 0, 0);
      this.setHudLocation(this.galaxyData.galaxy.name);
      this.setHudMessage('');
    });
  }

  private onDoubleClick(event: MouseEvent): void {
    if (this.mode !== 'galaxy') return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const system = this.galaxyRenderer.pickSystem(ndc, this.camera);
    if (system) {
      this.flyToSystem(system);
    } else {
      this.setHudMessage('No system there — double-click a cyan marker, or press F', 4000);
    }
  }

  private setHudLocation(text: string): void {
    if (this.hudLocation) this.hudLocation.textContent = text;
  }

  private setHudMessage(text: string, clearAfterMs?: number): void {
    if (this.hudMessage) this.hudMessage.textContent = text;
    if (this.messageTimer !== null) {
      window.clearTimeout(this.messageTimer);
      this.messageTimer = null;
    }
    if (text && clearAfterMs !== undefined) {
      this.messageTimer = window.setTimeout(() => {
        if (this.hudMessage) this.hudMessage.textContent = '';
        this.messageTimer = null;
      }, clearAfterMs);
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW': this.cameraController.moveForward = true; break;
      case 'KeyS': this.cameraController.moveBackward = true; break;
      case 'KeyA': this.cameraController.moveLeft = true; break;
      case 'KeyD': this.cameraController.moveRight = true; break;
      case 'KeyE': this.cameraController.moveUp = true; break;
      case 'KeyQ': this.cameraController.moveDown = true; break;
      case 'KeyF': this.flyToNearestSystem(); break;
      case 'KeyG': this.returnToGalaxy(); break;
      case 'Escape': this.returnToGalaxy(); break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW': this.cameraController.moveForward = false; break;
      case 'KeyS': this.cameraController.moveBackward = false; break;
      case 'KeyA': this.cameraController.moveLeft = false; break;
      case 'KeyD': this.cameraController.moveRight = false; break;
      case 'KeyE': this.cameraController.moveUp = false; break;
      case 'KeyQ': this.cameraController.moveDown = false; break;
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  dispose(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
  }
}