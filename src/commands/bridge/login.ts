import { Args, Command, Flags } from '@oclif/core'
import { createClient } from '../../lib/client.js'
import { printBridgeLoginStep, runGuidedBridgeLogin } from '../../lib/bridge-login.js'
import { printData } from '../../lib/output.js'

export default class BridgeLogin extends Command {
  static override summary = 'Start and optionally complete a bridge login flow'
  static override args = {
    bridgeID: Args.string({ description: 'Bridge ID, for example discordgo or local-whatsapp', required: true }),
    flowID: Args.string({ description: 'Login flow ID. If omitted, the first available flow is used.' }),
  }
  static override flags = {
    'base-url': Flags.string({ description: 'Beeper Desktop API base URL' }),
    debug: Flags.boolean({ default: false }),
    guided: Flags.boolean({ default: true, allowNo: true, description: 'Prompt through login steps until completion' }),
    json: Flags.boolean({ default: false, description: 'Print JSON' }),
    'login-id': Flags.string({ description: 'Existing login ID to re-login as' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(BridgeLogin)
    const client = await createClient(flags)
    let flowID = args.flowID
    if (!flowID) {
      const flows = await client.matrix.bridges.auth.listFlows(args.bridgeID)
      flowID = flows.flows?.[0]?.id
      if (!flowID) throw new Error(`No login flows returned for bridge ${args.bridgeID}.`)
      if (!flags.json) this.log(`Using flow ${flowID}`)
    }

    const step = await client.matrix.bridges.auth.startLogin(flowID, {
      bridgeID: args.bridgeID,
      login_id: flags['login-id'],
    })
    const result = flags.guided ? await runGuidedBridgeLogin(client, args.bridgeID, step) : step
    if (flags.json) printData(result, 'json')
    else if (!flags.guided) printBridgeLoginStep(result)
  }
}
