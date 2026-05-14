import { Args, Command, Flags } from '@oclif/core'
import type { QrScanResponse } from '@beeper/desktop-api/resources/app/e2ee/verification/qr.js'
import { appRequest } from '../../../../../lib/app-api.js'
import { printData } from '../../../../../lib/output.js'

export default class AppE2EEVerificationQRScan extends Command {
  static override summary = 'Submit a scanned verification QR payload'
  static override args = {
    data: Args.string({ description: 'QR code payload', required: true }),
  }
  static override flags = {
    'base-url': Flags.string({ description: 'Beeper Desktop API base URL' }),
    json: Flags.boolean({ default: false, description: 'Print JSON' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(AppE2EEVerificationQRScan)
    const result = await appRequest<QrScanResponse>('POST', '/v1/app/e2ee/verification/qr/scan', {
      baseURL: flags['base-url'],
      body: { data: args.data },
    })
    printData(result, flags.json ? 'json' : 'human')
  }
}
