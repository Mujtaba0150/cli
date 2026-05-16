import { Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../../../../lib/command.js'
import type { ResetBeginResponse } from '@beeper/desktop-api/resources/app/e2ee/recovery-code/reset.js'
import { appRequest } from '../../../../../lib/app-api.js'
import { printData } from '../../../../../lib/output.js'

export default class AppE2EERecoveryCodeResetBegin extends BeeperCommand {
  static override summary = 'Create a new recovery key'
  static override flags = {
    'recovery-code': Flags.string({ description: 'Existing recovery key, if available' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(AppE2EERecoveryCodeResetBegin)
    ensureWritable(flags)
    const result = await appRequest<ResetBeginResponse>('POST', '/v1/app/e2ee/recovery-code/reset', {
      baseURL: flags['base-url'],
      body: flags['recovery-code'] ? { recoveryCode: flags['recovery-code'] } : {},
    })
    await printData(result, flags.json ? 'json' : 'human')
  }
}
