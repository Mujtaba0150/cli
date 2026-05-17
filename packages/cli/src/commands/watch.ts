import { Flags } from '@oclif/core'
import WebSocket from 'ws'
import { BeeperCommand, writeEvent } from '../lib/command.js'
import { requireToken } from '../lib/client.js'
import { getBaseURL } from '../lib/targets.js'
import { startStream } from '../lib/output.js'

export default class Watch extends BeeperCommand {
  static override summary = 'Stream Desktop API WebSocket events'
  static override flags = {
    chat: Flags.string({ char: 'c', multiple: true, description: 'Chat ID to subscribe to. Defaults to all chats.' }),
    json: Flags.boolean({ default: false, description: 'Print raw JSON, one event per line' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Watch)
    const token = await requireToken()
    const baseURL = await getBaseURL(flags['base-url'])
    const info = await fetch(new URL('/v1/info', baseURL))
    if (!info.ok) throw new Error(`Failed to fetch /v1/info: HTTP ${info.status}`)
    const metadata = await info.json() as { endpoints?: { ws_events?: string } }
    const endpoint = metadata.endpoints?.ws_events || '/v1/ws'
    const url = new URL(endpoint, baseURL)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'

    const subscribed = flags.chat?.length ? flags.chat : ['*']
    const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${token}` } })

    if (flags.json) {
      await this.runJSON(ws, subscribed, flags.events)
      return
    }
    await this.runHuman(ws, subscribed, baseURL, flags.events)
  }

  private async runJSON(ws: WebSocket, subscribed: string[], events: boolean): Promise<void> {
    ws.addEventListener('open', () => {
      if (events) writeEvent('watch.open', { subscribed })
      ws.send(JSON.stringify({ type: 'subscriptions.set', chatIDs: subscribed }))
    })
    ws.addEventListener('message', event => {
      const data = typeof event.data === 'string' ? event.data : event.data.toString()
      if (events) writeEvent('watch.message')
      process.stdout.write(`${data}\n`)
    })
    ws.addEventListener('error', () => {
      if (events) writeEvent('watch.error', { message: 'WebSocket connection failed' })
      this.error('WebSocket connection failed', { exit: 1 })
    })
    ws.addEventListener('close', event => {
      if (events) writeEvent('watch.close', { code: event.code, reason: event.reason })
      if (event.code !== 1000) this.error(`WebSocket closed: ${event.code} ${event.reason}`, { exit: 1 })
    })
    await new Promise<void>(resolve => {
      process.once('SIGINT', () => { ws.close(1000); resolve() })
      ws.addEventListener('close', () => resolve())
    })
  }

  private async runHuman(ws: WebSocket, subscribed: string[], baseURL: string, events: boolean): Promise<void> {
    const stream = await startStream({ baseURL, subscribed })
    let closed = false

    const finish = async (): Promise<void> => {
      if (closed) return
      closed = true
      try { ws.close(1000) } catch { /* ignore */ }
      await stream.close()
    }

    ws.addEventListener('open', () => {
      if (events) writeEvent('watch.open', { subscribed })
      stream.setConnected(true)
      ws.send(JSON.stringify({ type: 'subscriptions.set', chatIDs: subscribed }))
    })
    ws.addEventListener('message', event => {
      const data = typeof event.data === 'string' ? event.data : event.data.toString()
      if (events) writeEvent('watch.message')
      try {
        const parsed = JSON.parse(data) as Record<string, unknown>
        stream.push({
          type: typeof parsed.type === 'string' ? parsed.type : 'event',
          chatID: typeof parsed.chatID === 'string' ? parsed.chatID : undefined,
          messageID: typeof parsed.messageID === 'string' ? parsed.messageID : undefined,
          ts: typeof parsed.timestamp === 'string' ? parsed.timestamp : new Date().toISOString(),
        })
      } catch {
        stream.push({ type: 'raw', ts: new Date().toISOString() })
      }
    })
    ws.addEventListener('error', () => {
      if (events) writeEvent('watch.error', { message: 'WebSocket connection failed' })
      stream.setConnected(false)
      stream.setStatus('connection error')
    })
    ws.addEventListener('close', event => {
      if (events) writeEvent('watch.close', { code: event.code, reason: event.reason })
      stream.setConnected(false)
      if (event.code !== 1000) stream.setStatus(`closed ${event.code}${event.reason ? ` ${event.reason}` : ''}`)
      void finish()
    })
    process.once('SIGINT', () => { void finish() })

    await stream.done
  }
}
