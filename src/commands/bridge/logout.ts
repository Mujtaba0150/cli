import { Args, Command, Flags } from '@oclif/core'
import { createClient } from '../../lib/client.js'
import { printData } from '../../lib/output.js'

export default class BridgeLogout extends Command {
  static override summary = 'Log out a bridge login'
  static override args = {
    bridgeID: Args.string({ description: 'Bridge ID, for example discordgo or local-whatsapp', required: true }),
    loginID: Args.string({ description: 'Bridge login ID to log out', required: true }),
  }
  static override flags = {
    'base-url': Flags.string({ description: 'Beeper Desktop API base URL' }),
    debug: Flags.boolean({ default: false }),
    json: Flags.boolean({ default: false, description: 'Print JSON' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(BridgeLogout)
    const client = await createClient(flags)
    printData(await client.matrix.bridges.auth.logout(args.loginID, { bridgeID: args.bridgeID }), flags.json ? 'json' : 'human')
  }
}
