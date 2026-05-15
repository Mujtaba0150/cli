import { Args, Command, Flags } from '@oclif/core'
import type { VerificationAcceptResponse } from '@beeper/desktop-api/resources/app/e2ee/verification/verification.js'
import { appRequest } from '../../../../lib/app-api.js'
import { printData } from '../../../../lib/output.js'

export default class AppE2EEVerificationAccept extends Command {
  static override summary = 'Accept a device verification request'
  static override args = {
    txnID: Args.string({ description: 'Verification transaction ID', required: true }),
  }
  static override flags = {
    'base-url': Flags.string({ description: 'Beeper Desktop API base URL' }),
    json: Flags.boolean({ default: false, description: 'Print JSON' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(AppE2EEVerificationAccept)
    const result = await appRequest<VerificationAcceptResponse>('POST', '/v1/app/e2ee/verification/accept', {
      baseURL: flags['base-url'],
      body: { txnID: args.txnID },
    })
    await printData(result, flags.json ? 'json' : 'human')
  }
}
