import { ANOMALY_CATEGORY_PROFILES } from '../taxonomy/anomaly-categories.ts'
import { LIFE_LEVELS, PLANET_TYPE_PROFILES, lifeRank } from '../taxonomy/planet-types.ts'
import { MOON_TYPES, MOON_TYPE_PROFILES } from '../taxonomy/moon-types.ts'
import { ASTEROID_TYPES, ASTEROID_TYPE_PROFILES } from '../taxonomy/asteroid-types.ts'
import { BELT_TYPES, BELT_TYPE_PROFILES } from '../taxonomy/belt-types.ts'
import { DWARF_PLANET_TYPES, DWARF_PLANET_TYPE_PROFILES } from '../taxonomy/dwarf-planet-types.ts'
import { COMET_TYPES, COMET_TYPE_PROFILES } from '../taxonomy/comet-types.ts'
import { NEBULA_TYPES, NEBULA_TYPE_PROFILES } from '../taxonomy/nebula-types.ts'
import { STAR_CLASSES, STAR_CLASS_PROFILES, STAR_TYPES, STAR_TYPE_PROFILES } from '../taxonomy/star-classes.ts'
import { STYLE_GUIDE } from '../style/guide.ts'

export interface ConstraintBundle {
  $schemaHint: string
  starClasses: Array<(typeof STAR_CLASS_PROFILES)[keyof typeof STAR_CLASS_PROFILES]>
  starTypes: Array<(typeof STAR_TYPE_PROFILES)[keyof typeof STAR_TYPE_PROFILES]>
  planetTypes: Array<(typeof PLANET_TYPE_PROFILES)[keyof typeof PLANET_TYPE_PROFILES]>
  moonTypes: Array<(typeof MOON_TYPE_PROFILES)[keyof typeof MOON_TYPE_PROFILES]>
  asteroidTypes: Array<(typeof ASTEROID_TYPE_PROFILES)[keyof typeof ASTEROID_TYPE_PROFILES]>
  beltTypes: Array<(typeof BELT_TYPE_PROFILES)[keyof typeof BELT_TYPE_PROFILES]>
  dwarfPlanetTypes: Array<(typeof DWARF_PLANET_TYPE_PROFILES)[keyof typeof DWARF_PLANET_TYPE_PROFILES]>
  cometTypes: Array<(typeof COMET_TYPE_PROFILES)[keyof typeof COMET_TYPE_PROFILES]>
  nebulaTypes: Array<(typeof NEBULA_TYPE_PROFILES)[keyof typeof NEBULA_TYPE_PROFILES]>
  lifeLevels: Array<{ level: (typeof LIFE_LEVELS)[number]; rank: number }>
  anomalyCategories: Array<(typeof ANOMALY_CATEGORY_PROFILES)[keyof typeof ANOMALY_CATEGORY_PROFILES]>
  styleGuide: typeof STYLE_GUIDE
}

export function buildConstraintBundle(): ConstraintBundle {
  return {
    $schemaHint:
      'constraint bundle consumed by generation skills; regenerate via npm run export:taxonomy',
    starClasses: STAR_CLASSES.map((c) => STAR_CLASS_PROFILES[c]),
    starTypes: STAR_TYPES.map((t) => STAR_TYPE_PROFILES[t]),
    planetTypes: Object.values(PLANET_TYPE_PROFILES),
    moonTypes: Object.values(MOON_TYPE_PROFILES),
    asteroidTypes: Object.values(ASTEROID_TYPE_PROFILES),
    beltTypes: Object.values(BELT_TYPE_PROFILES),
    dwarfPlanetTypes: Object.values(DWARF_PLANET_TYPE_PROFILES),
    cometTypes: Object.values(COMET_TYPE_PROFILES),
    nebulaTypes: Object.values(NEBULA_TYPE_PROFILES),
    lifeLevels: LIFE_LEVELS.map((level) => ({ level, rank: lifeRank(level) })),
    anomalyCategories: Object.values(ANOMALY_CATEGORY_PROFILES),
    styleGuide: STYLE_GUIDE,
  }
}
