import { Args, Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../lib/command.js'
import { createClient } from '../lib/client.js'
import { cliCopy } from '../lib/copy.js'
import { printData } from '../lib/output.js'
import { resolveChatID } from '../lib/resolve.js'

export default class Pin extends BeeperCommand {
  static override summary = 'Pin a chat'
  static override args = {
    chat: Args.string({ description: cliCopy.args.chatSelector, required: true }),
  }

  static override flags = {
    pick: Flags.integer({ description: cliCopy.flags.pick }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Pin)
    ensureWritable(flags)
    const client = await createClient(flags)
    const chatID = await resolveChatID(client, args.chat, { pick: flags.pick })
    await printData(await client.chats.update(chatID, { isPinned: true }), flags.json ? 'json' : 'human')
  }
}
