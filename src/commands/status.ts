import { Command, Flags } from '@oclif/core'
import { readConfig } from '../lib/config.js'
import { printData } from '../lib/output.js'
import { withSpinner } from '../lib/ui.js'

export default class Status extends Command {
  static override summary = 'Check Beeper Desktop API status'
  static override flags = {
    'base-url': Flags.string({ description: 'Beeper Desktop API base URL' }),
    debug: Flags.boolean({ default: false }),
    json: Flags.boolean({ default: false, description: 'Print JSON' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Status)
    const config = await readConfig()
    const baseURL = flags['base-url'] ?? config.baseURL
    const fetchInfo = async (): Promise<unknown> => {
      const response = await fetch(new URL('/v1/info', baseURL))
      if (!response.ok) throw new Error(`Beeper Desktop API returned ${response.status} ${response.statusText}`)
      return response.json()
    }
    const info = flags.json
      ? await fetchInfo()
      : await withSpinner(`Pinging Beeper Desktop at ${baseURL}…`, fetchInfo, {
        done: value => `Beeper Desktop v${(value as { version?: string }).version ?? '?'} reachable`,
      })
    await printData(info, flags.json ? 'json' : 'human')
  }
}
