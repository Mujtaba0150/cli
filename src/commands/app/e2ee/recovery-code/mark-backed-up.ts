import { BeeperCommand, ensureWritable } from '../../../../lib/command.js'
import type { RecoveryCodeMarkBackedUpResponse } from '@beeper/desktop-api/resources/app/e2ee/recovery-code/recovery-code.js'
import { appRequest } from '../../../../lib/app-api.js'
import { printData } from '../../../../lib/output.js'

export default class AppE2EERecoveryCodeMarkBackedUp extends BeeperCommand {
  static override summary = 'Mark the recovery key as saved'

  async run(): Promise<void> {
    const { flags } = await this.parse(AppE2EERecoveryCodeMarkBackedUp)
    ensureWritable(flags)
    const result = await appRequest<RecoveryCodeMarkBackedUpResponse>('POST', '/v1/app/e2ee/recovery-code/mark-backed-up', {
      baseURL: flags['base-url'],
    })
    await printData(result, flags.json ? 'json' : 'human')
  }
}
