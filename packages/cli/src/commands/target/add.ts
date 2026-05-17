import { Args, Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../lib/command.js'
import { readTarget, writeTarget, updateConfig, type Target } from '../../lib/targets.js'
import { printSuccess } from '../../lib/output.js'

export default class TargetAdd extends BeeperCommand {
  static override summary = 'Connect to an existing Beeper client'
  static override args = {
    name: Args.string({ required: true }),
    url: Args.string({ required: true }),
  }
  static override flags = {
    type: Flags.string({ options: ['desktop', 'server'], default: 'desktop' }),
    default: Flags.boolean({ default: false, description: 'Make this the default target' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(TargetAdd)
    ensureWritable(flags)
    if (await readTarget(args.name)) throw new Error(`Target "${args.name}" already exists.`)
    const target: Target = { id: args.name, name: args.name, type: flags.type as Target['type'], baseURL: args.url }
    await writeTarget(target)
    if (flags.default) await updateConfig(config => ({ ...config, defaultTarget: target.id }))
    await printSuccess({ message: `Added target: ${target.id}`, detail: target.baseURL, data: target }, flags.json ? 'json' : 'human')
  }
}
