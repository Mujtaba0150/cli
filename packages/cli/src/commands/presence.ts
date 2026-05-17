import { Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../lib/command.js'
import { createClient } from '../lib/client.js'
import { printSuccess } from '../lib/output.js'
import { resolveChatID } from '../lib/resolve.js'

export default class Presence extends BeeperCommand {
  static override summary = 'Send a typing (or paused) indicator to a chat'
  static override description = 'Requires server-side support. Networks without typing notifications return an error.'
  static override flags = {
    chat: Flags.string({ required: true, description: 'Chat selector (ID, local ID, title, or search text)' }),
    pick: Flags.integer({ description: 'Pick the Nth chat when --chat is ambiguous' }),
    state: Flags.string({ default: 'typing', options: ['typing', 'paused'], description: 'Indicator to send' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Presence)
    ensureWritable(flags)
    const client = await createClient(flags)
    const chatID = await resolveChatID(client, flags.chat, { pick: flags.pick })
    await client.post(`/v1/chats/${encodeURIComponent(chatID)}/typing`, { body: { state: flags.state } })
    await printSuccess({ message: `Sent ${flags.state} indicator`, data: { chatID, state: flags.state } }, flags.json ? 'json' : 'human')
  }
}
