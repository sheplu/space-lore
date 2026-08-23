import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConstraintBundle } from './bundle.ts'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const bundle = buildConstraintBundle()
const outPath = join(repoRoot, 'data', 'taxonomy.json')
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8')
console.log(`wrote ${outPath}`)
