import { Args, Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../lib/command.js'
import { createServerTarget, launchServerTarget, readTarget, updateConfig } from '../../lib/targets.js'
import { printSuccess } from '../../lib/output.js'

export default class ServerNew extends BeeperCommand {
  static override summary = 'Create a local Beeper Server target'
  static override args = {
    name: Args.string({ required: false, default: 'local-server' }),
  }
  static override flags = {
    'server-env': Flags.string({ default: 'production' }),
    port: Flags.integer(),
    default: Flags.boolean({ default: false, description: 'Make this the default target' }),
    launch: Flags.boolean({ default: true, allowNo: true, description: 'Launch the server after creating it' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ServerNew)
    ensureWritable(flags)
    if (await readTarget(args.name)) throw new Error(`Target "${args.name}" already exists.`)
    const target = await createServerTarget(args.name, { serverEnv: flags['server-env'], port: flags.port })
    if (flags.default) await updateConfig(config => ({ ...config, defaultTarget: target.id }))
    if (flags.launch) await launchServerTarget(target)
    await printSuccess({ message: `${flags.launch ? 'Created and launched' : 'Created'} Server target: ${target.id}`, detail: target.dataDir, data: target }, flags.json ? 'json' : 'human')
  }
}
