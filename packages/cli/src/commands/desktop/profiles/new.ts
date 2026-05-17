import { Args, Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../../lib/command.js'
import { createDesktopProfile, readTarget, updateConfig } from '../../../lib/targets.js'
import { printSuccess } from '../../../lib/output.js'

export default class DesktopProfilesNew extends BeeperCommand {
  static override summary = 'Create a Beeper Desktop profile'
  static override args = {
    name: Args.string({ required: true }),
  }
  static override flags = {
    'server-env': Flags.string({ default: 'production' }),
    port: Flags.integer(),
    default: Flags.boolean({ default: false, description: 'Make this the default target' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(DesktopProfilesNew)
    ensureWritable(flags)
    if (await readTarget(args.name)) throw new Error(`Target "${args.name}" already exists.`)
    const target = await createDesktopProfile(args.name, { serverEnv: flags['server-env'], port: flags.port })
    if (flags.default) await updateConfig(config => ({ ...config, defaultTarget: target.id }))
    await printSuccess({ message: `Created Desktop profile: ${target.id}`, detail: target.dataDir, data: target }, flags.json ? 'json' : 'human')
  }
}
