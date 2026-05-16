import { BeeperCommand } from '../../lib/command.js'
import type { AppStatusResponse } from '@beeper/desktop-api/resources/app/app.js'
import { appRequest } from '../../lib/app-api.js'
import { printData } from '../../lib/output.js'

export default class AppStatus extends BeeperCommand {
  static override summary = 'Show Beeper app login and encrypted messaging state'

  async run(): Promise<void> {
    const { flags } = await this.parse(AppStatus)
    const state = await appRequest<AppStatusResponse>('GET', '/v1/app/status', { baseURL: flags['base-url'] })
    await printData(state, flags.json ? 'json' : 'human')
  }
}
