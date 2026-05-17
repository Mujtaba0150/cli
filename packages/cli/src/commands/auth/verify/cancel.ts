import { Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../../lib/command.js'
import { createClient } from '../../../lib/client.js'
import { printData } from '../../../lib/output.js'
export default class AuthVerifyCancel extends BeeperCommand {
  static override summary = 'Cancel an in-progress device verification'
  static override flags = {
    id: Flags.string({ description: 'Verification request ID. Defaults to the active request.' }),
    user: Flags.string({ description: 'User ID whose verification request to cancel' }),
    code: Flags.string({ description: 'Optional cancellation code' }),
    payload: Flags.string({ description: 'Optional cancellation payload' }),
  }
  async run(): Promise<void> {
    const { flags } = await this.parse(AuthVerifyCancel)
    ensureWritable(flags)
    const client = await createClient(flags)
    await printData(await client.app.verifications.cancel(flags.id ?? 'active', {}), flags.json ? 'json' : 'human')
  }
}
