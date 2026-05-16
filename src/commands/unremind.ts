import { Args, Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../lib/command.js'
import { createClient } from '../lib/client.js'
import { apiCopy, cliCopy } from '../lib/copy.js'
import { printSuccess } from '../lib/output.js'
import { resolveChatID } from '../lib/resolve.js'

export default class Unremind extends BeeperCommand {
  static override summary = apiCopy.reminders.delete
  static override args = {
    chat: Args.string({ description: cliCopy.args.chatSelector, required: true }),
  }
  static override flags = {
    pick: Flags.integer({ description: cliCopy.flags.pick }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Unremind)
    ensureWritable(flags)
    const client = await createClient(flags)
    const chatID = await resolveChatID(client, args.chat, { pick: flags.pick })
    await client.chats.reminders.delete(chatID)
    await printSuccess({ message: 'Reminder cleared', detail: chatID, data: { chatID } }, flags.json ? 'json' : 'human')
  }
}
