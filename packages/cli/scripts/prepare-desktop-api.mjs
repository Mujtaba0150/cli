#!/usr/bin/env bun
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const sdkRoot = join(root, 'node_modules', '@beeper', 'desktop-api')
const sdkPackageJson = join(sdkRoot, 'package.json')
const distIndex = join(sdkRoot, 'dist', 'index.d.ts')
const distPackageJson = join(sdkRoot, 'dist', 'package.json')
const shimPath = join(sdkRoot, 'src', 'internal', 'shims.ts')

if (!existsSync(sdkRoot)) {
  throw new Error('@beeper/desktop-api is not installed. Run bun install from the repository root.')
}

if (!existsSync(distIndex)) {
  await run('bun', ['install'], { cwd: sdkRoot })
  await patchReadableStreamShim()
  await run('bun', ['run', 'build'], { cwd: sdkRoot })
}

await patchDistPackageJson()
await patchRootPackageJson()

async function patchReadableStreamShim() {
  const source = await readFile(shimPath, 'utf8')
  const patched = source.replace(/\n    start\(\) \{\},/, '')
  if (source !== patched) await writeFile(shimPath, patched)
}

async function patchDistPackageJson() {
  if (!existsSync(distPackageJson)) return
  const source = await readFile(distPackageJson, 'utf8')
  const pkg = JSON.parse(source)
  if (pkg.exports?.['.']?.import) pkg.exports['.'].import = './index.js'
  if (pkg.exports?.['./*']?.import) pkg.exports['./*'].import = './*.js'
  await writeFile(distPackageJson, `${JSON.stringify(pkg, null, 2)}\n`)
}

async function patchRootPackageJson() {
  const source = await readFile(sdkPackageJson, 'utf8')
  const pkg = JSON.parse(source)
  if (pkg.exports?.['.']?.import) pkg.exports['.'].import = './dist/index.js'
  if (pkg.exports?.['./*']?.import) pkg.exports['./*'].import = './dist/*.js'
  await writeFile(sdkPackageJson, `${JSON.stringify(pkg, null, 2)}\n`)
}

async function run(command, args, options = {}) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || root,
      env: process.env,
      stdio: 'inherit',
    })

    child.on('error', reject)
    child.on('exit', code => {
      if (code === 0) {
        resolvePromise()
        return
      }

      reject(new Error(`${command} ${args.join(' ')} exited with ${code}`))
    })
  })
}
