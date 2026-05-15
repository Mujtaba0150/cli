import { Command, Flags } from '@oclif/core'
import { configPath } from '../../lib/config.js'

export default class ConfigPath extends Command {
  static override summary = 'Print the CLI config path'
  static override flags = {
    json: Flags.boolean({ default: false, description: 'Print JSON' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ConfigPath)
    const path = configPath()
    if (flags.json) {
      process.stdout.write(`${JSON.stringify({ path }, null, 2)}\n`)
      return
    }
    // Plain path so it's pipeable (xargs / cat / cd).
    process.stdout.write(`${path}\n`)
  }
}
