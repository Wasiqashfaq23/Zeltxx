// Node syntax check for every source file (dependency-free "lint" fallback).
import { execFileSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const isJs = (f) => f.endsWith('.js')
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const full = join(dir, f)
    return statSync(full).isDirectory() ? walk(full) : isJs(f) ? [full] : []
  })

const files = ['index.js', ...walk('src'), ...walk('scripts')]
let failed = 0
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'ignore' })
  } catch {
    console.error(`Syntax error in ${file}`)
    failed++
  }
}
if (failed) {
  console.error(`${failed} file(s) failed syntax check.`)
  process.exit(1)
}
console.log(`Syntax OK (${files.length} files)`)