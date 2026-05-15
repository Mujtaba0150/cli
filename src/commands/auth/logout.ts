import { Command, Flags } from '@oclif/core'
import { readConfig, updateConfig } from '../../lib/config.js'
import { printSuccess } from '../../lib/output.js'

export default class AuthLogout extends Command {
  static override summary = 'Remove the locally stored Beeper Desktop token'
  static override flags = {
    json: Flags.boolean({ default: false, description: 'Print JSON' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(AuthLogout)
    const config = await readConfig()
    const token = config.auth?.accessToken
    let revoked = false
    if (token) {
      const response = await fetch(new URL('/oauth/revoke', config.baseURL), {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token, token_type_hint: 'access_token' }),
      }).catch(() => undefined)
      revoked = Boolean(response?.ok)
    }
    await updateConfig(current => ({ ...current, auth: undefined }))
    await printSuccess({
      message: 'Logged out',
      detail: revoked ? 'token revoked on server' : token ? 'local token cleared (server revoke failed silently)' : 'no token was stored',
      data: { revoked, hadToken: Boolean(token) },
    }, flags.json ? 'json' : 'human')
  }
}
