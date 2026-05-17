import { Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../lib/command.js'
import { createClient } from '../../lib/client.js'
import { printData } from '../../lib/output.js'
import { resolveChatID } from '../../lib/resolve.js'
import { sendMessage } from '../../lib/send-message.js'

export default class SendFile extends BeeperCommand {
  static override summary = 'Send a file'
  static override flags = {
    to: Flags.string({ required: true, description: 'Chat selector (ID, local ID, title, or search text)' }),
    file: Flags.string({ required: true, description: 'Local file path to upload (max 500 MB)' }),
    caption: Flags.string({ description: 'Optional caption to send alongside the file' }),
    'file-name': Flags.string({ description: 'Override the displayed filename' }),
    'mime-type': Flags.string({ description: 'Override MIME type detection' }),
    pick: Flags.integer({ description: 'Pick the Nth chat when --to is ambiguous' }),
    'reply-to': Flags.string({ description: 'Send as a reply to this message ID' }),
    wait: Flags.boolean({ default: false, description: 'Wait for the message to leave the pending state (or fail) before returning' }),
    'wait-interval': Flags.integer({ default: 750, description: 'Poll interval (ms) while --wait is set' }),
    'wait-timeout': Flags.integer({ default: 30_000, description: 'Maximum time (ms) to wait when --wait is set' }),
  }
  async run(): Promise<void> {
    const { flags } = await this.parse(SendFile)
    ensureWritable(flags)
    const client = await createClient(flags)
    const chatID = await resolveChatID(client, flags.to, { pick: flags.pick })
    await printData(await sendMessage(client, { chatID, file: flags.file, fileName: flags['file-name'], mimeType: flags['mime-type'], replyTo: flags['reply-to'], text: flags.caption || '', wait: flags.wait, waitIntervalMs: flags['wait-interval'], waitTimeoutMs: flags['wait-timeout'] }), flags.json ? 'json' : 'human')
  }
}
