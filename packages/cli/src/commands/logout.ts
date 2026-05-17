import { BeeperCommand, ensureWritable } from '../lib/command.js'
import { clearTargetAuth, resolveTarget } from '../lib/targets.js'
import { printSuccess } from '../lib/output.js'

export default class Logout extends BeeperCommand {
  static override summary = 'Remove the locally stored Beeper Desktop token'

  async run(): Promise<void> {
    const { flags } = await this.parse(Logout)
    ensureWritable(flags)
    const target = await resolveTarget({ target: flags.target, baseURL: flags['base-url'] })
    const token = target.auth?.accessToken
    let revoked = false
    if (token) {
      const response = await fetch(new URL('/oauth/revoke', target.baseURL), {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token, token_type_hint: 'access_token' }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => undefined)
      revoked = Boolean(response?.ok)
    }
    if (token) await clearTargetAuth(target)
    await printSuccess({
      message: 'Logged out',
      detail: revoked ? 'token revoked on server' : token ? 'local token cleared (server revoke failed silently)' : 'no token was stored',
      data: { revoked, hadToken: Boolean(token) },
    }, flags.json ? 'json' : 'human')
  }
}
