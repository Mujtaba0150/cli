import { Args, Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../lib/command.js'
import { createClient } from '../lib/client.js'
import { cliCopy } from '../lib/copy.js'
import { printData } from '../lib/output.js'
import { resolveChatID } from '../lib/resolve.js'

export default class Inbox extends BeeperCommand {
  static override summary = 'Move a chat to the primary inbox'
  static override args = {
    chat: Args.string({ description: cliCopy.args.chatSelector, required: true }),
  }

  static override flags = {
    pick: Flags.integer({ description: cliCopy.flags.pick }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Inbox)
    ensureWritable(flags)
    const client = await createClient(flags)
    const chatID = await resolveChatID(client, args.chat, { pick: flags.pick })
    await printData(await client.chats.update(chatID, { isArchived: false, isLowPriority: false }), flags.json ? 'json' : 'human')
  }
}
