// Simple galaxy explorer - minimal working version
import * as THREE from 'three';
import { Galaxy, StarSystem, Planet, QuadrantMapping } from '@/types/galaxy';
import { ContentLoader } from '@/loaders/ContentLoader';
import { CameraController } from '@/controls/CameraController';
import { TimeController } from '@/controls/TimeController';
import { GalaxyRenderer } from '@/renderers/GalaxyRendererSimple';
import { SystemRenderer } from '@/renderers/SystemRendererSimple';
import { QuadrantOverlay, QuadrantId, QUADRANT_LABELS } from '@/renderers/QuadrantOverlay';
import { PlanetRenderer } from '@/renderers/PlanetRenderer';

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
  private static readonly PLANET_SPEED = 0.6;

  private config: ExplorerConfig;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private cameraController!: CameraController;
  private timeController!: TimeController;
  private contentLoader!: ContentLoader;

  private galaxyRenderer!: GalaxyRenderer;
  private quadrantOverlay!: QuadrantOverlay;
  private systemRenderer!: SystemRenderer;
  private planetRenderer!: PlanetRenderer;

  private galaxyData!: { galaxy: Galaxy; systems: Map<string, StarSystem>; quadrantMappings: Map<string, QuadrantMapping> };
  private animationId: number | null = null;
  private lastFrameTime = 0;

  private mode: 'galaxy' | 'quadrant' | 'flight' | 'system' | 'planet' = 'galaxy';
  private currentSystem: StarSystem | null = null;
  private currentQuadrant: QuadrantId | null = null;
  private currentPlanet: Planet | null = null;
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
    // Quadrant layer: tint markers by quadrant + labels/rings with distance LOD.
    this.quadrantOverlay = new QuadrantOverlay(this.scene, {
      galaxy: this.galaxyData.galaxy,
      systems: this.galaxyData.systems,
      quadrantMappings: this.galaxyData.quadrantMappings,
    });
    this.quadrantOverlay.build();
    this.galaxyRenderer.applyQuadrantTint((id) => this.quadrantOverlay.colorFor(id));
    this.systemRenderer = new SystemRenderer(this.scene, this.galaxyData.systems);
    this.systemRenderer.build();
    this.planetRenderer = new PlanetRenderer(this.scene);
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
      this.quadrantOverlay.update(this.camera, this.mode);
      this.systemRenderer.update(deltaTime);
      if (this.mode === 'system') this.systemRenderer.updateLOD(this.camera);
      this.planetRenderer.update(deltaTime);

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
    if (this.mode === 'planet') this.leavePlanetStage();
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
    if (this.flight) return;
    if (this.mode === 'galaxy') return;
    if (this.mode === 'planet') this.leavePlanetStage();
    if (this.currentSystem) this.systemRenderer.exitSystem();
    this.currentSystem = null;
    this.currentQuadrant = null;
    this.currentPlanet = null;
    this.setHudMessage('Returning to galaxy view…');
    this.startFlight(this.galaxyViewpoint, new THREE.Vector3(0, 0, 0), 2.5, () => {
      this.mode = 'galaxy';
      this.cameraController.setSpeed(GalaxyExplorer.GALAXY_SPEED);
      this.cameraController.zoomTarget.set(0, 0, 0);
      this.setHudLocation(this.galaxyData.galaxy.name);
      this.setHudMessage('');
    });
  }

  // --- Quadrant / planet zoom levels ---

  private flyToQuadrant(quadrant: QuadrantId): void {
    if (this.mode === 'flight' || this.mode === 'system' || this.mode === 'planet') return;
    const systems = this.quadrantOverlay.systemsIn(quadrant);
    if (systems.length === 0) {
      this.setHudMessage(`No systems charted in ${QUADRANT_LABELS[quadrant]} yet`, 4000);
      return;
    }
    this.galaxyViewpoint.copy(this.camera.position);
    const centroid = this.quadrantOverlay.centroidOf(quadrant);
    const dist = this.quadrantOverlay.focusDistance(quadrant);
    const toPos = centroid.clone().add(new THREE.Vector3(0, dist * 0.45, dist));
    this.setHudMessage(`Flying to ${QUADRANT_LABELS[quadrant]}…`);
    this.startFlight(toPos, centroid, 2.2, () => {
      this.mode = 'quadrant';
      this.currentQuadrant = quadrant;
      this.cameraController.setSpeed(GalaxyExplorer.GALAXY_SPEED);
      this.cameraController.zoomTarget.copy(centroid);
      this.setHudLocation(`${this.galaxyData.galaxy.name} → ${QUADRANT_LABELS[quadrant]} (${systems.length})`);
      this.setHudMessage('');
    });
  }

  private flyToNearestQuadrant(): void {
    if (this.mode === 'flight' || this.mode === 'system' || this.mode === 'planet') return;
    this.flyToQuadrant(this.quadrantOverlay.nearestQuadrant(this.camera.position));
  }

  private flyToPlanet(planet: Planet): void {
    if (this.mode === 'flight') return;
    if (this.mode !== 'system' && this.mode !== 'planet') return;
    if (this.mode === 'planet' && this.currentPlanet?.id === planet.id) return;
    const system = this.currentSystem;
    if (!system) return;
    this.setHudMessage(`Flying to ${planet.name}…`);
    // Close-up stage is centered on the origin: hide the system stage and the
    // galaxy backdrop on arrival (fewer draw calls, no z-fighting at AU scale).
    const dist = this.planetRenderer.focusDistance();
    this.startFlight(
      new THREE.Vector3(0, dist * 0.45, dist),
      new THREE.Vector3(0, 0, 0),
      2.2,
      () => {
        this.mode = 'planet';
        this.currentPlanet = planet;
        this.systemRenderer.exitSystem();
        this.galaxyRenderer.setVisible(false);
        const primary = system.stars[0];
        this.planetRenderer.enterPlanet(planet, primary?.temperatureK ?? 5800);
        this.cameraController.setSpeed(GalaxyExplorer.PLANET_SPEED);
        this.cameraController.zoomTarget.set(0, 0, 0);
        this.setHudLocation(`${this.galaxyData.galaxy.name} → ${system.name} → ${planet.name}`);
        this.setHudMessage('');
      },
    );
  }

  private flyToNearestPlanet(): void {
    if (this.mode !== 'system' || !this.currentSystem) return;
    const tmp = new THREE.Vector3();
    let best: Planet | null = null;
    let bestDist = Infinity;
    for (const planet of this.currentSystem.planets) {
      if (this.systemRenderer.getPlanetWorldPosition(planet.id, tmp)) {
        const d = tmp.distanceToSquared(this.camera.position);
        if (d < bestDist) {
          bestDist = d;
          best = planet;
        }
      }
    }
    if (!best) {
      this.setHudMessage('No planets in this system', 4000);
      return;
    }
    this.flyToPlanet(best);
  }

  /** Hide the planet stage and restore the galaxy backdrop (keeps system cache). */
  private leavePlanetStage(): void {
    this.planetRenderer.exitPlanet();
    this.galaxyRenderer.setVisible(true);
    this.currentPlanet = null;
  }

  /** Step back up one zoom level: planet → system → galaxy. */
  private stepBack(): void {
    if (this.mode === 'flight') return;
    if (this.mode === 'planet' && this.currentSystem) {
      const system = this.currentSystem;
      this.leavePlanetStage();
      const maxOrbit = this.systemRenderer.getMaxOrbit(system);
      const dist = Math.max(maxOrbit * 1.6, 2);
      this.setHudMessage(`Returning to ${system.name}…`);
      this.startFlight(
        new THREE.Vector3(0, dist * 0.45, dist),
        new THREE.Vector3(0, 0, 0),
        2.0,
        () => {
          this.mode = 'system';
          this.systemRenderer.enterSystem(system);
          this.cameraController.setSpeed(GalaxyExplorer.SYSTEM_SPEED);
          this.cameraController.zoomTarget.set(0, 0, 0);
          this.setHudLocation(`${this.galaxyData.galaxy.name} → ${system.name}`);
          this.setHudMessage('');
        },
      );
      return;
    }
    this.returnToGalaxy();
  }

  private onDoubleClick(event: MouseEvent): void {
    if (this.mode === 'flight' || this.mode === 'planet') return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    if (this.mode === 'system') {
      const pick = this.systemRenderer.pickBody(ndc, this.camera);
      if (pick?.kind === 'planet') {
        this.flyToPlanet(pick.planet);
      } else if (pick?.kind === 'moon' && pick.planet) {
        this.flyToPlanet(pick.planet);
      } else if (pick) {
        this.setHudMessage('Planet close-ups only — double-click a planet', 4000);
      } else {
        this.setHudMessage('No planet there — double-click a planet, or press P', 4000);
      }
      return;
    }
    const system = this.galaxyRenderer.pickSystem(ndc, this.camera);
    if (system) {
      this.flyToSystem(system);
    } else {
      this.setHudMessage('No system there — double-click a marker, or press F', 4000);
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
      case 'KeyC': this.flyToNearestQuadrant(); break;
      case 'KeyP': this.flyToNearestPlanet(); break;
      case 'KeyG': this.returnToGalaxy(); break;
      case 'Escape': this.stepBack(); break;
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
    this.planetRenderer.dispose();
    this.systemRenderer.dispose();
    this.quadrantOverlay.dispose();
    this.galaxyRenderer.dispose();
    this.renderer.dispose();
  }
}