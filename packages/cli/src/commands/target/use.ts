import { Args } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../lib/command.js'
import { readTarget, updateConfig } from '../../lib/targets.js'
import { printSuccess } from '../../lib/output.js'

export default class TargetUse extends BeeperCommand {
  static override summary = 'Set the default Beeper target'
  static override args = {
    target: Args.string({ required: true }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(TargetUse)
    ensureWritable(flags)
    if (args.target !== 'desktop' && !await readTarget(args.target)) throw new Error(`Unknown Beeper target "${args.target}".`)
    await updateConfig(config => ({ ...config, defaultTarget: args.target }))
    await printSuccess({ message: `Default target: ${args.target}` }, flags.json ? 'json' : 'human')
  }
}
