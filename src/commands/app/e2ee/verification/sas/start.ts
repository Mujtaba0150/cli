import { Args } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../../../../lib/command.js'
import type { SaStartResponse } from '@beeper/desktop-api/resources/app/e2ee/verification/sas.js'
import { appRequest } from '../../../../../lib/app-api.js'
import { printData } from '../../../../../lib/output.js'

export default class AppE2EEVerificationSASStart extends BeeperCommand {
  static override summary = 'Start emoji verification'
  static override args = {
    txnID: Args.string({ description: 'Verification transaction ID', required: true }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(AppE2EEVerificationSASStart)
    ensureWritable(flags)
    const result = await appRequest<SaStartResponse>('POST', '/v1/app/e2ee/verification/sas/start', {
      baseURL: flags['base-url'],
      body: { txnID: args.txnID },
    })
    await printData(result, flags.json ? 'json' : 'human')
  }
}
