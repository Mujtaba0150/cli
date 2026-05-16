import { Args, Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../lib/command.js'
import { createClient } from '../lib/client.js'
import { cliCopy } from '../lib/copy.js'
import { printData } from '../lib/output.js'
import { resolveChatID } from '../lib/resolve.js'

export default class Avatar extends BeeperCommand {
  static override summary = 'Set or clear a group chat avatar'
  static override args = {
    chat: Args.string({ description: cliCopy.args.chatSelector, required: true }),
    path: Args.string({ description: 'Local avatar image path. Omit with --clear to remove it.', required: false }),
  }

  static override flags = {
    clear: Flags.boolean({ default: false, description: 'Clear the current avatar' }),
    pick: Flags.integer({ description: cliCopy.flags.pick }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Avatar)
    ensureWritable(flags)
    if (!flags.clear && !args.path) throw new Error('Provide PATH or pass --clear')
    const client = await createClient(flags)
    const chatID = await resolveChatID(client, args.chat, { pick: flags.pick })
    await printData(await client.chats.update(chatID, { imgURL: flags.clear ? null : args.path }), flags.json ? 'json' : 'human')
  }
}
