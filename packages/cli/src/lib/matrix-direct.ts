import { appRequest } from './app-api.js'
import { resolveTarget } from './targets.js'

type MatrixFlags = {
  'base-url'?: string
  target?: string
}

export async function matrixContext(flags: MatrixFlags): Promise<{ homeserver: string; token: string }> {
  const target = await resolveTarget({ target: flags.target, baseURL: flags['base-url'] })
  const token = process.env.BEEPER_ACCESS_TOKEN || target.auth?.accessToken
  if (!token) throw new Error('Matrix fallback requires stored target auth or BEEPER_ACCESS_TOKEN.')
  const state = await appRequest<{ matrix?: { homeserver?: string } }>('GET', '/v1/app/setup', {
    baseURL: flags['base-url'],
    target: flags.target,
    token,
  })
  const homeserver = state.matrix?.homeserver
  if (!homeserver) throw new Error('Matrix fallback could not determine the homeserver.')
  return { homeserver, token }
}

export async function createMatrixDM(flags: MatrixFlags, userID: string): Promise<{ room_id: string }> {
  return matrixRequest(flags, 'POST', '/_matrix/client/v3/createRoom', {
    invite: [userID],
    is_direct: true,
    preset: 'trusted_private_chat',
  })
}

export async function sendMatrixText(flags: MatrixFlags, roomID: string, text: string): Promise<{ chatID: string; pendingMessageID: string }> {
  const txnID = `beeper-cli-${Date.now()}-${Math.random().toString(36).slice(2)}`
  await matrixRequest(flags, 'PUT', `/_matrix/client/v3/rooms/${encodeURIComponent(roomID)}/send/m.room.message/${encodeURIComponent(txnID)}`, {
    body: text,
    msgtype: 'm.text',
  })
  return { chatID: roomID, pendingMessageID: txnID }
}

export async function listMatrixMessages(flags: MatrixFlags, roomID: string, limit: number): Promise<unknown[]> {
  const response = await matrixRequest<{ chunk?: unknown[] }>(flags, 'GET', `/_matrix/client/v3/rooms/${encodeURIComponent(roomID)}/messages?dir=b&limit=${limit}`)
  return response.chunk ?? []
}

async function matrixRequest<T = any>(flags: MatrixFlags, method: 'GET' | 'POST' | 'PUT', path: string, body?: Record<string, unknown>): Promise<T> {
  const { homeserver, token } = await matrixContext(flags)
  const response = await fetch(new URL(path, homeserver), {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) throw new Error(`${method} ${path} failed: ${response.status} ${await response.text()}`)
  return response.json() as Promise<T>
}
