import { Args, Command, Flags } from '@oclif/core'
import type { SaStartResponse } from '@beeper/desktop-api/resources/app/e2ee/verification/sas.js'
import { appRequest } from '../../../../../lib/app-api.js'
import { printData } from '../../../../../lib/output.js'

export default class AppE2EEVerificationSASStart extends Command {
  static override summary = 'Start emoji verification'
  static override args = {
    txnID: Args.string({ description: 'Verification transaction ID', required: true }),
  }
  static override flags = {
    'base-url': Flags.string({ description: 'Beeper Desktop API base URL' }),
    json: Flags.boolean({ default: false, description: 'Print JSON' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(AppE2EEVerificationSASStart)
    const result = await appRequest<SaStartResponse>('POST', '/v1/app/e2ee/verification/sas/start', {
      baseURL: flags['base-url'],
      body: { txnID: args.txnID },
    })
    printData(result, flags.json ? 'json' : 'human')
  }
}
