import { Args } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../../../../lib/command.js'
import type { QrScanResponse } from '@beeper/desktop-api/resources/app/e2ee/verification/qr.js'
import { appRequest } from '../../../../../lib/app-api.js'
import { printData } from '../../../../../lib/output.js'

export default class AppE2EEVerificationQRScan extends BeeperCommand {
  static override summary = 'Submit a scanned verification QR payload'
  static override args = {
    data: Args.string({ description: 'QR code payload', required: true }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(AppE2EEVerificationQRScan)
    ensureWritable(flags)
    const result = await appRequest<QrScanResponse>('POST', '/v1/app/e2ee/verification/qr/scan', {
      baseURL: flags['base-url'],
      body: { data: args.data },
    })
    await printData(result, flags.json ? 'json' : 'human')
  }
}
