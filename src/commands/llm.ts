import { Command, Flags } from '@oclif/core'
import { commandManifest } from '../lib/manifest.js'
import { printCommands } from '../lib/output.js'

export default class LLM extends Command {
  static override summary = 'Print compact CLI help for agents'
  static override flags = {
    json: Flags.boolean({ default: false, description: 'Print JSON' }),
  }

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
