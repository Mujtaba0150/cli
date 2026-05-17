import { Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../../lib/command.js'
import { createClient } from '../../../lib/client.js'
import { printData } from '../../../lib/output.js'
export default class AuthVerifyStart extends BeeperCommand {
  static override summary = 'Start a device verification request'
  static override flags = {
    id: Flags.string({ description: 'Verification request ID (rarely needed; set by the server)' }),
    user: Flags.string({ description: 'User ID to verify with (defaults to your own account)' }),
    code: Flags.string({ description: 'Optional start-code payload' }),
    payload: Flags.string({ description: 'Optional raw start payload' }),
  }
  async run(): Promise<void> {
    const { flags } = await this.parse(AuthVerifyStart)
    ensureWritable(flags)
    const client = await createClient(flags)
    await printData(await client.app.verifications.create({ userID: flags.user }), flags.json ? 'json' : 'human')
  }
}
