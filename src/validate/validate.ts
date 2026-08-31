import { readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { z } from 'zod'
import { CONTENT_SCHEMAS, type ContentKind } from './registry.ts'
import { anomalySchema, galaxySchema, starSystemSchema, planetSchema, moonSchema, asteroidSchema, beltSchema, dwarfPlanetSchema, cometSchema, nebulaSchema } from '../schemas/index.ts'

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

function isSystemJson(fileName: string): boolean {
  return fileName.endsWith('.json') && /^sys-[0-9a-f]{8}\.json$/.test(fileName)
}

function isBodyJson(fileName: string): boolean {
  return fileName.endsWith('.json') && /^(plnt|ast|belt|moon|dwpl|com)-[0-9a-f]{8}\.json$/.test(fileName)
}

function isQuadrantSystemsJson(fileName: string): boolean {
  return fileName === 'systems.json'
}

function isNebulaJson(fileName: string): boolean {
  return fileName.endsWith('.json') && /^neb-[0-9a-f]{8}\.json$/.test(fileName)
}

export function detectKind(filePath: string): ContentKind | null {
  const base = basename(filePath)
  if (base === 'galaxy.json') return 'galaxy'
  if (isSystemJson(base)) return 'starSystem'
  if (isBodyJson(base)) {
    if (base.startsWith('plnt-')) return 'planet'
    if (base.startsWith('moon-')) return 'moon'
    if (base.startsWith('ast-')) return 'asteroid'
    if (base.startsWith('belt-')) return 'belt'
    if (base.startsWith('dwpl-')) return 'dwarfPlanet'
    if (base.startsWith('com-')) return 'comet'
    return 'planet'
  }
  if (base === 'systems.json') return 'starSystemQuadrantMapping' as ContentKind
  if (filePath.includes('/anomalies/') && base.endsWith('.json')) return 'anomaly'
  if (filePath.includes('/nebulae/') && isNebulaJson(base)) return 'nebula'
  // Check for body files in /bodies/ subfolders (e.g., systems/<id>/bodies/<plnt-id>.json)
  if (filePath.includes('/bodies/') && isBodyJson(base)) {
    if (base.startsWith('plnt-')) return 'planet'
    if (base.startsWith('moon-')) return 'moon'
    if (base.startsWith('ast-')) return 'asteroid'
    if (base.startsWith('belt-')) return 'belt'
    if (base.startsWith('dwpl-')) return 'dwarfPlanet'
    if (base.startsWith('com-')) return 'comet'
    return 'planet'
  }
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
    if (kind === 'starSystemQuadrantMapping') {
      // Special handling for quadrant systems.json
      try {
        const content = JSON.parse(readFileSync(filePath, 'utf8'))
        if (typeof content !== 'object' || content === null || Array.isArray(content)) {
          return {
            file: relFile,
            kind,
            ok: false,
            issues: [{ file: relFile, message: 'quadrant systems.json must be a JSON object mapping systemId to systemName' }],
          }
        }
        const keys = Object.keys(content as Record<string, string>)
        for (const key of keys) {
          if (!/^sys-[0-9a-f]{8}$/.test(key)) {
            return {
              file: relFile,
              kind,
              ok: false,
              issues: [{ file: relFile, message: `invalid system id format: ${key}` }],
            }
          }
        }
        return { file: relFile, kind, ok: true, issues: [] }
      } catch {
        return {
          file: relFile,
          kind,
          ok: false,
          issues: [{ file: relFile, message: 'invalid JSON in quadrant systems.json' }],
        }
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

  // Build maps of systems from quadrant mappings and individual system files
  const quadrantSystemsMaps = new Map<string, { [sysId: string]: string }>() // quadrantId -> systemId->name
  const allSystems = new Map<string, z.infer<typeof starSystemSchema>>() // systemId -> system data

  // First pass: collect quadrant mappings and system files
  for (const [path, value] of rawByPath.entries()) {
    const result = byPath.get(path)
    if (!result?.ok) continue

    if (result.kind === 'starSystemQuadrantMapping') {
      const qPath = dirname(path)
      const qName = basename(qPath)
      const mapping: { [sysId: string]: string } = value as Record<string, string>
      quadrantSystemsMaps.set(qName, mapping)
      for (const [sysId, sysName] of Object.entries(mapping)) {
        allSystems.set(sysId, { ...mapping, name: sysName } as any)
      }
    }

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
      allSystems.set(system.id, system)
    }
  }

  // Second pass: process anomalies with quadrant-aware system lookup
  for (const [path, value] of rawByPath.entries()) {
    const result = byPath.get(path)
    if (!result?.ok) continue

    if (result.kind === 'anomaly') {
      const anomaly = value as z.infer<typeof anomalySchema>
      const loc = anomaly.location
      if (loc.scope === 'system') {
        // Check system exists in quadrant mappings or as individual system file
        let exists = [...rawByPath.values()].some(
          (v: any) => (v as { id?: unknown }).id !== undefined && (v as { id: string }).id === loc.systemId,
        )
        // Also check quadrant mappings
        if (!exists) {
          for (const [qName, mapping] of quadrantSystemsMaps.entries()) {
            if (mapping[loc.systemId]) {
              exists = true
              break
            }
          }
        }
        if (!exists) {
          result.ok = false
          result.issues.push({ file: path, message: `location.systemId '${loc.systemId}' not found in content` })
        }
      }
      if (loc.scope === 'planet') {
        // Check planet exists in any system's planetNameMapping or as body file
        let exists = [...rawByPath.values()].some(
          (v: any) => {
            if ((v as { id?: unknown }).id === loc.planetId) return true
            if ((v as { planetNameMapping?: Record<string, string> })?.planetNameMapping?.[loc.planetId]) return true
            return false
          },
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