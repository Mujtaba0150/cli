import { BeeperCommand } from '../lib/command.js'
import { commandManifest } from '../lib/manifest.js'
import { printData } from '../lib/output.js'

export default class Commands extends BeeperCommand {
  static override summary = 'Print the Beeper CLI command manifest'

  async run(): Promise<void> {
    const { flags } = await this.parse(Commands)
    await printData(commandManifest, flags.json ? 'json' : 'human')
  }
}
