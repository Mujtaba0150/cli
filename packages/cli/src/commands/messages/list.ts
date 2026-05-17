import { Flags } from '@oclif/core'
import { BeeperCommand } from '../../lib/command.js'
import { createClient } from '../../lib/client.js'
import { listMatrixMessages, shouldFallbackToMatrix } from '../../lib/matrix-direct.js'
import { collectPage, printIDs, printList } from '../../lib/output.js'
import { resolveChatID } from '../../lib/resolve.js'

export default class MessagesList extends BeeperCommand {
  static override summary = 'List chat messages'
  static override flags = {
    chat: Flags.string({ required: true, description: 'Chat selector (ID, local ID, title, or search text)' }),
    'before-cursor': Flags.string({ description: 'Paginate messages older than this message ID' }),
    'after-cursor': Flags.string({ description: 'Paginate messages newer than this message ID' }),
    ids: Flags.boolean({ default: false, description: 'Print only message IDs' }),
    limit: Flags.integer({ default: 50, description: 'Maximum messages to print' }),
    pick: Flags.integer({ description: 'Pick the Nth chat when --chat is ambiguous' }),
  }
  async run(): Promise<void> {
    const { flags } = await this.parse(MessagesList)
    const client = await createClient(flags)
    const chatID = await resolveChatID(client, flags.chat, { pick: flags.pick })
    const before = flags['before-cursor']
    const after = flags['after-cursor']
    if (before && after) throw new Error('Use only one of --before-cursor or --after-cursor')
    let items: unknown[]
    try {
      items = await collectPage(client.messages.list(chatID, { cursor: before ?? after, direction: before ? 'before' : after ? 'after' : undefined }), flags.limit)
    } catch (error) {
      if (!shouldFallbackToMatrix(chatID, error)) throw error
      items = await listMatrixMessages(flags, chatID, flags.limit)
    }
    if (flags.ids) printIDs(items)
    else await printList(items, flags.json ? 'json' : 'human', { title: 'No messages yet', subtitle: 'This chat is empty.' })
  }
}
