#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {cp, mkdir, mkdtemp, readFile, rm, stat, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {basename, join, resolve} from 'node:path';
import {spawn} from 'node:child_process';

const root = resolve(new URL('..', import.meta.url).pathname);
const packageJsonPath = join(root, 'package.json');
const packageLockPath = join(root, 'package-lock.json');
const distPath = join(root, 'dist');
const outDir = join(root, 'dist', 'release');

const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8'));
const packageName = 'beeper-desktop-cli';
const commandName = 'beeper';
const version = process.env.PACKAGE_VERSION || pkg.version;
const archiveName = `${packageName}_${version}_any.tar.gz`;
const archivePath = join(outDir, archiveName);
const metadataPath = join(outDir, 'homebrew.json');
const workDir = await mkdtemp(join(tmpdir(), 'desktop-api-cli-homebrew-'));

await ensureBuilt();
await mkdir(join(workDir, 'bin'), {recursive: true});
await mkdir(join(workDir, 'libexec'), {recursive: true});
await mkdir(outDir, {recursive: true});

await cp(packageJsonPath, join(workDir, 'libexec', 'package.json'));
await cp(packageLockPath, join(workDir, 'libexec', 'package-lock.json'));
await cp(join(root, 'bin'), join(workDir, 'libexec', 'bin'), {recursive: true});
await cp(distPath, join(workDir, 'libexec', 'dist'), {
  recursive: true,
  filter: source => !source.startsWith(outDir),
});
await writeFile(
  join(workDir, 'bin', commandName),
  `#!/bin/sh
set -e
prefix="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
exec node "$prefix/libexec/bin/run.js" "$@"
`,
  {mode: 0o755},
);

await run('npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], {
  cwd: join(workDir, 'libexec'),
});
await rm(archivePath, {force: true});
await run('tar', ['-czf', archivePath, '-C', workDir, '.'], {cwd: root});

const sha256 = await hashFile(archivePath);
await writeFile(
  metadataPath,
  `${JSON.stringify(
    {
      archive: basename(archivePath),
      command: commandName,
      package: packageName,
      path: archivePath,
      sha256,
      version,
    },
    null,
    2,
  )}\n`,
);

console.log(`${archivePath}`);
console.log(`sha256 ${sha256}`);
await rm(workDir, {recursive: true, force: true});

async function ensureBuilt() {
  if (!existsSync(distPath)) {
    throw new Error('dist/ does not exist. Run npm run build before packaging.');
  }

  const distStats = await stat(distPath);
  if (!distStats.isDirectory()) {
    throw new Error('dist/ exists but is not a directory.');
  }

  if (!existsSync(join(distPath, 'commands'))) {
    throw new Error('dist/commands does not exist. Run npm run build before packaging.');
  }
}

async function hashFile(path) {
  const hash = createHash('sha256');
  hash.update(await readFile(path));
  return hash.digest('hex');
}

async function run(command, args, options = {}) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || root,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}
