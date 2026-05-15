import { Command, Flags } from '@oclif/core'
import { resetConfig } from '../../lib/config.js'
import { printSuccess } from '../../lib/output.js'

export default class ConfigReset extends Command {
  static override summary = 'Reset CLI configuration'
  static override flags = {
    json: Flags.boolean({ default: false, description: 'Print JSON' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ConfigReset)
    await resetConfig()
    await printSuccess({ message: 'Config reset' }, flags.json ? 'json' : 'human')
  }
}
