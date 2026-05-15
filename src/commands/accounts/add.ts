import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { Args, Command, Flags } from '@oclif/core'
import type { BridgeAvailability } from '@beeper/desktop-api/resources/bridges.js'
import type { AuthListFlowsResponse } from '@beeper/desktop-api/resources/matrix/bridges/auth.js'
import { createClient } from '../../lib/client.js'
import { printAccountLoginStep, runGuidedAccountLogin } from '../../lib/account-login.js'
import { printData } from '../../lib/output.js'

type AccountType = BridgeAvailability

export default class AccountsAdd extends Command {
  static override summary = 'Add a Beeper account'
  static override args = {
    account: Args.string({ description: 'Account type to add, for example WhatsApp, Discord, or local-whatsapp' }),
  }
  static override flags = {
    'base-url': Flags.string({ description: 'Beeper Desktop API base URL' }),
    cookie: Flags.string({ description: 'Cookie value for non-interactive login, in name=value form. Repeat for multiple cookies.', multiple: true }),
    debug: Flags.boolean({ default: false }),
    field: Flags.string({ description: 'Field value for non-interactive login, in id=value form. Repeat for multiple fields.', multiple: true }),
    flow: Flags.string({ description: 'Login flow ID. If omitted, Desktop chooses the default flow.' }),
    guided: Flags.boolean({ default: true, allowNo: true, description: 'Prompt through login steps until completion' }),
    json: Flags.boolean({ default: false, description: 'Print JSON' }),
    'login-id': Flags.string({ description: 'Existing login ID to re-login as' }),
    'non-interactive': Flags.boolean({ default: false, description: 'Do not prompt; require --flow, --field, and --cookie values when needed.' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(AccountsAdd)
    const client = await createClient(flags)

    if (!args.account) {
      const bridges = await client.bridges.list()
      if (flags.json) {
        await printData(bridges, 'json')
        return
      }

      printAvailableAccounts(bridges.items)
      return
    }

    const bridges = await client.bridges.list()
    const accountType = resolveAccountType(bridges.items, args.account)
    if (accountType.status !== 'available') {
      const suffix = accountType.statusText ? `: ${accountType.statusText}` : ''
      throw new Error(`${accountType.displayName} is not available${suffix}`)
    }

    let flowID = flags.flow
    if (!flowID) {
      const flows = await client.matrix.bridges.auth.listFlows(accountType.bridgeID)
      const loginFlows = flows.flows ?? []
      if (loginFlows.length > 1 && flags['non-interactive']) throw new Error(`Multiple sign-in methods are available for ${accountType.displayName}. Pass --flow.`)
      flowID = loginFlows.length > 1 && flags.guided && !flags.json
        ? await chooseLoginFlow(loginFlows)
        : loginFlows[0]?.id
      if (!flowID) throw new Error(`No login flows returned for ${accountType.displayName}.`)
      if (!flags.json && loginFlows.length > 1) this.log(`Using flow ${flowID}`)
    }

    const step = await client.matrix.bridges.auth.startLogin(flowID, {
      bridgeID: accountType.bridgeID,
      login_id: flags['login-id'],
    })
    const result = flags.guided ? await runGuidedAccountLogin(client, accountType.bridgeID, step, {
      cookies: parseKeyValueFlags(flags.cookie, '--cookie'),
      fields: parseKeyValueFlags(flags.field, '--field'),
      nonInteractive: flags['non-interactive'],
    }) : step
    if (flags.json) await printData(result, 'json')
    else if (!flags.guided) printAccountLoginStep(result)
    else if ('complete' in result) this.log('Account was connected successfully!')
  }
}

function printAvailableAccounts(items: AccountType[]): void {
  const sections: Array<[string, AccountType[]]> = [
    ['On-Device Accounts', items.filter(item => item.bridgeProvider === 'local')],
    ['Beeper Cloud Accounts', items.filter(item => item.bridgeProvider === 'cloud')],
    ['Self-Hosted Accounts', items.filter(item => item.bridgeProvider === 'self-hosted')],
  ]

  for (const [title, accounts] of sections) {
    if (!accounts.length) continue
    process.stdout.write(`${title}\n`)
    for (const account of accounts) {
      const status = account.statusText ?? statusLabel(account)
      process.stdout.write(`  ${account.displayName} (${account.bridgeID})${status ? ` - ${status}` : ''}\n`)
    }
    process.stdout.write('\n')
  }
}

function resolveAccountType(items: AccountType[], input: string): AccountType {
  const normalizedInput = normalize(input)
  const exact = items.filter(item => [
    item.bridgeID,
    item.displayName,
    item.network,
    item.bridgeType,
  ].some(value => normalize(value) === normalizedInput))

  if (exact.length === 1) return exact[0]!
  if (exact.length > 1) throw ambiguousAccountType(input, exact)

  const partial = items.filter(item => [
    item.bridgeID,
    item.displayName,
    item.network,
    item.bridgeType,
  ].some(value => normalize(value).includes(normalizedInput)))

  if (partial.length === 1) return partial[0]!
  if (partial.length > 1) throw ambiguousAccountType(input, partial)
  throw new Error(`Unknown account type ${input}. Run \`beeper accounts add\` to list available account types.`)
}

function ambiguousAccountType(input: string, matches: AccountType[]): Error {
  const options = matches.map(item => `${item.displayName} (${item.bridgeID})`).join(', ')
  return new Error(`Account type ${input} is ambiguous. Use one of: ${options}`)
}

function statusLabel(account: AccountType): string | undefined {
  if (account.status === 'available') return undefined
  if (account.status === 'connected') return `${account.displayName} Connected`
  return account.status.replaceAll('_', ' ')
}

function normalize(value: string | undefined): string {
  return (value ?? '').toLowerCase().replaceAll(/[^a-z0-9]+/g, '')
}

function parseKeyValueFlags(values: string[] | undefined, flagName: string): Record<string, string> {
  const parsed: Record<string, string> = {}
  for (const value of values ?? []) {
    const equalsIndex = value.indexOf('=')
    if (equalsIndex <= 0) throw new Error(`${flagName} must use name=value form.`)
    parsed[value.slice(0, equalsIndex)] = value.slice(equalsIndex + 1)
  }

  return parsed
}

async function chooseLoginFlow(flows: NonNullable<AuthListFlowsResponse['flows']>): Promise<string> {
  process.stdout.write('Choose how you want to sign in:\n')
  flows.forEach((flow, index) => {
    const description = flow.description ? ` - ${flow.description}` : ''
    process.stdout.write(`  ${index + 1}. ${flow.name}${description}\n`)
  })

  const rl = createInterface({ input, output })
  try {
    for (;;) {
      const answer = (await rl.question('Select a sign-in method: ')).trim()
      const selected = Number.parseInt(answer, 10)
      if (Number.isInteger(selected) && selected >= 1 && selected <= flows.length) return flows[selected - 1]!.id
      const byID = flows.find(flow => flow.id === answer)
      if (byID) return byID.id
      process.stdout.write('Choose one of the listed sign-in methods.\n')
    }
  } finally {
    rl.close()
  }
}
