import { z } from 'zod'
import {
  CLUSTER_TYPES,
  type ClusterType,
  getClusterProfile,
  type ClusterTypeProfile,
} from '../taxonomy/cluster-types.ts'
import { loreFieldsSchema, clusterIdSchema, galaxyIdSchema, starSystemIdSchema } from './common.ts'

type ClusterRange = { min: number; max: number }

export const clusterSchema = z
  .object({
    ...loreFieldsSchema.shape,
    id: clusterIdSchema,
    galaxyId: galaxyIdSchema,
    type: z.enum(CLUSTER_TYPES),
    coordinates: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    }),
    ageGyr: z.number().positive(),
    massSol: z.number().positive(),
    coreRadiusLy: z.number().positive(),
    tidalRadiusLy: z.number().positive(),
    metallicityFeH: z.number().min(-3).max(1),
    concentration: z.number().positive(),
    velocityDispersionKms: z.number().nonnegative(),
    stellarDensityCore: z.number().positive(),
    stellarDensityHalfMass: z.number().positive(),
    memberSystemIds: z.array(starSystemIdSchema).default([]),
    traits: z.array(z.string()).max(15).default([]),
    observedEffects: z.array(z.string()).max(10).default([]),
  })
  .superRefine((cluster, ctx) => {
    const profile = getClusterProfile(cluster.type)
    const checks: Array<[field: string, value: number, range: ClusterRange]> = [
      ['ageGyr', cluster.ageGyr, profile.ageGyr],
      ['massSol', cluster.massSol, profile.massSol],
      ['coreRadiusLy', cluster.coreRadiusLy, profile.coreRadiusLy],
      ['tidalRadiusLy', cluster.tidalRadiusLy, profile.tidalRadiusLy],
      ['metallicityFeH', cluster.metallicityFeH, profile.metallicityFeH],
      ['concentration', cluster.concentration, profile.concentration],
      ['velocityDispersionKms', cluster.velocityDispersionKms, profile.velocityDispersionKms],
      ['stellarDensityCore', cluster.stellarDensityCore, profile.stellarDensityCore],
      ['stellarDensityHalfMass', cluster.stellarDensityHalfMass, profile.stellarDensityHalfMass],
    ]
    for (const [field, value, range] of checks) {
      if (value < range.min || value > range.max) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: `${field}=${value} outside ${cluster.type} cluster range [${range.min}, ${range.max}]`,
        })
      }
    }
    if (cluster.coreRadiusLy >= cluster.tidalRadiusLy) {
      ctx.addIssue({
        code: 'custom',
        path: ['coreRadiusLy'],
        message: 'coreRadiusLy must be less than tidalRadiusLy',
      })
    }
    const traitMatch = cluster.traits.some((t) => profile.traits.includes(t))
    if (!traitMatch && cluster.traits.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['traits'],
        message: `traits should include at least one from ${cluster.type} profile: ${profile.traits.join(', ')}`,
      })
    }
  })

export type Cluster = z.infer<typeof clusterSchema>