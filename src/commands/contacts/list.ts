import { Args, Command, Flags } from '@oclif/core'
import { createClient } from '../../lib/client.js'
import { apiCopy, cliCopy } from '../../lib/copy.js'
import { collectPage, printData, printIDs } from '../../lib/output.js'
import { resolveAccountIDs } from '../../lib/resolve.js'

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
    const items = []
    for (const accountID of accountIDs) {
      const contacts = await collectPage(client.accounts.contacts.list(accountID, { query: flags.query }), flags.limit)
      items.push(...contacts.map(item => ({ ...(item as unknown as Record<string, unknown>), accountID })))
      if (items.length >= flags.limit) break
    }
    if (flags.ids) {
      printIDs(items)
      return
    }
    printData(flags.json ? { items } : items, flags.json ? 'json' : 'human')
  }
}
