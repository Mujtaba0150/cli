import { Args, Command, Flags } from '@oclif/core'
import { createClient } from '../../lib/client.js'
import { apiCopy, cliCopy } from '../../lib/copy.js'
import { collectPage, printData, printIDs, printList } from '../../lib/output.js'
import { resolveAccountIDs } from '../../lib/resolve.js'
import { withSpinner } from '../../lib/ui.js'

export default class ContactsList extends Command {
  static override summary = apiCopy.contacts.list
  static override args = {
    account: Args.string({ description: cliCopy.args.accountSelector, required: true }),
  }

  static override flags = {
    'base-url': Flags.string({ description: cliCopy.flags.baseURL }),
    debug: Flags.boolean({ default: false }),
    ids: Flags.boolean({ default: false, description: 'Print only contact user IDs' }),
    json: Flags.boolean({ default: false, description: cliCopy.flags.json }),
    limit: Flags.integer({ default: 50, description: 'Maximum contacts to print' }),
    query: Flags.string({ description: 'Optional blended contact lookup query' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ContactsList)
    const client = await createClient(flags)
    const accountIDs = await resolveAccountIDs(client, [args.account], { allowMultiplePerInput: true }) ?? [args.account]
    const useSpinner = !flags.json && !flags.ids
    const load = async (): Promise<Array<Record<string, unknown>>> => {
      const collected: Array<Record<string, unknown>> = []
      for (const accountID of accountIDs) {
        const contacts = await collectPage(client.accounts.contacts.list(accountID, { query: flags.query }), flags.limit)
        collected.push(...contacts.map(item => ({ ...(item as unknown as Record<string, unknown>), accountID })))
        if (collected.length >= flags.limit) break
      }
      return collected
    }
    const items = useSpinner
      ? await withSpinner(`Loading contacts${flags.query ? ` matching "${flags.query}"` : ''}…`, load, {
        done: value => `${value.length} contact${value.length === 1 ? '' : 's'}`,
      })
      : await load()
    if (flags.ids) {
      printIDs(items)
      return
    }
    if (flags.json) {
      await printData({ items }, 'json')
      return
    }
    await printList(items, 'human', {
      title: 'No contacts found',
      subtitle: flags.query ? `Nothing matched "${flags.query}".` : 'This account has no contacts to list.',
      suggestions: [
        { command: `beeper contacts ${args.account} <query>`, hint: 'narrow with a search' },
        { command: 'beeper accounts', hint: 'check the account is online' },
      ],
    })
  }
}
