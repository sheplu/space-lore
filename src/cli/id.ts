import { resolveIdArgs } from './id-lib.ts'

try {
  console.log(resolveIdArgs(process.argv.slice(2)))
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
}
