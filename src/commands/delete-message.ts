import { Args, Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../lib/command.js'
import { createClient } from '../lib/client.js'
import { apiCopy, cliCopy, sdkParamCopy } from '../lib/copy.js'
import { printSuccess } from '../lib/output.js'
import { resolveChatID } from '../lib/resolve.js'

export default class DeleteMessage extends BeeperCommand {
  static override summary = apiCopy.messages.delete
  static override args = {
    chat: Args.string({ description: cliCopy.args.chatSelector, required: true }),
    message: Args.string({ description: sdkParamCopy.messageID, required: true }),
  }
  static override flags = {
    'for-everyone': Flags.boolean({ default: false, description: sdkParamCopy.forEveryone }),
    pick: Flags.integer({ description: cliCopy.flags.pick }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(DeleteMessage)
    ensureWritable(flags)
    const client = await createClient(flags)
    const chatID = await resolveChatID(client, args.chat, { pick: flags.pick })
    await client.messages.delete(args.message, {
      chatID,
      forEveryone: flags['for-everyone'] || undefined,
    })
    await printSuccess({
      message: flags['for-everyone'] ? 'Deleted for everyone' : 'Deleted',
      detail: args.message,
      data: { messageID: args.message, chatID, forEveryone: flags['for-everyone'] },
    }, flags.json ? 'json' : 'human')
  }
}
