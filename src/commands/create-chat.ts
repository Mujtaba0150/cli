import { Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../lib/command.js'
import { createClient } from '../lib/client.js'
import { apiCopy, cliCopy } from '../lib/copy.js'
import { printData } from '../lib/output.js'
import { resolveAccountID } from '../lib/resolve.js'

export default class CreateChat extends BeeperCommand {
  static override summary = apiCopy.chats.create
  static override flags = {
    account: Flags.string({ description: cliCopy.args.accountSelector, required: true }),
    message: Flags.string({ description: 'Optional first message' }),
    participant: Flags.string({ multiple: true, required: true, description: 'Participant user ID' }),
    title: Flags.string({ description: 'Group title' }),
    type: Flags.string({ default: 'single', options: ['single', 'group'], description: 'Chat type' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(CreateChat)
    ensureWritable(flags)
    const client = await createClient(flags)
    const accountID = await resolveAccountID(client, flags.account)
    const result = await client.chats.create({
      accountID,
      messageText: flags.message,
      participantIDs: flags.participant,
      title: flags.title,
      type: flags.type as 'single' | 'group',
    })
    await printData(result, flags.json ? 'json' : 'human')
  }
}
