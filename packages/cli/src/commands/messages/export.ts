import { writeFile } from 'node:fs/promises'
import { Flags } from '@oclif/core'
import { BeeperCommand } from '../../lib/command.js'
import { createClient } from '../../lib/client.js'
import { resolveChatID } from '../../lib/resolve.js'

export default class MessagesExport extends BeeperCommand {
  static override summary = 'Export one chat\'s messages to JSON'
  static override description = 'Lightweight per-chat export. For a full multi-chat export with transcripts and attachments use `beeper export`.'
  static override flags = {
    chat: Flags.string({ required: true, description: 'Chat selector (ID, local ID, title, or search text)' }),
    pick: Flags.integer({ description: 'Pick the Nth chat when --chat is ambiguous' }),
    after: Flags.string({ description: 'Only messages after this ISO timestamp' }),
    before: Flags.string({ description: 'Only messages before this ISO timestamp' }),
    limit: Flags.integer({ description: 'Maximum messages to export' }),
    output: Flags.string({ char: 'o', default: '-', description: 'Output path; - writes JSON to stdout' }),
    asc: Flags.boolean({ default: false, description: 'Order oldest first (default: newest first)' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(MessagesExport)
    if (flags.after && flags.before) throw new Error('Use only one of --after or --before')
    const client = await createClient(flags)
    const chatID = await resolveChatID(client, flags.chat, { pick: flags.pick })
    const cursor = flags.before ?? flags.after
    const direction = flags.before ? 'before' : flags.after ? 'after' : undefined
    const items: unknown[] = []
    for await (const item of client.messages.list(chatID, { cursor, direction })) {
      items.push(item)
      if (flags.limit !== undefined && items.length >= flags.limit) break
    }
    const messages = flags.asc ? [...items].reverse() : items
    const envelope = {
      exportedAt: new Date().toISOString(),
      chatID,
      after: flags.after,
      before: flags.before,
      count: messages.length,
      messages,
    }
    const text = `${JSON.stringify(envelope, null, 2)}\n`
    if (flags.output === '-') process.stdout.write(text)
    else await writeFile(flags.output, text)
  }
}
