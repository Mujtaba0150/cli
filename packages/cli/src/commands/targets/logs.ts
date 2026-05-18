import { Args } from '@oclif/core'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { BeeperCommand } from '../../lib/command.js'
import { customTargetID, readTarget, resolveTarget } from '../../lib/targets.js'
import { desktopLogDir, profileErrorLogPath, profileLogPath } from '../../lib/profiles.js'

export default class TargetsLogs extends BeeperCommand {
  static override summary = 'Print logs for a local Beeper Desktop or Server install'
  static override args = { name: Args.string({ required: false, description: 'Target name. Defaults to the selected target.' }) }
  async run(): Promise<void> {
    const { args, flags } = await this.parse(TargetsLogs)
    const target = args.name ? await readTarget(args.name) : await resolveTarget({ target: flags.target, baseURL: flags['base-url'] })
    if (!target) throw new Error(`Unknown Beeper target "${args.name}".`)
    if (target.type === 'remote' || target.id === customTargetID) throw new Error(`Target "${target.id}" is remote and has no local logs.`)
    if (target.type === 'server') {
      if (!target.managed) throw new Error(`Target "${target.id}" is not a local Beeper Server install.`)
      process.stdout.write(await readFile(profileLogPath(target.id), 'utf8').catch(() => ''))
      process.stdout.write(await readFile(profileErrorLogPath(target.id), 'utf8').catch(() => ''))
      return
    }
    const files = await listLogFiles(desktopLogDir(target.managed ? target : undefined))
    for (const file of files) {
      process.stdout.write(`\n==> ${file} <==\n`)
      process.stdout.write(await readFile(file, 'utf8').catch(() => ''))
    }
  }
}

async function listLogFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const files = await Promise.all(entries.map(async entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return listLogFiles(path)
    if (entry.isFile() && entry.name.endsWith('.log')) return [path]
    return []
  }))
  return files.flat().sort()
}
