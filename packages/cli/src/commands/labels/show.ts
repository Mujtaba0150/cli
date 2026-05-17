import { Args } from '@oclif/core'
import { BeeperCommand } from '../../lib/command.js'
import { createClient } from '../../lib/client.js'
import { printData } from '../../lib/output.js'

export default class LabelsShow extends BeeperCommand {
  static override summary = 'Show details for one label'
  static override description = 'Requires server-side support for /v1/labels/{id}.'
  static override args = { id: Args.string({ required: true, description: 'Label ID' }) }
  async run(): Promise<void> {
    const { args, flags } = await this.parse(LabelsShow)
    const client = await createClient(flags)
    await printData(await client.get(`/v1/labels/${encodeURIComponent(args.id)}`), flags.json ? 'json' : 'human')
  }
}
