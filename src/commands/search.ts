import { Args } from '@oclif/core'
import { BeeperCommand } from '../lib/command.js'
import { createClient } from '../lib/client.js'
import { printData } from '../lib/output.js'
import { withInkSpinner as withSpinner } from '../lib/ink/spinner.js'

export default class Search extends BeeperCommand {
  static override summary = 'Search chats and messages'
  static override args = {
    query: Args.string({ description: 'Literal search query', required: true }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Search)
    const client = await createClient(flags)
    const result = flags.json
      ? await client.search({ query: args.query })
      : await withSpinner(`Searching for "${args.query}"…`, () => client.search({ query: args.query }), {
        done: value => {
          const r = value as { chats?: unknown[]; messages?: unknown[] }
          const chats = r.chats?.length ?? 0
          const messages = r.messages?.length ?? 0
          return `${chats} chat${chats === 1 ? '' : 's'}, ${messages} message${messages === 1 ? '' : 's'}`
        },
      })
    await printData(result, flags.json ? 'json' : 'human')
  }
}
