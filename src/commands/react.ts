import { Args, Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../lib/command.js'
import { createClient } from '../lib/client.js'
import { apiCopy, cliCopy, sdkParamCopy } from '../lib/copy.js'
import { printData } from '../lib/output.js'
import { resolveChatID } from '../lib/resolve.js'

export default class React extends BeeperCommand {
  static override summary = apiCopy.reactions.add
  static override args = {
    chat: Args.string({ description: cliCopy.args.chatSelector, required: true }),
    message: Args.string({ description: sdkParamCopy.messageID, required: true }),
    reaction: Args.string({ description: sdkParamCopy.reactionKey, required: true }),
  }
  static override flags = {
    pick: Flags.integer({ description: cliCopy.flags.pick }),
    transaction: Flags.string({ description: 'Optional transaction ID' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(React)
    ensureWritable(flags)
    const client = await createClient(flags)
    const chatID = await resolveChatID(client, args.chat, { pick: flags.pick })
    const result = await client.chats.messages.reactions.add(args.message, {
      chatID,
      reactionKey: args.reaction,
      transactionID: flags.transaction,
    })
    await printData(result, flags.json ? 'json' : 'human')
  }
}
