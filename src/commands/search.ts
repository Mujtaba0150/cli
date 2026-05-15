import { Args, Command, Flags } from '@oclif/core'
import { createClient } from '../lib/client.js'
import { printData } from '../lib/output.js'
import { withSpinner } from '../lib/ui.js'

export default class Search extends Command {
  static override summary = 'Search chats and messages'
  static override args = {
    query: Args.string({ description: 'Literal search query', required: true }),
  }
  static override flags = {
    'base-url': Flags.string({ description: 'Beeper Desktop API base URL' }),
    debug: Flags.boolean({ default: false }),
    json: Flags.boolean({ default: false, description: 'Print JSON' }),
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
