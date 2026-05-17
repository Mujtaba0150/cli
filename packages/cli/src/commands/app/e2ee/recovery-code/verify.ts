import { Args } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../../../lib/command.js'
import type { RecoveryCodeVerifyResponse } from '@beeper/desktop-api/resources/app/e2ee/recovery-code/recovery-code.js'
import { appRequest } from '../../../../lib/app-api.js'
import { printData } from '../../../../lib/output.js'

export default class AppE2EERecoveryCodeVerify extends BeeperCommand {
  static override summary = 'Unlock encrypted messages with a recovery key'
  static override args = {
    recoveryCode: Args.string({ description: 'Beeper recovery key', required: true }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(AppE2EERecoveryCodeVerify)
    ensureWritable(flags)
    const result = await appRequest<RecoveryCodeVerifyResponse>('POST', '/v1/app/e2ee/recovery-code/verify', {
      baseURL: flags['base-url'],
      target: flags.target,
      body: { recoveryCode: args.recoveryCode },
    })
    await printData(result, flags.json ? 'json' : 'human')
  }
}
