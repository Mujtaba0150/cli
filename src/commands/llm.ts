import { Command } from '@oclif/core'
import { commandManifest } from '../lib/manifest.js'

export default class LLM extends Command {
  static override summary = 'Print compact CLI help for agents'

  async run(): Promise<void> {
    this.log('Beeper CLI')
    this.log('Auth: beeper login')
    this.log('Output: most commands accept --json; list commands accept --limit where useful.')
    this.log('Common:')
    for (const item of commandManifest) this.log(`- beeper ${item.command}: ${item.description}`)
  }
}
