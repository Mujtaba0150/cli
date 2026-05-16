import { BeeperCommand } from '../lib/command.js'
import { commandManifest } from '../lib/manifest.js'
import { printCommands } from '../lib/output.js'

export default class LLM extends BeeperCommand {
  static override summary = 'Print compact CLI help for agents'

  async run(): Promise<void> {
    const { flags } = await this.parse(LLM)
    await printCommands(commandManifest, flags.json ? 'json' : 'human', {
      title: 'Beeper CLI',
      intro: [
        'Auth: beeper login',
        'Most commands accept --json. List commands accept --limit.',
      ],
    })
  }
}
