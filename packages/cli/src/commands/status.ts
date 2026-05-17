import { BeeperCommand } from '../lib/command.js'
import { evaluateReadiness } from '../lib/app-state.js'
import { resolveTarget } from '../lib/targets.js'
import { printData } from '../lib/output.js'
export default class Status extends BeeperCommand {
  static override summary = 'Print a snapshot of the selected target and readiness'
  static override description = 'Cheap, read-only snapshot. For active reachability checks and diagnostics, run `beeper doctor`.'
  async run(): Promise<void> {
    const { flags } = await this.parse(Status)
    const target = await resolveTarget({ target: flags.target, baseURL: flags['base-url'] })
    await printData({ target, readiness: await evaluateReadiness({ baseURL: target.baseURL, target: target.id }) }, flags.json ? 'json' : 'human')
  }
}
