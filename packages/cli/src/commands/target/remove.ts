import { Args } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../lib/command.js'
import { removeTarget } from '../../lib/targets.js'
import { printSuccess } from '../../lib/output.js'

export default class TargetRemove extends BeeperCommand {
  static override summary = 'Remove a Beeper target'
  static override args = {
    target: Args.string({ required: true }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(TargetRemove)
    ensureWritable(flags)
    if (args.target === 'desktop') throw new Error('Cannot remove the default Beeper Desktop target.')
    await removeTarget(args.target)
    await printSuccess({ message: `Removed target: ${args.target}` }, flags.json ? 'json' : 'human')
  }
}
