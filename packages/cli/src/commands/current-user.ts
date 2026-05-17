import { BeeperCommand } from '../lib/command.js'
import { appRequest } from '../lib/app-api.js'
import { printData } from '../lib/output.js'

export default class CurrentUser extends BeeperCommand {
  static override summary = 'Show the authenticated Desktop API user'

  async run(): Promise<void> {
    const { flags } = await this.parse(CurrentUser)
    const user = await appRequest<unknown>('GET', '/oauth/userinfo', { baseURL: flags['base-url'], target: flags.target })
    await printData(user, flags.json ? 'json' : 'human')
  }
}
