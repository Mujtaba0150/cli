import { Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../lib/command.js'
import { installPathSetup, type ShellName } from '../../lib/env.js'
import { printSuccess } from '../../lib/output.js'

export default class EnvInstall extends BeeperCommand {
  static override summary = 'Add Beeper CLI-managed tools to your shell PATH'
  static override flags = {
    shell: Flags.string({ options: ['sh', 'fish'], description: 'Shell config to update' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(EnvInstall)
    ensureWritable(flags)
    const result = await installPathSetup(flags.shell as ShellName | undefined)
    await printSuccess({
      message: result.changed ? `Updated ${result.path}` : `${result.path} already includes Beeper tools`,
      detail: result.line,
      data: result,
    }, flags.json ? 'json' : 'human')
  }
}
