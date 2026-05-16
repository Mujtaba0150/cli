import { Args } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../lib/command.js'
import { createClient } from '../../lib/client.js'
import { apiCopy, cliCopy } from '../../lib/copy.js'
import { printData } from '../../lib/output.js'

export default class AssetsDownload extends BeeperCommand {
  static override summary = apiCopy.assets.download
  static override args = {
    url: Args.string({ description: 'Asset URL', required: true }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(AssetsDownload)
    ensureWritable(flags)
    const client = await createClient(flags)
    const result = await client.assets.download({ url: args.url })
    await printData(result, flags.json ? 'json' : 'human')
  }
}
