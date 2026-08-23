export const ANOMALY_CATEGORIES = [
  'gravitational',
  'temporal',
  'energy',
  'spatial',
  'quantum',
  'biological',
] as const

export type AnomalyCategory = (typeof ANOMALY_CATEGORIES)[number]

export const DANGER_LEVELS = ['low', 'moderate', 'high', 'extreme'] as const

export type DangerLevel = (typeof DANGER_LEVELS)[number]

export interface AnomalyCategoryProfile {
  category: AnomalyCategory
  effectHints: string[]
  defaultDanger: DangerLevel
  containmentLikelihood: 'likely' | 'possible' | 'unlikely'
}

export const ANOMALY_CATEGORY_PROFILES: Record<AnomalyCategory, AnomalyCategoryProfile> = {
  gravitational: {
    category: 'gravitational',
    effectHints: ['tractor eddies', 'spaghettification zones', 'lensing mirages', 'orbits decaying without cause'],
    defaultDanger: 'high',
    containmentLikelihood: 'unlikely',
  },
  temporal: {
    category: 'temporal',
    effectHints: ['time dilation pockets', 'echoes of future signals', 'looping hours', 'flash-forward visions'],
    defaultDanger: 'extreme',
    containmentLikelihood: 'unlikely',
  },
  energy: {
    category: 'energy',
    effectHints: ['rogue plasma arcs', 'power drains at range', 'aurora storms', 'charging hulls to lethal voltage'],
    defaultDanger: 'high',
    containmentLikelihood: 'possible',
  },
  spatial: {
    category: 'spatial',
    effectHints: ['folded space shortcuts', 'non-euclidean vistas', 'distances that lie', 'rooms bigger inside'],
    defaultDanger: 'moderate',
    containmentLikelihood: 'possible',
  },
  quantum: {
    category: 'quantum',
    effectHints: ['superposed wrecks', 'observer-dependent terrain', 'entangled twin signals', 'probabilistic gravity'],
    defaultDanger: 'moderate',
    containmentLikelihood: 'possible',
  },
  biological: {
    category: 'biological',
    effectHints: ['self-spreading coral spores', 'hive-mind fungal networks', 'dormant seed vaults waking', 'plagues that mutate ships'],
    defaultDanger: 'high',
    containmentLikelihood: 'likely',
  },
}
