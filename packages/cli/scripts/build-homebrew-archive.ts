#!/usr/bin/env bun
import { createHash } from 'node:crypto'
import { chmod, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const version = process.env.PACKAGE_VERSION || pkg.version
const binaryDir = join(root, 'dist', 'bin')
const outDir = join(root, 'dist', 'release')
const manifestPath = join(binaryDir, 'binaries.json')
const metadataPath = join(outDir, 'homebrew.json')

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const archives = []
for (const artifact of manifest.artifacts) {
  const platform = artifact.platform
  const binaryPath = artifact.path || join(binaryDir, artifact.binaryFile || `beeper-${platform}`)
  const workDir = await mkdtemp(join(tmpdir(), `beeper-cli-${platform}-`))
  const archiveName = releaseArchiveName(version, platform)
  const archivePath = join(outDir, archiveName)

  await mkdir(join(workDir, 'bin'), { recursive: true })
  const installedBinary = join(workDir, 'bin', 'beeper')
  await cp(binaryPath, installedBinary)
  await chmod(installedBinary, 0o755)
  await rm(archivePath, { force: true })
  const binarySha256 = await hashFile(binaryPath)
  if (platform.startsWith('darwin-')) {
    await run('/usr/bin/zip', ['-X', '-r', archivePath, 'bin'], { cwd: workDir })
  } else {
    await run('tar', ['-czf', archivePath, '-C', workDir, '.'], { cwd: root })
  }
  const sha256 = await hashFile(archivePath)
  archives.push({ archive: basename(archivePath), path: archivePath, platform, sha256 })
  artifact.binaryFile = artifact.binaryFile || artifact.file
  artifact.binarySha256 = binarySha256
  artifact.file = basename(archivePath)
  artifact.sha256 = sha256
  artifact.archive = basename(archivePath)
  console.log(`${archivePath}`)
  console.log(`sha256 ${sha256}`)
  await rm(workDir, { recursive: true, force: true })
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
await writeFile(
  metadataPath,
  `${JSON.stringify(
    {
      archives,
      command: 'beeper',
      displayName: 'Beeper CLI',
      package: 'beeper-cli',
      version,
    },
    null,
    2,
  )}\n`,
)

function releaseArchiveName(version, platform) {
  const [os, arch] = platform.split('-')
  const displayOS = os === 'darwin' ? 'macos' : os
  const extension = os === 'darwin' ? 'zip' : 'tar.gz'
  return `beeper-cli-${version}-${displayOS}-${arch}.${extension}`
}

async function hashFile(path) {
  const hash = createHash('sha256')
  hash.update(await readFile(path))
  return hash.digest('hex')
}

async function run(command, args, options = {}) {
  const child = Bun.spawn([command, ...args], {
    cwd: options.cwd || root,
    env: process.env,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const code = await child.exited
  if (code !== 0) throw new Error(`${command} ${args.join(' ')} exited with ${code}`)
}
