import { Command, Flags } from '@oclif/core'
import { spawnSync } from 'node:child_process'
import { createClient } from '../lib/client.js'
import { cliCopy } from '../lib/copy.js'

export default class Interactive extends Command {
  static override summary = 'Open the OpenTUI Beeper chat app'
  static override flags = {
    'base-url': Flags.string({ description: cliCopy.flags.baseURL }),
    debug: Flags.boolean({ default: false }),
  }

  async run(): Promise<void> {
    this.reexecWithBunIfNeeded()
    const { flags } = await this.parse(Interactive)
    const client = await createClient(flags)
    const { runInteractiveApp } = await import('../lib/interactive.js')
    await runInteractiveApp({ client })
  }

  private reexecWithBunIfNeeded(): void {
    if ((process.versions as Record<string, string | undefined>).bun || process.env.BEEPER_INTERACTIVE_BUN_REEXEC === '1') return
    const script = process.argv[1]
    if (!script) this.error('OpenTUI requires Bun for this command, but the current CLI entrypoint could not be resolved.')
    const result = spawnSync('bun', [script, ...process.argv.slice(2)], {
      env: {
        ...process.env,
        BEEPER_INTERACTIVE_BUN_REEXEC: '1',
      },
      stdio: 'inherit',
    })
    if (result.error) {
      this.error(`OpenTUI requires Bun for this command. Install Bun or run under a Node build with FFI support. ${result.error.message}`)
    }
    process.exit(result.status ?? (result.signal ? 1 : 0))
  }
}
