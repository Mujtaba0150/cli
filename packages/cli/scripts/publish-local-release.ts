#!/usr/bin/env bun
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const binaries = JSON.parse(await readFile(join(root, 'dist', 'bin', 'binaries.json'), 'utf8'))
const version = process.env.PACKAGE_VERSION || pkg.version
const tag = process.env.GITHUB_REF_NAME || process.env.TAG || `v${version}`
const repo = process.env.GITHUB_REPOSITORY || 'beeper/cli'

await run('gh', ['auth', 'status'])
await run('npm', ['whoami'])
if (!Array.isArray(binaries.artifacts) || binaries.artifacts.length === 0) {
  throw new Error('Refusing to publish npm package without binary artifacts.')
}
for (const platform of ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64']) {
  if (!binaries.artifacts.some(artifact => artifact.platform === platform)) {
    throw new Error(`Refusing to publish without ${platform} binary artifact.`)
  }
}
await ensureRelease(tag, repo)
await run('gh', [
  'release',
  'upload',
  tag,
  'dist/bin/beeper-darwin-arm64',
  'dist/bin/beeper-darwin-x64',
  'dist/bin/beeper-linux-arm64',
  'dist/bin/beeper-linux-x64',
  'dist/bin/binaries.json',
  ...await releaseArchives(),
  '--repo',
  repo,
  '--clobber',
])

await run('npm', ['publish', '--access', 'public'], { cwd: fileURLToPath(new URL('../../npm/', import.meta.url)) })
await run('bun', ['scripts/publish-homebrew-formula.ts'])

async function ensureRelease(tag, repo) {
  const view = await output('gh', ['release', 'view', tag, '--repo', repo], { allowFailure: true })
  if (view.code === 0) return
  await run('gh', ['release', 'create', tag, '--repo', repo, '--title', tag, '--generate-notes'])
}

async function releaseArchives() {
  const metadata = JSON.parse(await readFile(join(root, 'dist', 'release', 'homebrew.json'), 'utf8'))
  return [
    ...metadata.archives.map(archive => join('dist', 'release', archive.archive)),
    'dist/release/homebrew.json',
  ]
}

async function run(command, args, options = {}) {
  const result = await output(command, args, options)
  if (result.code !== 0) throw new Error(`${command} ${args.join(' ')} exited with ${result.code}`)
}

async function output(command, args, options = {}) {
  const child = Bun.spawn([command, ...args], {
    cwd: options.cwd || root,
    env: process.env,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  })
  return { code: await child.exited }
}
