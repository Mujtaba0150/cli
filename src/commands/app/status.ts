import { Command, Flags } from '@oclif/core'
import type { AppStatusResponse } from '@beeper/desktop-api/resources/app/app.js'
import { appRequest } from '../../lib/app-api.js'
import { printData } from '../../lib/output.js'

export default class AppStatus extends Command {
  static override summary = 'Show Beeper app login and encrypted messaging state'
  static override flags = {
    'base-url': Flags.string({ description: 'Beeper Desktop API base URL' }),
    json: Flags.boolean({ default: false, description: 'Print JSON' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(AppStatus)
    const state = await appRequest<AppStatusResponse>('GET', '/v1/app/status', { baseURL: flags['base-url'] })
    printData(state, flags.json ? 'json' : 'human')
  }
}
