import {
  renderCommands,
  renderConfig,
  renderEmptyState,
  renderFailure,
  renderList,
  renderStream,
  renderSuccess,
  renderValue,
  type StreamController,
  type Suggestion,
} from './ink/render.js'

export type OutputFormat = 'human' | 'json' | 'jsonl'
type RecordValue = Record<string, unknown>

export async function printData(value: unknown, format: OutputFormat): Promise<void> {
  if (format === 'json') {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
    return
  }

  if (format === 'jsonl') {
    if (Array.isArray(value)) {
      for (const item of value) process.stdout.write(`${JSON.stringify(item)}\n`)
      return
    }
    process.stdout.write(`${JSON.stringify(value)}\n`)
    return
  }

  await renderValue(value)
}

export async function printList(
  value: unknown[],
  format: OutputFormat,
  empty: { title: string; subtitle?: string; suggestions?: Suggestion[] },
): Promise<void> {
  if (format === 'json') {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
    return
  }
  if (format === 'jsonl') {
    for (const item of value) process.stdout.write(`${JSON.stringify(item)}\n`)
    return
  }
  await renderList(value as RecordValue[], empty)
}

export async function collectPage<T>(iterable: AsyncIterable<T>, limit?: number): Promise<T[]> {
  const items: T[] = []
  for await (const item of iterable) {
    items.push(item)
    if (limit && items.length >= limit) break
  }
  return items
}

export function printIDs(values: unknown[]): void {
  for (const value of values) {
    if (!value || typeof value !== 'object') continue
    const record = value as Record<string, unknown>
    const id = record.id ?? record.chatID ?? record.messageID
    if (id) process.stdout.write(`${String(id)}\n`)
  }
}

export async function emptyState(opts: { title: string; subtitle?: string; suggestions?: Suggestion[] }): Promise<void> {
  await renderEmptyState(opts)
}

export async function printSuccess(
  opts: { message: string; detail?: string; entity?: unknown; data?: Record<string, unknown> },
  format: OutputFormat,
): Promise<void> {
  if (format === 'json' || format === 'jsonl') {
    const payload = { ok: true, message: opts.message, ...(opts.data ?? {}) }
    process.stdout.write(`${JSON.stringify(payload, null, format === 'json' ? 2 : 0)}\n`)
    return
  }
  await renderSuccess(opts)
}

export async function printFailure(
  opts: { message: string; detail?: string; data?: Record<string, unknown> },
  format: OutputFormat,
): Promise<void> {
  if (format === 'json' || format === 'jsonl') {
    const payload = { ok: false, message: opts.message, ...(opts.data ?? {}) }
    process.stdout.write(`${JSON.stringify(payload, null, format === 'json' ? 2 : 0)}\n`)
    return
  }
  await renderFailure(opts)
}

export async function printConfig(data: Record<string, unknown>, format: OutputFormat): Promise<void> {
  if (format === 'json' || format === 'jsonl') {
    process.stdout.write(`${JSON.stringify(data, null, format === 'json' ? 2 : 0)}\n`)
    return
  }
  await renderConfig(data)
}

export async function printCommands(
  items: Array<{ command: string; description: string; group?: string }>,
  format: OutputFormat,
  opts?: { title?: string; intro?: string[] },
): Promise<void> {
  if (format === 'json' || format === 'jsonl') {
    process.stdout.write(`${JSON.stringify(items, null, format === 'json' ? 2 : 0)}\n`)
    return
  }
  await renderCommands(items, opts)
}

export function startStream(opts: { baseURL: string; subscribed: string[] }): StreamController {
  return renderStream(opts)
}

export type { Suggestion } from './ink/render.js'
