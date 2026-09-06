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
    this.galaxyRenderer = new GalaxyRenderer(this.scene, { galaxy: this.galaxyData.galaxy });
    this.galaxyRenderer.build();
    this.systemRenderer = new SystemRenderer(this.scene, this.galaxyData.systems);
    this.systemRenderer.build();
  }

  private initializeControls(): void {
    this.cameraController = new CameraController(this.camera, this.renderer.domElement);
    this.timeController = new TimeController();
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private startRenderLoop(): void {
    const animate = (time: number) => {
      this.animationId = requestAnimationFrame(animate);
      const deltaTime = (time - this.lastFrameTime) / 1000;
      this.lastFrameTime = time;
      
      this.timeController.update(deltaTime);
      this.cameraController.update(deltaTime);
      
      this.galaxyRenderer.update(deltaTime);
      
      this.renderer.render(this.scene, this.camera);
    };
    
    this.lastFrameTime = performance.now();
    animate(this.lastFrameTime);
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW': this.cameraController.moveForward = true; break;
      case 'KeyS': this.cameraController.moveBackward = true; break;
      case 'KeyA': this.cameraController.moveLeft = true; break;
      case 'KeyD': this.cameraController.moveRight = true; break;
      case 'KeyE': this.cameraController.moveUp = true; break;
      case 'KeyQ': this.cameraController.moveDown = true; break;
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