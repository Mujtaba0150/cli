import { Args } from '@oclif/core'
import { BeeperCommand } from '../../lib/command.js'
import { resolveTarget } from '../../lib/targets.js'
import { printData } from '../../lib/output.js'

export default class TargetInfo extends BeeperCommand {
  static override summary = 'Show Beeper target details'
  static override args = {
    target: Args.string({ required: false }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(TargetInfo)
    const target = await resolveTarget({ target: args.target ?? flags.target, baseURL: flags['base-url'] })
    await printData({ ...target, auth: target.auth ? { ...target.auth, accessToken: 'stored' } : undefined }, flags.json ? 'json' : 'human')
  }
}
