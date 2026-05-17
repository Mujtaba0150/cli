import { Args, Flags } from '@oclif/core'
import { BeeperCommand } from '../../lib/command.js'
import { createClient } from '../../lib/client.js'
import { apiCopy, cliCopy, sdkParamCopy } from '../../lib/copy.js'
import { collectPage, printIDs, printList } from '../../lib/output.js'
import { resolveAccountIDs, resolveChatID } from '../../lib/resolve.js'
import { withInkSpinner as withSpinner } from '../../lib/ink/spinner.js'

export default class MessagesSearch extends BeeperCommand {
  static override summary = 'Search messages across chats'
  static override description = apiCopy.messages.search
  static override args = {
    query: Args.string({ description: sdkParamCopy.searchQuery, required: false }),
  }
  static override flags = {
    account: Flags.string({ multiple: true, description: `Limit to ${cliCopy.args.accountSelector}` }),
    chat: Flags.string({ multiple: true, description: `Limit to ${cliCopy.args.chatSelector}` }),
    'chat-type': Flags.string({ options: ['group', 'single'], description: 'Limit to group chats or direct messages' }),
    after: Flags.string({ description: 'Only messages at or after this ISO timestamp' }),
    before: Flags.string({ description: 'Only messages at or before this ISO timestamp' }),
    'exclude-low-priority': Flags.boolean({ allowNo: true, description: 'Exclude low-priority chats. Use --no-exclude-low-priority to include all.' }),
    ids: Flags.boolean({ default: false, description: 'Print only message IDs' }),
    'include-muted': Flags.boolean({ allowNo: true, default: true, description: 'Include muted chats. Use --no-include-muted for a tighter search.' }),
    limit: Flags.integer({ default: 50, description: 'Maximum messages to print' }),
    media: Flags.string({ multiple: true, options: ['any', 'video', 'image', 'link', 'file'], description: 'Filter by media type. Repeat for more types.' }),
    sender: Flags.string({ description: 'me, others, or a user ID' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(MessagesSearch)
    const hasFilter = Boolean(
      flags.account?.length || flags.chat?.length || flags['chat-type']
      || flags.after || flags.before || flags.media?.length
      || flags.sender,
    )
    if (!args.query && !hasFilter) {
      throw new Error('Provide a search query or at least one filter flag (e.g. --chat, --sender, --media, --date-after).')
    }
    const client = await createClient(flags)
    const accountIDs = await resolveAccountIDs(client, flags.account, { allowMultiplePerInput: true })
    const chatIDs = flags.chat?.length
      ? await Promise.all(flags.chat.map(chat => resolveChatID(client, chat, { accountIDs })))
      : undefined
    const params = {
      accountIDs,
      chatIDs,
      chatType: flags['chat-type'] as 'group' | 'single' | undefined,
      dateAfter: flags.after,
      dateBefore: flags.before,
      excludeLowPriority: flags['exclude-low-priority'],
      includeMuted: flags['include-muted'],
      mediaTypes: flags.media as Array<'any' | 'video' | 'image' | 'link' | 'file'> | undefined,
      query: args.query,
      sender: flags.sender as 'me' | 'others' | (string & {}) | undefined,
    }
    const useSpinner = !flags.json && !flags.ids
    const label = args.query ? `Searching messages for "${args.query}"…` : 'Searching messages…'
    const items = useSpinner
      ? await withSpinner(label, () => collectPage(client.messages.search(params), flags.limit), {
        done: value => `${value.length} match${value.length === 1 ? '' : 'es'}`,
      })
      : await collectPage(client.messages.search(params), flags.limit)
    if (flags.ids) {
      printIDs(items)
      return
    }
    await printList(items, flags.json ? 'json' : 'human', {
      title: 'No messages matched',
      subtitle: args.query ? `Nothing found for "${args.query}".` : 'Try a different filter combination.',
      suggestions: [
        { command: 'beeper messages <chatID>', hint: 'list messages from a chat' },
        { command: 'beeper search "<term>"', hint: 'search chats + messages' },
      ],
    })
  }
}
