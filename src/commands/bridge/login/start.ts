import { Args, Command, Flags } from '@oclif/core'
import { createClient } from '../../../lib/client.js'
import { printBridgeLoginStep } from '../../../lib/bridge-login.js'
import { printData } from '../../../lib/output.js'

export default class BridgeLoginStart extends Command {
  static override summary = 'Start a bridge login and print the first step'
  static override args = {
    bridgeID: Args.string({ description: 'Bridge ID, for example discordgo or local-whatsapp', required: true }),
    flowID: Args.string({ description: 'Login flow ID', required: true }),
  }
  static override flags = {
    'base-url': Flags.string({ description: 'Beeper Desktop API base URL' }),
    debug: Flags.boolean({ default: false }),
    json: Flags.boolean({ default: false, description: 'Print JSON' }),
    'login-id': Flags.string({ description: 'Existing login ID to re-login as' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(BridgeLoginStart)
    const client = await createClient(flags)
    const step = await client.matrix.bridges.auth.startLogin(args.flowID, {
      bridgeID: args.bridgeID,
      login_id: flags['login-id'],
    })
    if (flags.json) printData(step, 'json')
    else printBridgeLoginStep(step)
  }
}
