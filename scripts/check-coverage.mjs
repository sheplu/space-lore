#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const THRESHOLD = 80
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const lcovPath = join(repoRoot, 'coverage', 'lcov.info')

if (!existsSync(lcovPath)) {
  console.error(`coverage/lcov.info not found — run the suite with the lcov reporter first`)
  process.exit(1)
}

const records = readFileSync(lcovPath, 'utf8').split('end_of_record')
let hit = 0
let total = 0
const perFile = []

for (const record of records) {
  const file = /^SF:(.+)$/m.exec(record)?.[1]
  const lf = /^LF:(\d+)$/m.exec(record)?.[1]
  const lh = /^LH:(\d+)$/m.exec(record)?.[1]
  if (!file || lf === undefined || lh === undefined) continue
  if (file.includes(`${join('tests', '')}`) || /\/tests\//.test(file)) continue
  const linesTotal = Number(lf)
  const linesHit = Number(lh)
  total += linesTotal
  hit += linesHit
  perFile.push({ file: file.replace(repoRoot + '/', ''), pct: linesTotal ? (linesHit / linesTotal) * 100 : 100 })
}

if (total === 0) {
  console.error('no coverage data found for source files')
  process.exit(1)
}

const pct = (hit / total) * 100
console.log('\nLine coverage (src only):')
for (const { file, pct: p } of perFile.sort((a, b) => a.pct - b.pct)) {
  console.log(`  ${p.toFixed(1).padStart(6)}%  ${file}`)
}
console.log(`\nOverall: ${pct.toFixed(2)}% (${hit}/${total} lines) — required ≥ ${THRESHOLD}%`)

process.exit(pct >= THRESHOLD ? 0 : 1)
