import { Args } from '@oclif/core'
import { BeeperCommand } from '../../lib/command.js'
import { readConfig } from '../../lib/config.js'
import { printConfig, printData } from '../../lib/output.js'

export default class ConfigGet extends BeeperCommand {
  static override summary = 'Print CLI configuration'
  static override args = {
    key: Args.string({ description: 'Optional config key to print', options: ['baseURL', 'auth'], required: false }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ConfigGet)
    const config = await readConfig()
    const format = flags.json ? 'json' : 'human'
    if (args.key) {
      await printData(config[args.key as 'baseURL' | 'auth'], format)
      return
    }
    await printConfig(config as unknown as Record<string, unknown>, format)
  }
}
