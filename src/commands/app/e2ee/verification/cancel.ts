import { Args, Command, Flags } from '@oclif/core'
import type { VerificationCancelResponse } from '@beeper/desktop-api/resources/app/e2ee/verification/verification.js'
import { appRequest } from '../../../../lib/app-api.js'
import { printData } from '../../../../lib/output.js'

export default class AppE2EEVerificationCancel extends Command {
  static override summary = 'Cancel device verification'
  static override args = {
    txnID: Args.string({ description: 'Verification transaction ID', required: true }),
  }
  static override flags = {
    'base-url': Flags.string({ description: 'Beeper Desktop API base URL' }),
    code: Flags.string({ description: 'Optional cancellation code' }),
    reason: Flags.string({ description: 'Optional cancellation reason' }),
    json: Flags.boolean({ default: false, description: 'Print JSON' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(AppE2EEVerificationCancel)
    const result = await appRequest<VerificationCancelResponse>('POST', '/v1/app/e2ee/verification/cancel', {
      baseURL: flags['base-url'],
      body: { txnID: args.txnID, code: flags.code, reason: flags.reason },
    })
    printData(result, flags.json ? 'json' : 'human')
  }
}
