import { readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { z } from 'zod'
import { CONTENT_SCHEMAS, type ContentKind } from './registry.ts'
import { anomalySchema, galaxySchema, starSystemSchema, planetSchema, moonSchema, asteroidSchema, beltSchema, dwarfPlanetSchema, cometSchema, nebulaSchema, clusterSchema, snrSchema } from '../schemas/index.ts'

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

function isClusterJson(fileName: string): boolean {
  return fileName.endsWith('.json') && /^clu-[0-9a-f]{8}\.json$/.test(fileName)
}

function isSnrJson(fileName: string): boolean {
  return fileName.endsWith('.json') && /^snr-[0-9a-f]{8}\.json$/.test(fileName)
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
  if (filePath.includes('/clusters/') && isClusterJson(base)) return 'cluster'
  if (filePath.includes('/snr/') && isSnrJson(base)) return 'snr'
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
  const galaxyById = new Map<string, z.infer<typeof galaxySchema>>()
  for (const [, g] of galaxies) {
    const galaxy = g as z.infer<typeof galaxySchema>
    if (typeof galaxy.id === 'string') galaxyById.set(galaxy.id, galaxy)
  }

  // Walk up from a content file to the enclosing galaxy.json (e.g.
  // content/<galaxy>/anomalies/x.json -> content/<galaxy>/galaxy.json).
  // Returns the parsed galaxy when found, otherwise undefined.
  const findParentGalaxy = (relPath: string): z.infer<typeof galaxySchema> | undefined => {
    let dir = dirname(relPath)
    while (dir && dir !== '.') {
      const candidate = rawByPath.get(join(dir, 'galaxy.json')) as
        | z.infer<typeof galaxySchema>
        | undefined
      if (candidate && typeof candidate.id === 'string') return candidate
      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }
    return undefined
  }

  // Build maps of systems from quadrant mappings and individual system files
  const quadrantSystemsMaps = new Map<string, { [sysId: string]: string }>() // quadrantId -> systemId->name
  const allSystems = new Map<string, z.infer<typeof starSystemSchema>>() // systemId -> system data
  const knownSystemIds = new Set<string>() // every system id seen (files + quadrant mappings)
  const systemFileIds = new Set<string>() // system ids backed by a system file
  const knownPlanetIds = new Set<string>() // embedded planets + mappings + standalone planet files

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
        knownSystemIds.add(sysId)
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
      knownSystemIds.add(system.id)
      systemFileIds.add(system.id)
      for (const planet of system.planets ?? []) knownPlanetIds.add(planet.id)
      for (const key of Object.keys(system.planetNameMapping ?? {})) knownPlanetIds.add(key)
    }

    if (result.kind === 'planet') {
      const planet = value as { id?: string }
      if (typeof planet.id === 'string') knownPlanetIds.add(planet.id)
    }
  }

  // Validate: no system appears in more than one quadrant
  const systemQuadrantCount = new Map<string, number>()
  for (const [qName, mapping] of quadrantSystemsMaps.entries()) {
    for (const sysId of Object.keys(mapping)) {
      systemQuadrantCount.set(sysId, (systemQuadrantCount.get(sysId) || 0) + 1)
    }
  }
  for (const [sysId, count] of systemQuadrantCount.entries()) {
    if (count > 1) {
      const quadrants = [...quadrantSystemsMaps.entries()]
        .filter(([, m]) => m[sysId])
        .map(([qName]) => qName)
      for (const [path, value] of rawByPath.entries()) {
        const result = byPath.get(path)
        if (!result?.ok) continue
        if (result.kind === 'starSystemQuadrantMapping') {
          const qPath = dirname(path)
          const qName = basename(qPath)
          if (quadrants.includes(qName)) {
            result.ok = false
            result.issues.push({
              file: path,
              message: `system '${sysId}' appears in multiple quadrants: ${quadrants.join(', ')} — must belong to exactly one quadrant`,
            })
          }
        }
      }
    }
  }

  // Validate: quadrant mappings must reference systems backed by a system file
  for (const [path, value] of rawByPath.entries()) {
    const result = byPath.get(path)
    if (!result?.ok) continue
    if (result.kind === 'starSystemQuadrantMapping') {
      const mapping = value as Record<string, string>
      for (const sysId of Object.keys(mapping)) {
        if (!systemFileIds.has(sysId)) {
          result.ok = false
          result.issues.push({
            file: path,
            message: `references unknown systemId '${sysId}' not found in content`,
          })
        }
      }
    }
  }

  const checkWithinGalaxy = (
    result: FileValidationResult,
    path: string,
    galaxyId: string,
    coordinates: { x: number; y: number; z: number },
    label: string,
  ): void => {
    const parent = galaxyById.get(galaxyId)
    if (!parent) {
      result.ok = false
      result.issues.push({ file: path, message: `${label} references unknown galaxyId '${galaxyId}'` })
      return
    }
    const distance = Math.hypot(coordinates.x, coordinates.y, coordinates.z)
    if (distance > parent.diameterLy / 2) {
      result.ok = false
      result.issues.push({
        file: path,
        message: `${label} coordinates at ${distance.toFixed(1)} ly from galactic center exceed '${parent.name}' radius (${parent.diameterLy / 2} ly)`,
      })
    }
  }

  // Second pass: nebulae, clusters and remnants reference their parent galaxy
  // and the systems they claim to contain
  for (const [path, value] of rawByPath.entries()) {
    const result = byPath.get(path)
    if (!result?.ok) continue

    if (result.kind === 'nebula') {
      const nebula = value as z.infer<typeof nebulaSchema>
      checkWithinGalaxy(result, path, nebula.galaxyId, nebula.coordinates, `nebula '${nebula.id}'`)
      if (!result.ok) continue
      for (const sysId of nebula.containedSystemIds ?? []) {
        if (!systemFileIds.has(sysId)) {
          result.ok = false
          result.issues.push({ file: path, message: `containedSystemId '${sysId}' not found in content` })
        }
      }
    }

    if (result.kind === 'cluster') {
      const cluster = value as z.infer<typeof clusterSchema>
      checkWithinGalaxy(result, path, cluster.galaxyId, cluster.coordinates, `cluster '${cluster.id}'`)
      if (!result.ok) continue
      for (const sysId of cluster.memberSystemIds ?? []) {
        if (!systemFileIds.has(sysId)) {
          result.ok = false
          result.issues.push({ file: path, message: `memberSystemId '${sysId}' not found in content` })
        }
      }
    }

    if (result.kind === 'snr') {
      const snr = value as z.infer<typeof snrSchema>
      checkWithinGalaxy(result, path, snr.galaxyId, snr.coordinates, `snr '${snr.id}'`)
    }

    if (result.kind === 'moon') {
      const moon = value as z.infer<typeof moonSchema>
      if (!knownPlanetIds.has(moon.planetId)) {
        result.ok = false
        result.issues.push({ file: path, message: `planetId '${moon.planetId}' not found in any system` })
      }
    }
  }

  // Third pass: process anomalies with quadrant-aware system lookup
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
        const parentGalaxy = findParentGalaxy(path)
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