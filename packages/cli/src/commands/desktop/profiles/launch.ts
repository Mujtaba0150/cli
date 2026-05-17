import { Args } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../../lib/command.js'
import { launchDesktopProfile, resolveTarget } from '../../../lib/targets.js'
import { printSuccess } from '../../../lib/output.js'

export default class DesktopProfilesLaunch extends BeeperCommand {
  static override summary = 'Launch a Beeper Desktop profile'
  static override args = {
    profile: Args.string({ required: true }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(DesktopProfilesLaunch)
    ensureWritable(flags)
    const target = await resolveTarget({ target: args.profile })
    await launchDesktopProfile(target)
    await printSuccess({ message: `Launching Desktop profile: ${target.id}`, detail: target.baseURL, data: target }, flags.json ? 'json' : 'human')
  }
}
