import { BeeperCommand } from '../../lib/command.js'
import { createClient } from '../../lib/client.js'
import { printList } from '../../lib/output.js'

export default class LabelsList extends BeeperCommand {
  static override summary = 'List Beeper chat labels'
  static override description = 'Requires server-side support for /v1/labels.'
  async run(): Promise<void> {
    const { flags } = await this.parse(LabelsList)
    const client = await createClient(flags)
    const response = await client.get('/v1/labels') as { items?: unknown[] } | unknown[]
    const items = (Array.isArray(response) ? response : response.items ?? []) as Array<Record<string, unknown>>
    await printList(items, flags.json ? 'json' : 'human', { title: 'No labels', subtitle: 'Create labels in Beeper Desktop.' })
  }
}
