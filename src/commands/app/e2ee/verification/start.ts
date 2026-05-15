import { Command, Flags } from '@oclif/core'
import type { VerificationStartResponse } from '@beeper/desktop-api/resources/app/e2ee/verification/verification.js'
import { appRequest } from '../../../../lib/app-api.js'
import { printData } from '../../../../lib/output.js'

export default class AppE2EEVerificationStart extends Command {
  static override summary = 'Start device verification'
  static override flags = {
    'base-url': Flags.string({ description: 'Beeper Desktop API base URL' }),
    'user-id': Flags.string({ description: 'User ID to verify. Defaults to the signed-in user.' }),
    json: Flags.boolean({ default: false, description: 'Print JSON' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(AppE2EEVerificationStart)
    const result = await appRequest<VerificationStartResponse>('POST', '/v1/app/e2ee/verification', {
      baseURL: flags['base-url'],
      body: flags['user-id'] ? { userID: flags['user-id'] } : {},
    })
    await printData(result, flags.json ? 'json' : 'human')
  }
}
