import { Command, Flags } from '@oclif/core'
import { createClient } from '../../lib/client.js'
import { apiCopy, cliCopy } from '../../lib/copy.js'
import { collectPage, printIDs, printList } from '../../lib/output.js'
import { resolveAccountIDs } from '../../lib/resolve.js'
import { withSpinner } from '../../lib/ui.js'

export default class ChatsIndex extends Command {
  static override summary = apiCopy.chats.list
  static override flags = {
    account: Flags.string({ multiple: true, description: `Limit to ${cliCopy.args.accountSelector}` }),
    'base-url': Flags.string({ description: cliCopy.flags.baseURL }),
    debug: Flags.boolean({ default: false }),
    ids: Flags.boolean({ default: false, description: 'Print only chat IDs' }),
    json: Flags.boolean({ default: false, description: cliCopy.flags.json }),
    limit: Flags.integer({ default: 20, description: 'Maximum chats to print' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ChatsIndex)
    const client = await createClient(flags)
    const accountIDs = await resolveAccountIDs(client, flags.account, { allowMultiplePerInput: true })
    const useSpinner = !flags.json && !flags.ids
    const items = useSpinner
      ? await withSpinner('Loading chats…', () => collectPage(client.chats.list({ accountIDs }), flags.limit), {
        done: value => `${value.length} chat${value.length === 1 ? '' : 's'}`,
      })
      : await collectPage(client.chats.list({ accountIDs }), flags.limit)
    if (flags.ids) {
      printIDs(items)
      return
    }
    printList(items, flags.json ? 'json' : 'human', {
      title: 'No chats yet',
      subtitle: accountIDs?.length ? 'Try another account, or check your filters.' : 'Connect an account or sync your existing ones.',
      suggestions: [
        { command: 'beeper accounts', hint: 'list connected accounts' },
        { command: 'beeper accounts add', hint: 'add a new account' },
        { command: 'beeper status', hint: 'verify Desktop is reachable' },
      ],
    })
  }
}
