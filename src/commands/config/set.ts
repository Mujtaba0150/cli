import { Args } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../lib/command.js'
import { updateConfig } from '../../lib/config.js'
import { printSuccess } from '../../lib/output.js'

export default class ConfigSet extends BeeperCommand {
  static override summary = 'Set a CLI configuration value'
  static override args = {
    key: Args.string({ description: 'Config key to set', options: ['baseURL'], required: true }),
    value: Args.string({ description: 'Config value', required: true }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ConfigSet)
    ensureWritable(flags)
    await updateConfig(config => ({ ...config, [args.key]: args.value }))
    await printSuccess({
      message: `Set ${args.key}`,
      detail: args.value,
      data: { [args.key]: args.value },
    }, flags.json ? 'json' : 'human')
  }
}
