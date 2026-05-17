import { Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../lib/command.js'
import { driveVerification, nextAppStep } from '../lib/app-state.js'
import { resolveTarget } from '../lib/targets.js'
import { printData, printSuccess } from '../lib/output.js'

export default class Verify extends BeeperCommand {
  static override summary = 'Verify this Beeper target for encrypted messages'
  static override flags = {
    'user-id': Flags.string({ description: 'User ID to verify. Defaults to the signed-in user.' }),
    yes: Flags.boolean({ char: 'y', default: false, description: 'Confirm SAS prompts without asking' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Verify)
    ensureWritable(flags)
    const target = await resolveTarget({ target: flags.target, baseURL: flags['base-url'] })
    const state = await driveVerification({ baseURL: target.baseURL, target: target.id, userID: flags['user-id'], yes: flags.yes })
    if (flags.json) {
      await printData(state, 'json')
      return
    }
    const next = nextAppStep(state, target.id)
    await printSuccess({
      message: state.state === 'ready' ? 'E2EE ready' : `Verification state: ${state.verification?.state ?? state.state}`,
      detail: next,
      data: state,
    }, 'human')
  }
}
