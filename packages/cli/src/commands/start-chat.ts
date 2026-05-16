import { Args, Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../lib/command.js'
import { createClient } from '../lib/client.js'
import { apiCopy, cliCopy } from '../lib/copy.js'
import { printData } from '../lib/output.js'
import { listAccountIDs, resolveAccountIDs, userQueryFromInput } from '../lib/resolve.js'

export default class StartChat extends BeeperCommand {
  static override summary = apiCopy.chats.start
  static override args = {
    query: Args.string({ description: 'Phone, email, username, user ID, or name', required: false }),
  }
  static override flags = {
    account: Flags.string({ multiple: true, description: `${cliCopy.args.accountSelector}. Omit to try every account.` }),
    'allow-invite': Flags.boolean({ default: false, description: 'Allow invite-based DM creation when required' }),
    email: Flags.string({ description: 'Email address' }),
    id: Flags.string({ description: 'Known user ID' }),
    message: Flags.string({ description: 'Optional first message' }),
    name: Flags.string({ description: 'Display name hint' }),
    phone: Flags.string({ description: 'Phone number' }),
    username: Flags.string({ description: 'Username' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(StartChat)
    ensureWritable(flags)
    const client = await createClient(flags)
    const accountIDs = await resolveAccountIDs(client, flags.account, { allowMultiplePerInput: true }) ?? await listAccountIDs(client)
    const user: Record<string, string> = args.query ? userQueryFromInput(args.query) : {}
    if (flags.email) user.email = flags.email
    if (flags.name) user.fullName = flags.name
    if (flags.id) user.id = flags.id
    if (flags.phone) user.phoneNumber = flags.phone
    if (flags.username) user.username = flags.username
    if (Object.keys(user).length === 0) {
      throw new Error('Provide a query or at least one of: --email, --id, --phone, --username, --name')
    }
    const result = await tryStartChat(client, accountIDs, {
      allowInvite: flags['allow-invite'] || undefined,
      messageText: flags.message,
      user,
    })
    await printData(result, flags.json ? 'json' : 'human')
  }
}

async function tryStartChat(client: any, accountIDs: string[], body: Record<string, unknown>) {
  const failures: string[] = []
  for (const accountID of accountIDs) {
    try {
      return await client.chats.start({ ...body, accountID })
    } catch (error) {
      failures.push(`${accountID}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  throw new Error(`No account could start this chat:\n${failures.map(failure => `  - ${failure}`).join('\n')}`)
}
