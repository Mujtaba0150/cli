import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { getAccessToken, readConfig } from './config.js'
import type { AppStatusResponse } from '@beeper/desktop-api/resources/app/app.js'
import type {
  LoginRegisterResponse,
  LoginResponseResponse,
} from '@beeper/desktop-api/resources/app/login.js'
import type { ResetBeginResponse } from '@beeper/desktop-api/resources/app/e2ee/recovery-code/reset.js'

export type AppStateSnapshot = AppStatusResponse
export type AppLoginSuccess = LoginRegisterResponse
export type AppRegistrationRequired = Extract<LoginResponseResponse, { registrationRequired: true }>
export type AppLoginOutput = LoginResponseResponse

export type AppMutationResponse = {
  appState: AppStateSnapshot
}

export type AppRecoveryCodeResetBeginResponse = ResetBeginResponse

export async function appRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  options: { baseURL?: string; body?: Record<string, unknown>; token?: string | false } = {},
): Promise<T> {
  const config = await readConfig()
  const baseURL = options.baseURL ?? config.baseURL
  const token = options.token === false ? undefined : options.token ?? await getAccessToken()
  const headers: Record<string, string> = {}
  if (token) headers.authorization = `Bearer ${token}`
  if (options.body) headers['content-type'] = 'application/json'

  const response = await fetch(new URL(path, baseURL), {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (!response.ok) throw new Error(`${method} ${path} failed: ${response.status} ${await response.text()}`)
  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : {}) as T
}

export async function promptText(label: string): Promise<string> {
  const rl = createInterface({ input, output })
  try {
    const value = await rl.question(label)
    return value.trim()
  } finally {
    rl.close()
  }
}

export async function promptYesNo(label: string): Promise<boolean> {
  const value = (await promptText(`${label} [y/N] `)).toLowerCase()
  return value === 'y' || value === 'yes'
}

export function isRegistrationRequired(output: AppLoginOutput): output is AppRegistrationRequired {
  return 'registrationRequired' in output && output.registrationRequired === true
}
