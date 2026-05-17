import { Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../lib/command.js'
import { createClient } from '../../lib/client.js'
import { printSuccess } from '../../lib/output.js'
import { resolveChatID } from '../../lib/resolve.js'

export default class ChatsLabel extends BeeperCommand {
  static override summary = 'Add or remove a label on a chat'
  static override description = 'Requires server-side support for /v1/chats/{chatID}/labels/{labelID}.'
  static override flags = {
    chat: Flags.string({ required: true, description: 'Chat selector (ID, local ID, title, or search text)' }),
    pick: Flags.integer({ description: 'Pick the Nth chat when --chat is ambiguous' }),
    label: Flags.string({ required: true, description: 'Label ID to add or remove' }),
    remove: Flags.boolean({ default: false, description: 'Remove the label instead of adding it' }),
  }
  async run(): Promise<void> {
    const { flags } = await this.parse(ChatsLabel)
    ensureWritable(flags)
    const client = await createClient(flags)
    const chatID = await resolveChatID(client, flags.chat, { pick: flags.pick })
    const path = `/v1/chats/${encodeURIComponent(chatID)}/labels/${encodeURIComponent(flags.label)}`
    if (flags.remove) await client.delete(path)
    else await client.put(path, { body: {} })
    await printSuccess({
      message: flags.remove ? `Removed label ${flags.label}` : `Added label ${flags.label}`,
      data: { chatID, label: flags.label, action: flags.remove ? 'remove' : 'add' },
    }, flags.json ? 'json' : 'human')
  }
}
