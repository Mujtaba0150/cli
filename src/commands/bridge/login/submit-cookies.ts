import { Args, Command, Flags } from '@oclif/core'
import { createClient } from '../../../lib/client.js'
import { printBridgeLoginStep } from '../../../lib/bridge-login.js'
import { printData } from '../../../lib/output.js'

export default class BridgeLoginSubmitCookies extends Command {
  static override summary = 'Submit cookies for a bridge login step'
  static override args = {
    bridgeID: Args.string({ description: 'Bridge ID, for example discordgo or local-whatsapp', required: true }),
    loginProcessID: Args.string({ description: 'Login process ID returned by the bridge', required: true }),
    stepID: Args.string({ description: 'Login step ID returned by the bridge', required: true }),
  }
  static override flags = {
    'base-url': Flags.string({ description: 'Beeper Desktop API base URL' }),
    body: Flags.string({ description: 'JSON object containing cookie field names and string values', required: true }),
    debug: Flags.boolean({ default: false }),
    json: Flags.boolean({ default: false, description: 'Print JSON' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(BridgeLoginSubmitCookies)
    const client = await createClient(flags)
    const body = JSON.parse(flags.body) as Record<string, string>
    const step = await client.matrix.bridges.auth.submitCookies(args.stepID, {
      bridgeID: args.bridgeID,
      loginProcessID: args.loginProcessID,
      body,
    })
    if (flags.json) printData(step, 'json')
    else printBridgeLoginStep(step)
  }
}
