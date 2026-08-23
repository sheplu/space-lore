import type { ContentReport } from './validate.ts'

export function renderReport(report: ContentReport): string {
  const lines: string[] = []
  for (const file of report.files) {
    const status = file.ok ? 'ok  ' : 'FAIL'
    lines.push(`${status} ${file.file}${file.kind ? ` [${file.kind}]` : ''}`)
    for (const issue of file.issues) {
      lines.push(`     - ${issue.message}`)
    }
  }
  const failed = report.files.filter((f) => !f.ok).length
  lines.push('')
  lines.push(`${report.files.length - failed}/${report.files.length} files valid`)
  return lines.join('\n')
}
