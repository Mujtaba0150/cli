import { Flags } from '@oclif/core'
import { BeeperDesktop } from '@beeper/desktop-api'
import type { LoginResponseResponse } from '@beeper/desktop-api/resources/app/login'
import { BeeperCommand, ensureWritable, writeEvent } from '../lib/command.js'
import { evaluateReadiness } from '../lib/app-state.js'
import { ensureDesktopToken, findLocalDesktop } from '../lib/desktop-auth.js'
import { promptYesNo } from '../lib/app-api.js'
import { launchDesktopApp } from '../lib/profiles.js'
import { readTarget, saveTargetAuth, updateConfig, writeTarget, type Target } from '../lib/targets.js'
import { printData, printSuccess } from '../lib/output.js'

export default class Setup extends BeeperCommand {
  static override summary = 'Make the selected target ready'
  static override flags = {
    install: Flags.boolean({ default: false, description: 'Allow installing missing managed runtime' }),
    email: Flags.string({ description: 'Email address for first-run sign-in' }),
    code: Flags.string({ description: 'Email sign-in code for a pending setup login' }),
    username: Flags.string({ description: 'Username to create when the account is new' }),
    'accept-terms': Flags.boolean({ default: false, description: 'Accept Terms of Use when creating a new account' }),
  }
  async run(): Promise<void> {
    const { flags } = await this.parse(Setup)
    ensureWritable(flags)
    let target: Target | undefined
    if (flags['base-url']) {
      const stored = await readTarget('custom')
      target = stored?.baseURL === flags['base-url'] ? stored : { id: 'custom', type: 'desktop', baseURL: flags['base-url'] }
    }
    else if (flags.target) target = flags.target === 'personal' ? undefined : await readTarget(flags.target)
    if (!target) {
      const desktop = await findLocalDesktop({ scan: true, timeoutMs: 300 }).catch(() => undefined)
      target = { id: 'personal', type: 'desktop', name: 'Desktop', baseURL: desktop?.baseURL ?? 'http://127.0.0.1:23373', managed: true, runtime: { install: 'desktop', port: 23373 } }
      await writeTarget(target)
      await updateConfig(config => ({ ...config, defaultTarget: target!.id }))
    }
    if (flags.events) writeEvent('setup_step', { step: 'readiness', target: target.id })
    const readiness = await evaluateSetupReadiness(target, flags)
    if (flags.email) {
      if (flags.code) throw new Error('Run `beeper setup --email ...` first, then run `beeper setup --code ...` after the email arrives.')
      if (flags.events) writeEvent('setup_step', { step: 'login-email', target: target.id })
      const login = await startLogin(target, { email: flags.email, username: flags.username })
      await printData({ target: login.target, login: login.data, readiness }, flags.json ? 'json' : 'human')
      return
    }
    if (flags.code || flags['accept-terms']) {
      if (flags.events) writeEvent('setup_step', { step: 'login', target: target.id })
      const { accessToken, ...login } = await continueLogin(target, {
        acceptTerms: flags['accept-terms'],
        code: flags.code,
        username: flags.username,
      })
      const nextReadiness = await evaluateReadiness({ baseURL: target.baseURL, target: target.id, token: accessToken })
      await printData({ target, login, readiness: nextReadiness }, flags.json ? 'json' : 'human')
      return
    }
    if (flags.json || !process.stdin.isTTY) {
      await printData({ target, readiness }, flags.json ? 'json' : 'human')
      return
    }
    await printSuccess({ message: readiness.state === 'ready' ? 'Target ready' : `Setup paused: ${readiness.state}`, detail: readiness.message, data: { target, readiness } }, flags.json ? 'json' : 'human')
  }
}

async function evaluateSetupReadiness(target: Target, flags: { json?: boolean; yes?: boolean; events?: boolean }) {
  let readiness = await evaluateReadiness({ baseURL: target.baseURL, target: target.id })
  if (isUnauthorizedReadiness(readiness)) {
    if (flags.events) writeEvent('setup_step', { step: 'authorize', target: target.id })
    const token = await ensureDesktopToken({ baseURL: target.baseURL, scan: target.type === 'desktop' })
    readiness = await evaluateReadiness({ baseURL: target.baseURL, target: target.id, token })
  }
  if (readiness.state === 'target-unreachable') return offerLaunchAndRecheck(target, flags, readiness)
  return readiness
}

async function offerLaunchAndRecheck(
  target: Target,
  flags: { json?: boolean; yes?: boolean; events?: boolean },
  readiness: Awaited<ReturnType<typeof evaluateReadiness>>,
) {
  if (target.type !== 'desktop' || flags.json || !process.stdin.isTTY) return readiness
  const shouldLaunch = flags.yes || await promptYesNo('Beeper Desktop is not reachable. Launch it now?')
  if (!shouldLaunch) return readiness
  if (flags.events) writeEvent('setup_step', { step: 'launch', target: target.id })
  await launchDesktopApp(target)
  return {
    ...readiness,
    message: `Launched Beeper Desktop. Wait for it to finish starting, then rerun: beeper setup${target.id === 'desktop' || target.id === 'personal' ? '' : ` -t ${target.id}`}`,
  }
}

function isUnauthorizedReadiness(readiness: Awaited<ReturnType<typeof evaluateReadiness>>): boolean {
  return readiness.state === 'target-unreachable' && /\b401\b|unauthori[sz]ed|invalid or missing token/i.test(readiness.message ?? '')
}

async function startLogin(target: Target, options: { email: string; username?: string }) {
  const client = new BeeperDesktop({ baseURL: target.baseURL, accessToken: '' })
  const start = await client.app.login.start()
  await client.app.login.email({ setupRequestID: start.setupRequestID, email: options.email })
  const nextTarget: Target = {
    ...target,
    setup: {
      ...target.setup,
      login: {
        createdAt: new Date().toISOString(),
        email: options.email,
        setupRequestID: start.setupRequestID,
        username: options.username,
      },
    },
  }
  await writeTarget(nextTarget)
  return {
    target: nextTarget,
    data: {
      email: options.email,
      state: 'login-in-progress',
      next: 'Run `beeper setup --code <code>` after the email arrives.',
      signInMethods: start.signInMethods,
    },
  }
}

async function continueLogin(target: Target, options: { acceptTerms?: boolean; code?: string; username?: string }) {
  const pending = target.setup?.login
  if (!pending) throw new Error('No pending setup login. Run `beeper setup --email <email>` first.')
  const client = new BeeperDesktop({ baseURL: target.baseURL, accessToken: '' })
  const response = pending.leadToken
    ? {
      leadToken: pending.leadToken,
      registrationRequired: true as const,
      setupRequestID: pending.setupRequestID,
      usernameSuggestions: pending.usernameSuggestions,
    }
    : await client.app.login.response({ setupRequestID: pending.setupRequestID, response: requiredCode(options.code) })
  if ('registrationRequired' in response && response.registrationRequired) {
    if (!options.acceptTerms) {
      await writeTarget({
        ...target,
        setup: {
          ...target.setup,
          login: {
            ...pending,
            leadToken: response.leadToken,
            username: options.username ?? pending.username,
            usernameSuggestions: response.usernameSuggestions,
          },
        },
      })
      throw new Error('Account creation requires --accept-terms. Run `beeper setup --accept-terms` to continue.')
    }
  }
  const login = 'registrationRequired' in response && response.registrationRequired
    ? await registerTarget(client, response, {
      acceptTerms: options.acceptTerms,
      email: pending.email,
      username: options.username ?? pending.username,
    })
    : response
  if (!('matrix' in login) || !login.matrix?.accessToken) throw new Error('Setup login did not return an access token.')
  await saveTargetAuth({ ...target, setup: undefined }, { accessToken: login.matrix.accessToken, tokenType: 'Bearer' })
  return {
    accessToken: login.matrix.accessToken,
    matrix: {
      deviceID: login.matrix.deviceID,
      homeserver: login.matrix.homeserver,
      userID: login.matrix.userID,
    },
    session: login.session,
  }
}

function requiredCode(code?: string): string {
  if (!code) throw new Error('Setup needs --code to finish email sign-in.')
  return code
}

async function registerTarget(
  client: BeeperDesktop,
  response: Pick<LoginResponseResponse.RegistrationRequired, 'leadToken' | 'setupRequestID' | 'usernameSuggestions'>,
  options: { acceptTerms?: boolean; email: string; username?: string },
) {
  if (!options.acceptTerms) throw new Error('Account creation requires --accept-terms.')
  const username = options.username ?? usernameForEmail(options.email) ?? response.usernameSuggestions?.[0]
  if (!username) throw new Error('Account creation requires --username.')
  return client.app.login.register({
    acceptTerms: true,
    leadToken: response.leadToken,
    setupRequestID: response.setupRequestID,
    username,
  })
}

function usernameForEmail(email: string): string | undefined {
  const digits = email.match(/\+(\d+)@/)?.[1]
  return digits ? `staging-user${digits}` : undefined
}
