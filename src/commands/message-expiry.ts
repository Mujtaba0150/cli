import { Args, Command, Flags } from '@oclif/core'
import { createClient } from '../lib/client.js'
import { cliCopy } from '../lib/copy.js'
import { printData } from '../lib/output.js'
import { resolveChatID } from '../lib/resolve.js'

export default class MessageExpiry extends Command {
  static override summary = 'Set or clear disappearing-message expiry'
  static override args = {
    chat: Args.string({ description: cliCopy.args.chatSelector, required: true }),
    seconds: Args.string({ description: 'Expiry in seconds, or "off"', required: true }),
  }

  static override flags = {
    'base-url': Flags.string({ description: cliCopy.flags.baseURL }),
    debug: Flags.boolean({ default: false }),
    json: Flags.boolean({ default: false, description: cliCopy.flags.json }),
    pick: Flags.integer({ description: cliCopy.flags.pick }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(MessageExpiry)
    const expiry = args.seconds.toLowerCase() === 'off' ? null : Number(args.seconds)
    if (expiry !== null && (!Number.isInteger(expiry) || expiry < 0)) throw new Error('SECONDS must be a positive integer or "off"')
    const client = await createClient(flags)
    const chatID = await resolveChatID(client, args.chat, { pick: flags.pick })
    await printData(await client.chats.update(chatID, { messageExpirySeconds: expiry }), flags.json ? 'json' : 'human')
  }
}
