import type { Range } from './star-classes.ts'

export type { Range }

export const CLUSTER_TYPES = [
  'globular',
  'open',
  'nuclear',
  'association',
] as const

export type ClusterType = (typeof CLUSTER_TYPES)[number]

export interface ClusterTypeProfile {
  type: ClusterType
  ageGyr: Range
  massSol: Range
  coreRadiusLy: Range
  tidalRadiusLy: Range
  metallicityFeH: Range
  concentration: Range
  velocityDispersionKms: Range
  stellarDensityCore: Range
  stellarDensityHalfMass: Range
  traits: string[]
  typicalLocation: string[]
}

export const CLUSTER_TYPE_PROFILES: Record<ClusterType, ClusterTypeProfile> = {
  globular: {
    type: 'globular',
    ageGyr: { min: 10, max: 13.5 },
    massSol: { min: 1e4, max: 1e7 },
    coreRadiusLy: { min: 0.5, max: 10 },
    tidalRadiusLy: { min: 20, max: 200 },
    metallicityFeH: { min: -2.5, max: -0.5 },
    concentration: { min: 0.5, max: 2.5 },
    velocityDispersionKms: { min: 5, max: 20 },
    stellarDensityCore: { min: 1e3, max: 1e6 },
    stellarDensityHalfMass: { min: 10, max: 1e4 },
    traits: ['ancient population', 'metal-poor', 'spherical symmetry', 'no gas/dust', 'RR Lyrae variables', 'blue stragglers', 'X-ray sources'],
    typicalLocation: ['halo', 'bulge', 'thick disk'],
  },
  open: {
    type: 'open',
    ageGyr: { min: 0.001, max: 1 },
    massSol: { min: 50, max: 5000 },
    coreRadiusLy: { min: 1, max: 10 },
    tidalRadiusLy: { min: 5, max: 30 },
    metallicityFeH: { min: -0.5, max: 0.5 },
    concentration: { min: 0.1, max: 1.0 },
    velocityDispersionKms: { min: 0.5, max: 3 },
    stellarDensityCore: { min: 1, max: 1000 },
    stellarDensityHalfMass: { min: 0.1, max: 100 },
    traits: ['young population', 'metal-rich', 'irregular shape', 'residual gas/dust', 'pre-main-sequence stars', 'HII regions', 'expanding'],
    typicalLocation: ['thin disk', 'spiral arms'],
  },
  nuclear: {
    type: 'nuclear',
    ageGyr: { min: 1, max: 10 },
    massSol: { min: 1e6, max: 1e8 },
    coreRadiusLy: { min: 0.1, max: 5 },
    tidalRadiusLy: { min: 10, max: 100 },
    metallicityFeH: { min: -1.0, max: 0.5 },
    concentration: { min: 1.0, max: 3.0 },
    velocityDispersionKms: { min: 30, max: 150 },
    stellarDensityCore: { min: 1e6, max: 1e9 },
    stellarDensityHalfMass: { min: 1e4, max: 1e7 },
    traits: ['galactic center', 'coexists with SMBH', 'extreme density', 'multiple populations', 'stellar collisions', 'tidal stripping'],
    typicalLocation: ['galactic nucleus'],
  },
  association: {
    type: 'association',
    ageGyr: { min: 0.001, max: 0.05 },
    massSol: { min: 100, max: 1e5 },
    coreRadiusLy: { min: 5, max: 50 },
    tidalRadiusLy: { min: 20, max: 200 },
    metallicityFeH: { min: -0.5, max: 0.3 },
    concentration: { min: 0.01, max: 0.3 },
    velocityDispersionKms: { min: 1, max: 10 },
    stellarDensityCore: { min: 0.1, max: 10 },
    stellarDensityHalfMass: { min: 0.01, max: 1 },
    traits: ['very young', 'unbound', 'OB/T/R associations', 'recent star formation', 'expanding rapidly', 'parent molecular cloud'],
    typicalLocation: ['spiral arms', 'star-forming regions'],
  },
}

export const CLUSTER_TYPES_LIST = Object.keys(CLUSTER_TYPE_PROFILES) as ClusterType[]

export function getClusterProfile(type: ClusterType): ClusterTypeProfile {
  return CLUSTER_TYPE_PROFILES[type]
}