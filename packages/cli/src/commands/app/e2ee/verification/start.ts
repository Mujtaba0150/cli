import { Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../../../lib/command.js'
import type { VerificationStartResponse } from '@beeper/desktop-api/resources/app/e2ee/verification/verification.js'
import { appRequest } from '../../../../lib/app-api.js'
import { printData } from '../../../../lib/output.js'

export default class AppE2EEVerificationStart extends BeeperCommand {
  static override summary = 'Start device verification'
  static override flags = {
    'user-id': Flags.string({ description: 'User ID to verify. Defaults to the signed-in user.' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(AppE2EEVerificationStart)
    ensureWritable(flags)
    const result = await appRequest<VerificationStartResponse>('POST', '/v1/app/e2ee/verification', {
      baseURL: flags['base-url'],
      target: flags.target,
      body: flags['user-id'] ? { userID: flags['user-id'] } : {},
    })
    await printData(result, flags.json ? 'json' : 'human')
  }
}
