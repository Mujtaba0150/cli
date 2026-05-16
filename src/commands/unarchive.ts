import { Args, Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../lib/command.js'
import { createClient } from '../lib/client.js'
import { apiCopy, cliCopy } from '../lib/copy.js'
import { printSuccess } from '../lib/output.js'
import { resolveChatID } from '../lib/resolve.js'

export default class Unarchive extends BeeperCommand {
  static override summary = apiCopy.chats.archive
  static override args = {
    chat: Args.string({ description: cliCopy.args.chatSelector, required: true }),
  }
  static override flags = {
    pick: Flags.integer({ description: cliCopy.flags.pick }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Unarchive)
    ensureWritable(flags)
    const client = await createClient(flags)
    const chatID = await resolveChatID(client, args.chat, { pick: flags.pick })
    await client.chats.archive(chatID, { archived: false })
    await printSuccess({ message: 'Unarchived', detail: chatID, data: { chatID } }, flags.json ? 'json' : 'human')
  }
}
