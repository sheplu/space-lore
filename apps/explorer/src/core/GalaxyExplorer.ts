// Core engine - main application orchestrator
import * as THREE from 'three';
import { GUI } from 'dat.gui';
import { gsap } from 'gsap';
import { Galaxy, GalaxyRenderData, StarSystem, Vec3, QuadrantName } from '@/types/galaxy';
import { ContentLoader } from '@/loaders/ContentLoader';
import { GalaxyRenderer } from '@/renderers/GalaxyRenderer';
import { SystemRenderer } from '@/renderers/SystemRenderer';
import { NebulaRenderer } from '@/renderers/NebulaRenderer';
import { ClusterRenderer } from '@/renderers/ClusterRenderer';
import { SnrRenderer } from '@/renderers/SnrRenderer';
import { AnomalyRenderer } from '@/renderers/AnomalyRenderer';
import { CameraController } from '@/controls/CameraController';
import { TimeController } from '@/controls/TimeController';
import { ShaderManager } from '@/shaders/ShaderManager';
import { Octree } from '@/utils/Octree';

export interface ExplorerConfig {
  canvas: HTMLCanvasElement;
  contentRoot: string;
  galaxyId?: string;
  enableWebGPU: boolean;
  debug: boolean;
}

export class GalaxyExplorer {
  private config: ExplorerConfig;
  private renderer!: THREE.WebGLRenderer | THREE.WebGPURenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private cameraController!: CameraController;
  private timeController!: TimeController;
  private gui!: GUI;
  private shaderManager!: ShaderManager;
  private contentLoader!: ContentLoader;
  private octree!: Octree;
  
  // Renderers
  private galaxyRenderer!: GalaxyRenderer;
  private systemRenderer!: SystemRenderer;
  private nebulaRenderer!: NebulaRenderer;
  private clusterRenderer!: ClusterRenderer;
  private snrRenderer!: SnrRenderer;
  private anomalyRenderer!: AnomalyRenderer;
  
  // Data
  private galaxyData!: GalaxyRenderData;
  private currentSystem: StarSystem | null = null;
  private animationId: number | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;
  private fps = 60;

  constructor(config: ExplorerConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // 1. Initialize renderer
    await this.initializeRenderer();
    
    // 2. Initialize scene and camera
    this.initializeScene();
    
    // 3. Initialize loaders and load data
    this.contentLoader = new ContentLoader(this.config.contentRoot);
    await this.loadGalaxyData();
    
    // 4. Initialize renderers
    this.initializeRenderers();
    
    // 5. Initialize controls
    this.initializeControls();
    
    // 5. Initialize debug GUI
    if (this.config.debug) {
      this.initializeDebugGUI();
    }
    
    // 6. Start render loop
    this.startRenderLoop();
  }

  private async initializeRenderer(): Promise<void> {
    const { canvas, enableWebGPU } = this.config;
    
    if (enableWebGPU && 'gpu' in navigator) {
      try {
        this.renderer = new THREE.WebGPURenderer({
          canvas,
          antialias: true,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        });
        await this.renderer.init();
        console.log('WebGPU renderer initialized');
      } catch (e) {
        console.warn('WebGPU failed, falling back to WebGL2:', e);
        this.renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        });
      }
    } else {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
      });
    }
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    window.addEventListener('resize', () => this.onResize());
  }

  private initializeScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000005);
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1e9 // Far plane for galaxy scale
    );
    this.camera.position.set(0, 5000, 15000);
  }

  private async loadGalaxyData(): Promise<void> {
    // Find galaxy
    const galaxies = await this.contentLoader.listGalaxies();
    const targetGalaxy = this.config.galaxyId 
      ? galaxies.find(g => g.id === this.config.galaxyId)
      : galaxies[0];
    
    if (!targetGalaxy) {
      throw new Error('No galaxy found');
    }
    
    console.log(`Loading galaxy: ${targetGalaxy.name} (${targetGalaxy.id})`);
    
    // Load full galaxy data
    this.galaxyData = await this.contentLoader.loadGalaxy(targetGalaxy.id);
    
    // Build spatial index
    this.octree = new Octree(this.galaxyData);
    console.log(`Loaded ${this.galaxyData.systems.size} systems, ${this.galaxyData.nebulae.size} nebulae, ${this.galaxyData.clusters.size} clusters, ${this.galaxyData.snrs.size} SNRs, ${this.galaxyData.anomalies.size} anomalies`);
  }

  private initializeRenderers(): void {
    this.shaderManager = new ShaderManager(this.renderer);
    
    this.galaxyRenderer = new GalaxyRenderer(this.scene, this.shaderManager, this.galaxyData);
    this.systemRenderer = new SystemRenderer(this.scene, this.shaderManager, this.galaxyData);
    this.nebulaRenderer = new NebulaRenderer(this.scene, this.shaderManager, this.galaxyData);
    this.clusterRenderer = new ClusterRenderer(this.scene, this.shaderManager, this.galaxyData);
    this.snrRenderer = new SnrRenderer(this.scene, this.shaderManager, this.galaxyData);
    this.anomalyRenderer = new AnomalyRenderer(this.scene, this.shaderManager, this.galaxyData);
    
    // Build initial render data
    this.galaxyRenderer.build();
    this.nebulaRenderer.build();
    this.clusterRenderer.build();
    this.snrRenderer.build();
    this.anomalyRenderer.build();
  }

  private initializeControls(): void {
    this.cameraController = new CameraController(this.camera, this.renderer.domElement, this.galaxyData);
    this.timeController = new TimeController();
    
    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  private initializeDebugGUI(): void {
    this.gui = new GUI({ title: 'Galaxy Explorer Debug', width: 320 });
    
    const cameraFolder = this.gui.addFolder('Camera');
    cameraFolder.add(this.camera.position, 'x', -1e5, 1e5).name('X').listen();
    cameraFolder.add(this.camera.position, 'y', -1e5, 1e5).name('Y').listen();
    cameraFolder.add(this.camera.position, 'z', -1e5, 1e5).name('Z').listen();
    
    const renderFolder = this.gui.addFolder('Render');
    renderFolder.add(this, 'fps', 0, 120).name('FPS').listen();
    
    const debugFolder = this.gui.addFolder('Debug');
    debugFolder.add(this, 'toggleWireframe').name('Wireframe');
    debugFolder.add(this, 'toggleBoundingBoxes').name('Bounding Boxes');
    
    const timeFolder = this.gui.addFolder('Time');
    timeFolder.add(this.timeController, 'timeScale', 0, 1000).name('Time Scale');
    debugFolder.add(this.timeController, 'paused').name('Paused');
  }

  private startRenderLoop(): void {
    const animate = (time: number) => {
      this.animationId = requestAnimationFrame(animate);
      
      const deltaTime = (time - this.lastFrameTime) / 1000;
      this.lastFrameTime = time;
      
      // Update time
      this.timeController.update(deltaTime);
      
      // Update controls
      this.cameraController.update(deltaTime * this.timeController.timeScale);
      
      // Update renderers
      this.galaxyRenderer.update(this.timeController.deltaTime * this.timeController.timeScale);
      this.systemRenderer.update(this.timeController.deltaTime * this.timeController.timeScale);
      this.nebulaRenderer.update(this.timeController.deltaTime * this.timeController.timeScale);
      this.clusterRenderer.update(this.timeController.deltaTime * this.timeController.timeScale);
      this.snrRenderer.update(this.timeController.deltaTime * this.timeController.timeScale);
      this.anomalyRenderer.update(this.timeController.deltaTime * this.timeController.timeScale);
      
      // Frustum culling via octree
      this.cullObjects();
      
      // Render
      this.renderer.render(this.scene, this.camera);
      
      // FPS calculation
      this.frameCount++;
      if (this.frameCount % 30 === 0) {
        this.fps = Math.round(1 / deltaTime);
      }
    };
    
    this.lastFrameTime = performance.now();
    animate(this.lastFrameTime);
  }

  private cullObjects(): void {
    const frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse)
    );
    
    // Query octree for visible objects
    const visibleSystems = this.octree.queryFrustum(frustum);
    this.systemRenderer.setVisibleSystems(visibleSystems);
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW': this.cameraController.moveForward = true; break;
      case 'KeyS': this.cameraController.moveBackward = true; break;
      case 'KeyA': this.cameraController.moveLeft = true; break;
      case 'KeyD': this.cameraController.moveRight = true; break;
      case 'KeyQ': this.cameraController.moveDown = true; break;
      case 'KeyE': this.cameraController.moveUp = true; break;
      case 'KeyR': this.cameraController.reset(); break;
      case 'KeyF': this.enterSystem(this.currentSystem?.id || ''); break;
      case 'KeyG': this.exitSystem(); break;
      case 'Space': this.timeController.paused = !this.timeController.paused; break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW': this.cameraController.moveForward = false; break;
      case 'KeyS': this.cameraController.moveBackward = false; break;
      case 'KeyA': this.cameraController.moveLeft = false; break;
      case 'KeyD': this.cameraController.moveRight = false; break;
      case 'KeyQ': this.cameraController.moveDown = false; break;
      case 'KeyE': this.cameraController.moveUp = false; break;
    }
  }

  private enterSystem(systemId: string): void {
    const system = this.galaxyData.systems.get(systemId);
    if (!system) return;
    
    this.currentSystem = system;
    this.systemRenderer.enterSystem(system);
    this.cameraController.setTarget(system);
  }

  private exitSystem(): void {
    if (!this.currentSystem) return;
    
    this.currentSystem = null;
    this.systemRenderer.exitSystem();
    this.cameraController.clearTarget();
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private toggleWireframe(): void {
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material.wireframe = !obj.material.wireframe;
      }
    });
  }

  private toggleBoundingBoxes(): void {
    // Toggle bounding box helpers
  }

  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    this.renderer.dispose();
    this.gui?.destroy();
    this.shaderManager.dispose();
    
    this.galaxyRenderer.dispose();
    this.systemRenderer.dispose();
    this.nebulaRenderer.dispose();
    this.clusterRenderer.dispose();
    this.snrRenderer.dispose();
    this.anomalyRenderer.dispose();
    
    this.contentLoader.dispose();
  }
}