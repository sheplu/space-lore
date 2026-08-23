import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { validateContentDir, validateJsonFile, type ContentReport } from '../validate/validate.ts'
import { renderReport } from '../validate/report.ts'

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: { file: { type: 'string' }, all: { type: 'boolean' } },
})

function targetReport(): ContentReport {
  if (values.file) {
    const path = resolve(values.file)
    try {
      statSync(path)
    } catch {
      throw new Error(`file not found: ${path}`)
    }
    const result = validateJsonFile(path)
    return { files: [result], ok: result.ok }
  }
  const contentRoot = resolve('content')
  try {
    statSync(contentRoot)
  } catch {
    throw new Error(`content directory not found: ${contentRoot}\nnothing to validate yet.`)
  }
  return validateContentDir(contentRoot)
}

try {
  const report = targetReport()
  console.log(renderReport(report))
  process.exit(report.ok ? 0 : 1)
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
}
