import { Args, Command, Flags } from '@oclif/core'
import { createClient } from '../../lib/client.js'
import { apiCopy, cliCopy, sdkParamCopy } from '../../lib/copy.js'
import { collectPage, printData, printIDs } from '../../lib/output.js'
import { resolveAccountIDs, resolveChatID } from '../../lib/resolve.js'

export default class MessagesSearch extends Command {
  static override summary = apiCopy.messages.search
  static override args = {
    query: Args.string({ description: sdkParamCopy.searchQuery, required: false }),
  }
  static override flags = {
    account: Flags.string({ multiple: true, description: `Limit to ${cliCopy.args.accountSelector}` }),
    'base-url': Flags.string({ description: cliCopy.flags.baseURL }),
    chat: Flags.string({ multiple: true, description: `Limit to ${cliCopy.args.chatSelector}` }),
    'chat-type': Flags.string({ options: ['group', 'single'], description: 'Limit to group chats or direct messages' }),
    'date-after': Flags.string({ description: 'Only messages after this ISO timestamp' }),
    'date-before': Flags.string({ description: 'Only messages before this ISO timestamp' }),
    debug: Flags.boolean({ default: false }),
    'exclude-low-priority': Flags.boolean({ allowNo: true, description: 'Exclude low-priority chats. Use --no-exclude-low-priority to include all.' }),
    ids: Flags.boolean({ default: false, description: 'Print only message IDs' }),
    'include-muted': Flags.boolean({ allowNo: true, description: 'Include muted chats. Use --no-include-muted for a tighter search.' }),
    json: Flags.boolean({ default: false, description: cliCopy.flags.json }),
    limit: Flags.integer({ default: 50, description: 'Maximum messages to print' }),
    media: Flags.string({ multiple: true, options: ['any', 'video', 'image', 'link', 'file'], description: 'Filter by media type. Repeat for more types.' }),
    sender: Flags.string({ description: 'me, others, or a user ID' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(MessagesSearch)
    const client = await createClient(flags)
    const accountIDs = await resolveAccountIDs(client, flags.account, { allowMultiplePerInput: true })
    const chatIDs = flags.chat?.length
      ? await Promise.all(flags.chat.map(chat => resolveChatID(client, chat, { accountIDs })))
      : undefined
    const items = await collectPage(client.messages.search({
      accountIDs,
      chatIDs,
      chatType: flags['chat-type'] as 'group' | 'single' | undefined,
      dateAfter: flags['date-after'],
      dateBefore: flags['date-before'],
      excludeLowPriority: flags['exclude-low-priority'],
      includeMuted: flags['include-muted'],
      mediaTypes: flags.media as Array<'any' | 'video' | 'image' | 'link' | 'file'> | undefined,
      query: args.query,
      sender: flags.sender as 'me' | 'others' | (string & {}) | undefined,
    }), flags.limit)
    if (flags.ids) {
      printIDs(items)
      return
    }
    printData(items, flags.json ? 'json' : 'human')
  }
}
