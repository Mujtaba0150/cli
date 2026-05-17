import { Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../../lib/command.js'
import { createClient } from '../../../lib/client.js'
import { printData } from '../../../lib/output.js'
export default class AuthVerifyResetRecoveryKey extends BeeperCommand {
  static override summary = 'Create a new encrypted-messages recovery key'
  static override flags = {
    id: Flags.string({ description: 'Verification request ID (rarely needed; set by the server)' }),
    user: Flags.string({ description: 'User ID to reset (defaults to your own account)' }),
    code: Flags.string({ description: 'Optional confirmation code' }),
    payload: Flags.string({ description: 'Optional raw payload' }),
  }
  async run(): Promise<void> {
    const { flags } = await this.parse(AuthVerifyResetRecoveryKey)
    ensureWritable(flags)
    const client = await createClient(flags)
    await printData(await client.app.login.verification.recoveryKey.reset.create({}), flags.json ? 'json' : 'human')
  }
}
