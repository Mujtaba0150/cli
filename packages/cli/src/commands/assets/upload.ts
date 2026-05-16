import { Args, Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../../lib/command.js'
import { createReadStream } from 'node:fs'
import { createClient } from '../../lib/client.js'
import { apiCopy, cliCopy, sdkParamCopy } from '../../lib/copy.js'
import { printData } from '../../lib/output.js'

export default class AssetsUpload extends BeeperCommand {
  static override summary = apiCopy.assets.upload
  static override args = {
    file: Args.string({ description: sdkParamCopy.attachmentFile, required: true }),
  }
  static override flags = {
    'file-name': Flags.string({ description: sdkParamCopy.fileName }),
    'mime-type': Flags.string({ description: sdkParamCopy.mimeType }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(AssetsUpload)
    ensureWritable(flags)
    const client = await createClient(flags)
    const result = await client.assets.upload({
      file: createReadStream(args.file),
      fileName: flags['file-name'],
      mimeType: flags['mime-type'],
    })
    await printData(result, flags.json ? 'json' : 'human')
  }
}
