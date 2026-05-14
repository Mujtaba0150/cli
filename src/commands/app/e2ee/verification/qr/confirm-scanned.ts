import { Args, Command, Flags } from '@oclif/core'
import type { QrConfirmScannedResponse } from '@beeper/desktop-api/resources/app/e2ee/verification/qr.js'
import { appRequest } from '../../../../../lib/app-api.js'
import { printData } from '../../../../../lib/output.js'

export default class AppE2EEVerificationQRConfirmScanned extends Command {
  static override summary = 'Confirm another device scanned this QR code'
  static override args = {
    txnID: Args.string({ description: 'Verification transaction ID', required: true }),
  }
  static override flags = {
    'base-url': Flags.string({ description: 'Beeper Desktop API base URL' }),
    json: Flags.boolean({ default: false, description: 'Print JSON' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(AppE2EEVerificationQRConfirmScanned)
    const result = await appRequest<QrConfirmScannedResponse>('POST', '/v1/app/e2ee/verification/qr/confirm-scanned', {
      baseURL: flags['base-url'],
      body: { txnID: args.txnID },
    })
    printData(result, flags.json ? 'json' : 'human')
  }
}
