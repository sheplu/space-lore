// Galaxy data types matching the generated schema
// These are imported from the generated content JSON

export interface Range {
  min: number;
  max: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface LoreFields {
  name: string;
  description: string;
  tags: string[];
}

export type GalaxyType = 'spiral' | 'barred-spiral' | 'elliptical' | 'irregular';

export interface Galaxy {
  id: string;
  name: string;
  description: string;
  tags: string[];
  type: GalaxyType;
  diameterLy: number;
  thicknessLy: number;
  estimatedStarCount: number;
  agn?: AGN;
}

export interface AGN {
  type: 'seyfert-1' | 'seyfert-2' | 'quasar' | 'blazar' | 'radio-galaxy' | 'liner';
  blackHoleMassSol: number;
  eddingtonRatio: number;
  bolometricLuminosityErgs: number;
  xrayLuminosityErgs: number;
  radioLuminosityErgs: number;
  jetPowerErgs: number;
  variabilityTimescaleDays: number;
  openingAngleDeg: number;
  lorenztFactor: number;
  traits: string[];
  observedEffects: string[];
  dangerLevel: 'harmless' | 'low' | 'moderate' | 'high' | 'extreme';
}

export interface StarSystem {
  id: string;
  name: string;
  description: string;
  tags: string[];
  galaxyId: string;
  coordinates: Vec3;
  ageBillionYears: number;
  stars: Star[];
  starOrbits: StarOrbit[];
  planets: Planet[];
  dwarfPlanets: DwarfPlanet[];
  asteroids: Asteroid[];
  belts: Belt[];
  comets: Comet[];
  planetNameMapping: Record<string, string>;
}

export interface StarOrbit {
  index: number;
  starIds: string[];
}

export type StarType = 'main-sequence' | 'white-dwarf' | 'neutron-star' | 'black-hole' | 'brown-dwarf' | 'supergiant' | 'hypergiant';
export type StarClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';
export type NeutronStarSubtype = 'radio-pulsar' | 'magnetar' | 'x-ray-pulsar' | 'normal';
export type BlackHoleSubtype = 'normal' | 'xrb';

export interface Star {
  id: string;
  name: string;
  description: string;
  tags: string[];
  type: StarType;
  class?: StarClass;
  subtype?: NeutronStarSubtype | BlackHoleSubtype;
  temperatureK: number;
  massSol: number;
  radiusSol: number;
  luminositySol: number;
  periodSeconds?: number;
  periodDerivative?: number;
  magneticFieldGauss?: number;
  xrayLuminosityErgs?: number;
  accretionRateEddington?: number;
  diskTemperatureK?: number;
  hasJets?: boolean;
  jetPowerErgs?: number;
}

export type PlanetType = 'rocky' | 'oceanic' | 'gas-giant' | 'ice-giant' | 'desert' | 'volcanic' | 'frozen' | 'terrestrial';
export type LifeLevel = 'none' | 'microbial' | 'simple' | 'complex' | 'intelligent';
export type MoonType = 'rocky' | 'icy' | 'volcanic' | 'captured-asteroid' | 'shepherd';
export type AsteroidType = 'rocky' | 'metallic' | 'icy' | 'carbonaceous';
export type BeltType = 'main' | 'kuiper' | 'scattered' | 'trojan';
export type DwarfPlanetType = 'icy' | 'rocky' | 'hybrid';
export type CometType = 'short-period' | 'long-period' | 'sungrazer' | 'interstellar';

export interface Planet {
  id: string;
  name: string;
  description: string;
  tags: string[];
  orbitIndex: number;
  orbitalDistanceAu: number;
  type: PlanetType;
  radiusEarth: number;
  gravityG: number;
  meanTempC: number;
  atmosphereDensity: number;
  hasRings: boolean;
  life: LifeLevel;
  moons: Moon[];
}

export interface Moon {
  id: string;
  name: string;
  description: string;
  tags: string[];
  planetId: string;
  orbitIndex: number;
  orbitalDistanceKm: number;
  type: MoonType;
  radiusKm: number;
  gravityG: number;
  hasAtmosphere: boolean;
}

export interface Asteroid {
  id: string;
  name: string;
  description: string;
  tags: string[];
  orbitIndex: number;
  orbitalDistanceAu: number;
  type: AsteroidType;
  radiusKm: number;
  massKg: number;
  albedo: number;
  rotationPeriodHours: number;
}

export interface Belt {
  id: string;
  name: string;
  description: string;
  tags: string[];
  orbitIndex: number;
  innerEdgeAu: number;
  outerEdgeAu: number;
  type: BeltType;
  totalMassEarth: number;
  largestBodyId?: string;
  composition: AsteroidType[];
}

export interface DwarfPlanet {
  id: string;
  name: string;
  description: string;
  tags: string[];
  orbitIndex: number;
  orbitalDistanceAu: number;
  type: DwarfPlanetType;
  radiusKm: number;
  gravityG: number;
  meanTempC: number;
  hasAtmosphere: boolean;
  moonCount: number;
}

export interface Comet {
  id: string;
  name: string;
  description: string;
  tags: string[];
  orbitIndex: number;
  semiMajorAxisAu: number;
  eccentricity: number;
  inclinationDeg: number;
  perihelionAu: number;
  aphelionAu: number;
  orbitalPeriodYears: number;
  type: CometType;
  nucleusRadiusKm: number;
  isActive: boolean;
  dustProductionRate: number;
  gasProductionRate: number;
}

export type NebulaType = 'emission' | 'reflection' | 'dark' | 'planetary' | 'supernova-remnant' | 'molecular-cloud' | 'hii-region';

export interface Nebula {
  id: string;
  name: string;
  description: string;
  tags: string[];
  galaxyId: string;
  type: NebulaType;
  coordinates: Vec3;
  radiusLy: number;
  temperatureK: number;
  densityCm3: number;
  massSol: number;
  ionizationLevel: number;
  magneticFieldMicroG: number;
  composition: string[];
  containedSystemIds: string[];
  starFormationActivity: 'none' | 'low' | 'moderate' | 'high' | 'extreme';
  colorPalette: string[];
  ageMyr?: number;
  centralObjectId?: string;
  observedEffects: string[];
  dangerLevel: 'harmless' | 'low' | 'moderate' | 'high' | 'extreme';
}

export type ClusterType = 'globular' | 'open' | 'nuclear' | 'association';

export interface Cluster {
  id: string;
  name: string;
  description: string;
  tags: string[];
  galaxyId: string;
  type: ClusterType;
  coordinates: Vec3;
  ageGyr: number;
  massSol: number;
  coreRadiusLy: number;
  tidalRadiusLy: number;
  metallicityFeH: number;
  concentration: number;
  velocityDispersionKms: number;
  stellarDensityCore: number;
  stellarDensityHalfMass: number;
  memberSystemIds: string[];
  traits: string[];
  observedEffects: string[];
}

export type SnrType = 'young' | 'middle-aged' | 'old' | 'plerion' | 'thermal-composite';

export interface Snr {
  id: string;
  name: string;
  description: string;
  tags: string[];
  galaxyId: string;
  type: SnrType;
  coordinates: Vec3;
  ageYr: number;
  radiusLy: number;
  expansionVelocityKms: number;
  temperatureK: number;
  luminosityXrayErgs: number;
  luminosityRadioErgs: number;
  magneticFieldMicroG: number;
  densityCm3: number;
  sweptUpMassSol: number;
  ejectaMassSol: number;
  composition: string[];
  shockStage: 'free-expansion' | 'sedov-taylor' | 'radiative' | 'plerionic';
  hasPulsar: boolean;
  hasPwn: boolean;
  centralPulsarId?: string;
  traits: string[];
  observedEffects: string[];
  dangerLevel: 'harmless' | 'low' | 'moderate' | 'high' | 'extreme';
}

export type AnomalyCategory = 'gravitational' | 'temporal' | 'energy' | 'spatial' | 'biological' | 'exotic' | 'unknown';
export type DangerLevel = 'harmless' | 'low' | 'moderate' | 'high' | 'extreme';
export type AnomalyScope = 'galaxy' | 'system' | 'planet';

export interface Anomaly {
  id: string;
  name: string;
  description: string;
  tags: string[];
  category: AnomalyCategory;
  dangerLevel: DangerLevel;
  location: {
    scope: AnomalyScope;
    coordinates?: Vec3;
    systemId?: string;
    planetId?: string;
  };
  observedEffects: string[];
  containmentPossible: boolean;
}

export type QuadrantName = 'core' | 'inner-arm' | 'outer-arm' | 'halo' | 'bar' | 'inner-halo' | 'outer-halo' | 'central' | 'region-1' | 'region-2' | 'region-3';

export interface QuadrantMapping {
  systems: Record<string, string>;
}

export type ContentKind = 
  | 'galaxy' 
  | 'starSystem' 
  | 'nebula' 
  | 'cluster' 
  | 'snr' 
  | 'anomaly' 
  | 'starSystemQuadrantMapping';

// Runtime types for rendering
export interface RenderableObject {
  id: string;
  position: THREE.Vector3;
  visible: boolean;
  lod: number;
}

export interface GalaxyRenderData {
  galaxy: Galaxy;
  systems: Map<string, StarSystem>;
  nebulae: Map<string, Nebula>;
  clusters: Map<string, Cluster>;
  snrs: Map<string, Snr>;
  anomalies: Map<string, Anomaly>;
  quadrantMappings: Map<QuadrantName, QuadrantMapping>;
}