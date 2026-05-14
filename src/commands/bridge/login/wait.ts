import { Args, Command, Flags } from '@oclif/core'
import { createClient } from '../../../lib/client.js'
import { printBridgeLoginStep } from '../../../lib/bridge-login.js'
import { printData } from '../../../lib/output.js'

export default class BridgeLoginWait extends Command {
  static override summary = 'Wait for the next bridge login step'
  static override args = {
    bridgeID: Args.string({ description: 'Bridge ID, for example discordgo or local-whatsapp', required: true }),
    loginProcessID: Args.string({ description: 'Login process ID returned by the bridge', required: true }),
    stepID: Args.string({ description: 'Login step ID returned by the bridge', required: true }),
  }
  static override flags = {
    'base-url': Flags.string({ description: 'Beeper Desktop API base URL' }),
    debug: Flags.boolean({ default: false }),
    json: Flags.boolean({ default: false, description: 'Print JSON' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(BridgeLoginWait)
    const client = await createClient(flags)
    const step = await client.matrix.bridges.auth.waitForStep(args.stepID, {
      bridgeID: args.bridgeID,
      loginProcessID: args.loginProcessID,
    })
    if (flags.json) printData(step, 'json')
    else printBridgeLoginStep(step)
  }
}
