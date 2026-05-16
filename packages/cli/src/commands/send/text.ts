import { Args, Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../lib/command.js'
import { createClient } from '../../lib/client.js'
import { apiCopy, cliCopy, sdkParamCopy } from '../../lib/copy.js'
import { printData } from '../../lib/output.js'
import { resolveChatID } from '../../lib/resolve.js'
import { sendMessage } from '../../lib/send-message.js'

export default class SendText extends BeeperCommand {
  static override summary = apiCopy.messages.send
  static override args = {
    chat: Args.string({ description: cliCopy.args.chatSelector, required: true }),
    text: Args.string({ description: sdkParamCopy.text, required: true }),
  }
  static override flags = {
    file: Flags.string({ description: sdkParamCopy.attachmentFile }),
    'file-name': Flags.string({ description: sdkParamCopy.fileName }),
    'mime-type': Flags.string({ description: sdkParamCopy.mimeType }),
    pick: Flags.integer({ description: cliCopy.flags.pick }),
    'reply-to': Flags.string({ description: sdkParamCopy.replyToMessageID }),
    wait: Flags.boolean({ default: false, description: 'Wait for the pending message to resolve' }),
    'wait-interval': Flags.integer({ default: 750, description: 'Milliseconds between message status checks' }),
    'wait-timeout': Flags.integer({ default: 30000, description: 'Milliseconds to wait for message resolution' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(SendText)
    ensureWritable(flags)
    const client = await createClient(flags)
    const chatID = await resolveChatID(client, args.chat, { pick: flags.pick })
    const result = await sendMessage(client, {
      chatID,
      file: flags.file,
      fileName: flags['file-name'],
      mimeType: flags['mime-type'],
      replyTo: flags['reply-to'],
      text: args.text,
      wait: flags.wait,
      waitIntervalMs: flags['wait-interval'],
      waitTimeoutMs: flags['wait-timeout'],
    })
    await printData(result, flags.json ? 'json' : 'human')
  }
}
