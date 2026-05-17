import { BeeperCommand } from '../../../lib/command.js'
import { listTargets, readConfig } from '../../../lib/targets.js'
import { printData } from '../../../lib/output.js'

export default class DesktopProfiles extends BeeperCommand {
  static override summary = 'List Beeper Desktop profiles'

  async run(): Promise<void> {
    const { flags } = await this.parse(DesktopProfiles)
    const config = await readConfig()
    const targets = (await listTargets()).filter(target => target.type === 'desktop')
    const profiles = [
      { default: !config.defaultTarget || config.defaultTarget === 'desktop', id: 'desktop', name: 'Default', managedBy: 'Beeper Desktop', url: 'auto' },
      ...targets.map(target => ({
        default: config.defaultTarget === target.id,
        id: target.id,
        name: target.name ?? target.id,
        managedBy: 'Beeper CLI',
        url: target.baseURL,
        dataDir: target.dataDir,
      })),
    ]
    await printData(profiles, flags.json ? 'json' : 'human')
  }
}
