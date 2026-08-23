import { ANOMALY_CATEGORY_PROFILES } from '../taxonomy/anomaly-categories.ts'
import { LIFE_LEVELS, PLANET_TYPE_PROFILES, lifeRank } from '../taxonomy/planet-types.ts'
import { STAR_CLASSES, STAR_CLASS_PROFILES } from '../taxonomy/star-classes.ts'
import { STYLE_GUIDE } from '../style/guide.ts'

export interface ConstraintBundle {
  $schemaHint: string
  starClasses: Array<(typeof STAR_CLASS_PROFILES)[keyof typeof STAR_CLASS_PROFILES]>
  planetTypes: Array<(typeof PLANET_TYPE_PROFILES)[keyof typeof PLANET_TYPE_PROFILES]>
  lifeLevels: Array<{ level: (typeof LIFE_LEVELS)[number]; rank: number }>
  anomalyCategories: Array<(typeof ANOMALY_CATEGORY_PROFILES)[keyof typeof ANOMALY_CATEGORY_PROFILES]>
  styleGuide: typeof STYLE_GUIDE
}

export function buildConstraintBundle(): ConstraintBundle {
  return {
    $schemaHint:
      'constraint bundle consumed by generation skills; regenerate via npm run export:taxonomy',
    starClasses: STAR_CLASSES.map((c) => STAR_CLASS_PROFILES[c]),
    planetTypes: Object.values(PLANET_TYPE_PROFILES),
    lifeLevels: LIFE_LEVELS.map((level) => ({ level, rank: lifeRank(level) })),
    anomalyCategories: Object.values(ANOMALY_CATEGORY_PROFILES),
    styleGuide: STYLE_GUIDE,
  }
}
