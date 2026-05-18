import { Args, Command, Flags } from '@oclif/core'

export default class Completion extends Command {
  static override summary = 'Print shell completion setup (alias for autocomplete)'
  static override description = 'Same as `beeper autocomplete`: prints setup instructions and the generated completion script for the requested shell. Use `eval` or redirect to a shell init file as documented.'
  static override args = {
    shell: Args.string({ description: 'Shell to set up (bash, zsh, fish, or powershell)', required: false }),
  }
  static override flags = {
    'refresh-cache': Flags.boolean({ char: 'r', default: false, description: 'Refresh the autocomplete cache before printing setup' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Completion)
    const argv: string[] = []
    if (args.shell) argv.push(args.shell)
    if (flags['refresh-cache']) argv.push('--refresh-cache')
    await this.config.runCommand('autocomplete', argv)
  }
}
