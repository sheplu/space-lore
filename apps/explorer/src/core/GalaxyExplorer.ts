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
import { buildSearchIndex, searchEntries, type SearchEntry } from '@/search/searchIndex';
import { SearchBox } from '@/search/SearchBox';
import { isEditableTarget } from '@/utils/dom';

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
  /**
   * Seamless-zoom tuning.
   * Galaxy units are light-years (disk radius ~40k), system/planet stage units are AU.
   */
  private static readonly ENTER_RADIUS = 2500; // zoom this close to a marker (while facing it) → dive in
  private static readonly ENTER_CONE_DEG = 12; // must be roughly looking at the system
  private static readonly EMERGE_DIST = 3000; // surfacing distance above the system marker
  private static readonly TRANSITION_COOLDOWN_MS = 2000; // ignore auto-transitions right after one
  private static readonly DIVE_DURATION = 1.4; // seconds for the zoom-triggered dive flight
  private static readonly PLANET_EXIT_FACTOR = 4; // planet stage exit at focusDistance × this

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
  private cooldownUntil = 0;
  private flight: {
    t: number;
    dur: number;
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    lookAt: THREE.Vector3;
    fadeFrom: number | null;
    fadeTo: number | null;
    onArrive?: () => void;
  } | null = null;

  private hudLocation: HTMLElement | null = null;
  private hudMessage: HTMLElement | null = null;
  private messageTimer: number | null = null;
  private searchIndex: SearchEntry[] = [];
  private searchBox: SearchBox | null = null;
  private pendingPlanetId: string | null = null;

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
    this.searchIndex = buildSearchIndex(this.galaxyData.systems.values());
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
    this.searchBox = new SearchBox({
      onQuery: (q) => searchEntries(this.searchIndex, q),
      onSelect: (entry) => this.focusSearchResult(entry),
    });
    document.body.append(this.searchBox.element);
  }

  /** Fly to a search result: systems dive directly, planets dive via their system. */
  private focusSearchResult(entry: SearchEntry): void {
    if (this.mode === 'flight') return;
    const system = this.galaxyData.systems.get(entry.systemId);
    if (!system) {
      this.setHudMessage(`No longer charted: ${entry.name}`, 4000);
      return;
    }
    if (entry.kind === 'system' || !entry.planetId) {
      this.pendingPlanetId = null;
      this.flyToSystem(system);
      return;
    }
    const planet = system.planets.find((p) => p.id === entry.planetId);
    if (!planet) {
      this.setHudMessage(`No longer charted: ${entry.name}`, 4000);
      return;
    }
    if ((this.mode === 'system' || this.mode === 'planet') && this.currentSystem?.id === system.id) {
      this.flyToPlanet(planet);
      return;
    }
    this.pendingPlanetId = planet.id;
    this.flyToSystem(system);
  }

  private startRenderLoop(): void {
    const animate = (time: number) => {
      this.animationId = requestAnimationFrame(animate);
      const deltaTime = (time - this.lastFrameTime) / 1000;
      this.lastFrameTime = time;

      this.timeController.update(deltaTime);
      this.updateFlight(deltaTime);
      if (!this.flight) this.updateSeamlessZoom();
      this.updateDynamicSpeed();
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

  // --- Seamless zoom: no clicks, just scroll ---

  private updateSeamlessZoom(): void {
    if (performance.now() < this.cooldownUntil) return;
    if (this.mode === 'galaxy' || this.mode === 'quadrant') {
      // Scrolling toward a system marker dives straight into its system.
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      const hit = this.galaxyRenderer.findSystemAlongView(
        this.camera.position,
        dir,
        GalaxyExplorer.ENTER_RADIUS,
        GalaxyExplorer.ENTER_CONE_DEG,
      );
      if (hit) this.flyToSystem(hit.system, GalaxyExplorer.DIVE_DURATION);
    } else if (this.mode === 'system' && this.currentSystem) {
      // Deep zoom onto a planet opens its close-up stage…
      const nearest = this.systemRenderer.findNearestPlanet(this.camera.position);
      if (nearest && nearest.distance < this.systemRenderer.planetRenderRadius(nearest.planet) * 40 + 1.5) {
        this.flyToPlanet(nearest.planet);
        return;
      }
      // …while zooming far out surfaces back to the galaxy right above this
      // system — spatial continuity instead of a jump cut.
      if (this.camera.position.length() > this.systemExitRadius(this.currentSystem)) {
        this.surfaceToGalaxy(this.currentSystem);
      }
    } else if (this.mode === 'planet' && this.currentPlanet) {
      // Zooming far out of a close-up steps back to the system stage.
      if (this.camera.position.length() > this.planetRenderer.focusDistance() * GalaxyExplorer.PLANET_EXIT_FACTOR) {
        this.stepBack();
      }
    }
  }

  /** Zoom-out distance (system stage units) that triggers surfacing to galaxy view. */
  private systemExitRadius(system: StarSystem): number {
    return Math.max(150, this.systemRenderer.getMaxOrbit(system) * 4);
  }

  /** WASD speed follows altitude so one control scheme works from galaxy to planet. */
  private updateDynamicSpeed(): void {
    const toTarget = Math.max(0.05, this.camera.position.distanceTo(this.cameraController.zoomTarget));
    if (this.mode === 'system') {
      this.cameraController.setSpeed(THREE.MathUtils.clamp(toTarget * 0.5, 0.05, 10));
    } else if (this.mode === 'planet') {
      this.cameraController.setSpeed(THREE.MathUtils.clamp(toTarget * 0.5, 0.01, 2));
    } else if (this.mode === 'galaxy' || this.mode === 'quadrant') {
      this.cameraController.setSpeed(THREE.MathUtils.clamp(toTarget * 0.5, 200, 6000));
    }
  }

  // --- Galaxy <-> system travel ---

  private startFlight(
    toPos: THREE.Vector3,
    lookAt: THREE.Vector3,
    duration: number,
    opts: { fadeFrom?: number; fadeTo?: number; onArrive?: () => void } = {},
  ): void {
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
      fadeFrom: opts.fadeFrom ?? null,
      fadeTo: opts.fadeTo ?? null,
      onArrive: opts.onArrive,
    };
  }

  private updateFlight(deltaTime: number): void {
    if (!this.flight) return;
    this.flight.t += deltaTime;
    const k = Math.min(1, this.flight.t / this.flight.dur);
    const smooth = k * k * (3 - 2 * k);
    this.camera.position.lerpVectors(this.flight.fromPos, this.flight.toPos, smooth);
    this.camera.lookAt(this.flight.lookAt);
    // Galaxy crossfade only for flights that opted in (galaxy ↔ system dives).
    if (this.flight.fadeFrom !== null && this.flight.fadeTo !== null) {
      this.galaxyRenderer.setFade(THREE.MathUtils.lerp(this.flight.fadeFrom, this.flight.fadeTo, smooth));
    }
    if (k >= 1) {
      const onArrive = this.flight.onArrive;
      this.flight = null;
      this.cameraController.enabled = true;
      this.cameraController.syncOrientation();
      this.cooldownUntil = performance.now() + GalaxyExplorer.TRANSITION_COOLDOWN_MS;
      onArrive?.();
    }
  }

  private flyToSystem(system: StarSystem, duration = 2.5): void {
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
    this.setHudMessage(`Diving into ${system.name}…`);
    this.startFlight(
      new THREE.Vector3(0, dist * 0.45, dist),
      new THREE.Vector3(0, 0, 0),
      duration,
      {
        fadeFrom: 1,
        fadeTo: 0,
        onArrive: () => {
          this.mode = 'system';
          this.currentSystem = system;
          this.currentQuadrant = null;
          this.currentPlanet = null;
          this.systemRenderer.enterSystem(system);
          this.cameraController.setSpeed(GalaxyExplorer.SYSTEM_SPEED);
          this.cameraController.zoomTarget.set(0, 0, 0);
          this.setHudLocation(`${this.galaxyData.galaxy.name} → ${system.name}`);
          this.setHudMessage('');
          // Search-driven dives chain into the requested planet on arrival.
          if (this.pendingPlanetId) {
            const pending = system.planets.find((p) => p.id === this.pendingPlanetId);
            this.pendingPlanetId = null;
            if (pending) this.flyToPlanet(pending);
          }
        },
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
    this.startFlight(this.galaxyViewpoint, new THREE.Vector3(0, 0, 0), 2.5, {
      fadeFrom: 0,
      fadeTo: 1,
      onArrive: () => {
        this.mode = 'galaxy';
        this.cameraController.setSpeed(GalaxyExplorer.GALAXY_SPEED);
        this.cameraController.zoomTarget.set(0, 0, 0);
        this.setHudLocation(this.galaxyData.galaxy.name);
        this.setHudMessage('');
      },
    });
  }

  /**
   * Zoom-triggered surfacing: emerge from the system stage at a viewpoint
   * above the system's own marker, preserving the exit direction so the
   * zoom-out feels spatially continuous.
   */
  private surfaceToGalaxy(system: StarSystem): void {
    if (this.mode !== 'system' || this.flight) return;
    this.systemRenderer.exitSystem();
    this.currentSystem = null;
    this.currentQuadrant = null;
    this.currentPlanet = null;
    const marker = new THREE.Vector3(system.coordinates.x, system.coordinates.y, system.coordinates.z);
    const outDir = this.camera.position.clone().sub(new THREE.Vector3(0, 0, 0));
    if (outDir.lengthSq() < 1e-6) outDir.set(0, 0.45, 1);
    outDir.normalize();
    // Lift the emerge point out of the disk plane so the galaxy is in frame.
    outDir.y = Math.max(outDir.y, 0.25);
    outDir.normalize();
    const emergeAt = marker.clone().addScaledVector(outDir, GalaxyExplorer.EMERGE_DIST);
    this.galaxyViewpoint.copy(emergeAt);
    this.setHudMessage(`Surfacing to ${this.galaxyData.galaxy.name}…`);
    this.startFlight(emergeAt, marker, 1.6, {
      fadeFrom: 0,
      fadeTo: 1,
      onArrive: () => {
        this.mode = 'galaxy';
        this.cameraController.setSpeed(GalaxyExplorer.GALAXY_SPEED);
        this.cameraController.zoomTarget.copy(marker);
        this.setHudLocation(this.galaxyData.galaxy.name);
        this.setHudMessage(`Near ${system.name} — scroll in to dive back`);
      },
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
    this.startFlight(toPos, centroid, 2.2, { onArrive: () => {
      this.mode = 'quadrant';
      this.currentQuadrant = quadrant;
      this.cameraController.setSpeed(GalaxyExplorer.GALAXY_SPEED);
      this.cameraController.zoomTarget.copy(centroid);
      this.setHudLocation(`${this.galaxyData.galaxy.name} → ${QUADRANT_LABELS[quadrant]} (${systems.length})`);
      this.setHudMessage('');
    } });
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
      { onArrive: () => {
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
      } },
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
        { onArrive: () => {
          this.mode = 'system';
          this.systemRenderer.enterSystem(system);
          this.cameraController.setSpeed(GalaxyExplorer.SYSTEM_SPEED);
          this.cameraController.zoomTarget.set(0, 0, 0);
          this.setHudLocation(`${this.galaxyData.galaxy.name} → ${system.name}`);
          this.setHudMessage('');
        } },
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
      this.setHudMessage('No system there — scroll toward a marker to dive in, double-click, or press F', 4000);
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
    // Never hijack keystrokes typed into inputs (search box, devtools, …).
    if (isEditableTarget(event)) return;
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
      case 'Slash':
        event.preventDefault();
        this.searchBox?.focus();
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (isEditableTarget(event)) return;
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
    this.searchBox?.dispose();
    this.searchBox = null;
    this.planetRenderer.dispose();
    this.systemRenderer.dispose();
    this.quadrantOverlay.dispose();
    this.galaxyRenderer.dispose();
    this.renderer.dispose();
  }
}