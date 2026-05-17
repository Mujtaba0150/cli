import { Flags } from '@oclif/core'
import { createReadStream } from 'node:fs'
import { BeeperCommand, ensureWritable } from '../../lib/command.js'
import { createClient } from '../../lib/client.js'
import { printData, printSuccess } from '../../lib/output.js'
import { resolveChatID } from '../../lib/resolve.js'

export default class ChatsMarkUnread extends BeeperCommand {
  static override summary = 'Mark a chat unread'
  static override flags = { chat: Flags.string({ required: true, description: 'Chat selector (ID, local ID, title, or search text)' }), pick: Flags.integer({ description: 'Pick the Nth chat when --chat is ambiguous' }), message: Flags.string({ description: 'Mark read at (or unread starting from) this message ID' }), }
  async run(): Promise<void> {
    const { flags } = await this.parse(ChatsMarkUnread)
    ensureWritable(flags)
    
    const client = await createClient(flags)
    const chatID = await resolveChatID(client, flags.chat, { pick: flags.pick })
    await printData(await client.chats.markUnread(chatID, { messageID: flags.message }), flags.json ? 'json' : 'human')
  }
}
