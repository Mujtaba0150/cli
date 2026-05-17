import { Args, Flags } from '@oclif/core'
import { rm } from 'node:fs/promises'
import { BeeperCommand, ensureWritable } from '../../../lib/command.js'
import { removeTarget, resolveTarget } from '../../../lib/targets.js'
import { printSuccess } from '../../../lib/output.js'

export default class DesktopProfilesDelete extends BeeperCommand {
  static override summary = 'Delete a Beeper Desktop profile'
  static override args = {
    profile: Args.string({ required: true }),
  }
  static override flags = {
    force: Flags.boolean({ default: false, description: 'Delete local profile data. Requires the profile name.' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(DesktopProfilesDelete)
    ensureWritable(flags)
    const target = await resolveTarget({ target: args.profile })
    if (target.id === 'desktop' || !target.dataDir) throw new Error('Cannot delete the default Beeper Desktop profile from the CLI.')
    if (!flags.force) throw new Error(`Refusing to delete "${target.id}". Log out first, then rerun with --force.`)
    await rm(target.dataDir, { recursive: true, force: true })
    await removeTarget(target.id)
    await printSuccess({ message: `Deleted Desktop profile: ${target.id}` }, flags.json ? 'json' : 'human')
  }
}
