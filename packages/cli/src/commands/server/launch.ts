import { Args } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../lib/command.js'
import { launchServerTarget, resolveTarget } from '../../lib/targets.js'
import { printSuccess } from '../../lib/output.js'

export default class ServerLaunch extends BeeperCommand {
  static override summary = 'Launch a local Beeper Server target'
  static override args = {
    target: Args.string({ required: false }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ServerLaunch)
    ensureWritable(flags)
    const target = await resolveTarget({ target: args.target ?? flags.target, baseURL: flags['base-url'] })
    await launchServerTarget(target)
    await printSuccess({ message: `Launching Server target: ${target.id}`, detail: target.baseURL, data: target }, flags.json ? 'json' : 'human')
  }
}
