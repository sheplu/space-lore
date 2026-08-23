import { readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { z } from 'zod'
import { CONTENT_SCHEMAS, type ContentKind } from './registry.ts'
import { anomalySchema, galaxySchema, starSystemSchema } from '../schemas/index.ts'

export interface ValidationIssue {
  file: string
  message: string
}

export interface FileValidationResult {
  file: string
  kind: ContentKind | null
  ok: boolean
  issues: ValidationIssue[]
}

export interface ContentReport {
  files: FileValidationResult[]
  ok: boolean
}

export function detectKind(filePath: string): ContentKind | null {
  const base = basename(filePath)
  if (base === 'galaxy.json') return 'galaxy'
  if (filePath.includes(`${join('systems', base)}`) && base.endsWith('.json')) return 'starSystem'
  if (filePath.includes(`${join('anomalies', base)}`) && base.endsWith('.json')) return 'anomaly'
  return null
}

function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
    return `${path}${issue.message}`
  })
}

export function validateJsonFile(filePath: string): FileValidationResult {
  const relFile = filePath
  try {
    const kind = detectKind(filePath)
    if (!kind) {
      return {
        file: relFile,
        kind: null,
        ok: false,
        issues: [{ file: relFile, message: `cannot determine content kind from path '${relFile}'` }],
      }
    }
    const parsed = CONTENT_SCHEMAS[kind].safeParse(JSON.parse(readFileSync(filePath, 'utf8')))
    if (!parsed.success) {
      return {
        file: relFile,
        kind,
        ok: false,
        issues: formatIssues(parsed.error).map((message) => ({ file: relFile, message })),
      }
    }
    return { file: relFile, kind, ok: true, issues: [] }
  } catch (err) {
    return {
      file: relFile,
      kind: detectKind(filePath),
      ok: false,
      issues: [
        { file: relFile, message: err instanceof Error ? err.message : String(err) },
      ],
    }
  }
}

export function listContentFiles(contentRoot: string): string[] {
  const files: string[] = []
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) visit(full)
      else if (entry.endsWith('.json')) files.push(full)
    }
  }
  visit(contentRoot)
  return files.sort()
}

export function validateContentDir(contentRoot: string): ContentReport {
  const results = listContentFiles(contentRoot).map((file) => validateJsonFile(file))
  const byPath = new Map(results.map((r) => [relative(contentRoot, r.file), r]))
  const rawByPath = new Map<string, unknown>()
  for (const file of listContentFiles(contentRoot)) {
    try {
      rawByPath.set(relative(contentRoot, file), JSON.parse(readFileSync(file, 'utf8')))
    } catch {
      /* already reported by schema validation */
    }
  }

  const galaxies = [...rawByPath.entries()].filter(([p]) => byPath.get(p)?.kind === 'galaxy')
  const galaxyIds = new Set(galaxies.map(([, g]) => (g as { id?: string }).id))

  for (const [path, value] of rawByPath) {
    const result = byPath.get(path)
    if (!result?.ok) continue

    if (result.kind === 'starSystem') {
      const system = value as z.infer<typeof starSystemSchema>
      if (!galaxyIds.has(system.galaxyId)) {
        result.ok = false
        result.issues.push({
          file: path,
          message: `references unknown galaxyId '${system.galaxyId}'`,
        })
        continue
      }
      const parent = galaxies.find(([, g]) => (g as { id?: string }).id === system.galaxyId)?.[1] as
        | z.infer<typeof galaxySchema>
        | undefined
      const distance = Math.hypot(system.coordinates.x, system.coordinates.y, system.coordinates.z)
      if (parent && distance > parent.diameterLy / 2) {
        result.ok = false
        result.issues.push({
          file: path,
          message: `coordinates at ${distance.toFixed(1)} ly from galactic center exceed '${parent.name}' radius (${parent.diameterLy / 2} ly)`,
        })
      }
    }

    if (result.kind === 'anomaly') {
      const anomaly = value as z.infer<typeof anomalySchema>
      const loc = anomaly.location
      if (loc.scope === 'system') {
        const exists = [...rawByPath.values()].some(
          (v) => (v as { id?: unknown }).id !== undefined && (v as { id: string }).id === loc.systemId,
        )
        if (!exists) {
          result.ok = false
          result.issues.push({ file: path, message: `location.systemId '${loc.systemId}' not found in content` })
        }
      }
      if (loc.scope === 'planet') {
        const exists = [...rawByPath.values()].some(
          (v) =>
            Array.isArray((v as { planets?: unknown }).planets) &&
            ((v as { planets: Array<{ id: string }> }).planets.some((p) => p.id === loc.planetId)),
        )
        if (!exists) {
          result.ok = false
          result.issues.push({ file: path, message: `location.planetId '${loc.planetId}' not found in any system` })
        }
      }
      if (loc.scope === 'galaxy') {
        const galaxyRel = join(dirname(path), 'galaxy.json')
        const parentGalaxy = rawByPath.get(galaxyRel) as z.infer<typeof galaxySchema> | undefined
        if (parentGalaxy) {
          const distance = Math.hypot(loc.coordinates.x, loc.coordinates.y, loc.coordinates.z)
          if (distance > parentGalaxy.diameterLy / 2) {
            result.ok = false
            result.issues.push({
              file: path,
              message: `galactic coordinates ${distance.toFixed(1)} ly from center exceed '${parentGalaxy.name}' radius`,
            })
          }
        }
      }
    }
  }

  return { files: results, ok: results.every((r) => r.ok) }
}
