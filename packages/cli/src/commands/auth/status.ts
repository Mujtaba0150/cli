import { BeeperCommand } from '../../lib/command.js'
import { readConfig } from '../../lib/config.js'
import { printData } from '../../lib/output.js'

export default class AuthStatus extends BeeperCommand {
  static override summary = 'Show local auth status and token metadata'

  async run(): Promise<void> {
    const { flags } = await this.parse(AuthStatus)
    const config = await readConfig()
    const authenticated = Boolean(process.env.BEEPER_ACCESS_TOKEN || config.auth?.accessToken)
    const data = {
      authenticated,
      baseURL: config.baseURL,
      source: process.env.BEEPER_ACCESS_TOKEN ? 'env' : config.auth?.accessToken ? 'config' : 'none',
      clientID: config.auth?.clientID,
      expiresAt: config.auth?.expiresAt,
      scope: config.auth?.scope,
    }
    await printData(data, flags.json ? 'json' : 'human')
  }
}
