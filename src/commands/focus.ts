import { Args, Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../lib/command.js'
import { createClient } from '../lib/client.js'
import { printData } from '../lib/output.js'
import { resolveChatID } from '../lib/resolve.js'

export default class Focus extends BeeperCommand {
  static override summary = 'Focus Beeper Desktop, optionally opening a chat or message'
  static override args = {
    chat: Args.string({ description: 'Chat ID, local chat ID, title, or search text', required: false }),
    message: Args.string({ description: 'Message ID', required: false }),
  }
  static override flags = {
    attachment: Flags.string({ description: 'Draft attachment path' }),
    draft: Flags.string({ description: 'Draft text' }),
    pick: Flags.integer({ description: 'Pick the Nth chat when the input is ambiguous' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Focus)
    ensureWritable(flags)
    const client = await createClient(flags)
    const chatID = args.chat ? await resolveChatID(client, args.chat, { pick: flags.pick }) : undefined
    const result = await client.focus({
      chatID,
      draftAttachmentPath: flags.attachment,
      draftText: flags.draft,
      messageID: args.message,
    })
    await printData(result, flags.json ? 'json' : 'human')
  }
}
