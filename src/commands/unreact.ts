import { Args, Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../lib/command.js'
import { createClient } from '../lib/client.js'
import { apiCopy, cliCopy, sdkParamCopy } from '../lib/copy.js'
import { printData } from '../lib/output.js'
import { resolveChatID } from '../lib/resolve.js'

export default class Unreact extends BeeperCommand {
  static override summary = apiCopy.reactions.delete
  static override args = {
    chat: Args.string({ description: cliCopy.args.chatSelector, required: true }),
    message: Args.string({ description: sdkParamCopy.messageID, required: true }),
    reaction: Args.string({ description: sdkParamCopy.reactionKey, required: true }),
  }
  static override flags = {
    pick: Flags.integer({ description: cliCopy.flags.pick }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Unreact)
    ensureWritable(flags)
    const client = await createClient(flags)
    const chatID = await resolveChatID(client, args.chat, { pick: flags.pick })
    const result = await client.chats.messages.reactions.delete(args.reaction, {
      chatID,
      messageID: args.message,
    })
    await printData(result, flags.json ? 'json' : 'human')
  }
}
