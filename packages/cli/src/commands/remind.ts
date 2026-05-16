import { Args, Flags } from '@oclif/core'
import { BeeperCommand, ensureWritable } from '../lib/command.js'
import { createClient } from '../lib/client.js'
import { apiCopy, cliCopy, sdkParamCopy } from '../lib/copy.js'
import { printSuccess } from '../lib/output.js'
import { resolveChatID } from '../lib/resolve.js'

export default class Remind extends BeeperCommand {
  static override summary = apiCopy.reminders.create
  static override args = {
    chat: Args.string({ description: cliCopy.args.chatSelector, required: true }),
    when: Args.string({ description: sdkParamCopy.remindAt, required: true }),
  }
  static override flags = {
    'dismiss-on-message': Flags.boolean({ default: false, description: 'Cancel if someone messages in the chat' }),
    pick: Flags.integer({ description: cliCopy.flags.pick }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Remind)
    ensureWritable(flags)
    const client = await createClient(flags)
    const chatID = await resolveChatID(client, args.chat, { pick: flags.pick })
    await client.chats.reminders.create(chatID, {
      reminder: {
        dismissOnIncomingMessage: flags['dismiss-on-message'] || undefined,
        remindAt: args.when,
      },
    })
    await printSuccess({
      message: 'Reminder set',
      detail: args.when,
      data: { chatID, remindAt: args.when, dismissOnIncomingMessage: flags['dismiss-on-message'] },
    }, flags.json ? 'json' : 'human')
  }
}
