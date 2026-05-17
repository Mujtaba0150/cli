import { Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../../lib/command.js'
import { createClient } from '../../../lib/client.js'
import { printData } from '../../../lib/output.js'
export default class AuthVerifyRecoveryKey extends BeeperCommand {
  static override summary = 'Unlock encrypted messages with a recovery key'
  static override flags = {
    id: Flags.string({ description: 'Verification request ID. Defaults to the active request.' }),
    user: Flags.string({ description: 'User ID whose recovery key to use (defaults to your own account)' }),
    code: Flags.string({ description: 'Recovery key string', required: false }),
    payload: Flags.string({ description: 'Raw recovery payload (advanced)' }),
  }
  async run(): Promise<void> {
    const { flags } = await this.parse(AuthVerifyRecoveryKey)
    ensureWritable(flags)
    const client = await createClient(flags)
    await printData(await client.app.login.verification.recoveryKey.verify({ recoveryKey: flags.code ?? '' }), flags.json ? 'json' : 'human')
  }
}
