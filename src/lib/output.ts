export type OutputFormat = 'human' | 'json' | 'jsonl'
type RecordValue = Record<string, unknown>

export function printData(value: unknown, format: OutputFormat): void {
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

  if (Array.isArray(value)) {
    for (const item of value) printHuman(item)
    return
  }

  printHuman(value)
}

function printHuman(value: unknown): void {
  if (!value || typeof value !== 'object') {
    process.stdout.write(`${String(value)}\n`)
    return
  }

  const record = value as RecordValue
  if (isChat(record)) return printChat(record)
  if (isMessage(record)) return printMessage(record)
  if (isUser(record)) return printUser(record)
  if (isAccount(record)) return printAccount(record)
  if (isAsset(record)) return printAsset(record)

  const title = record.title ?? record.displayName ?? record.name ?? record.id ?? record.messageID
  if (title) process.stdout.write(`${String(title)}\n`)
  for (const [key, item] of Object.entries(record)) {
    if (item == null || key === 'title' || key === 'displayName' || key === 'name') continue
    if (typeof item === 'object') continue
    process.stdout.write(`  ${key}: ${String(item)}\n`)
  }
}

function isChat(record: RecordValue): boolean {
  return typeof record.id === 'string'
    && typeof record.accountID === 'string'
    && typeof record.title === 'string'
    && typeof record.unreadCount === 'number'
}

function isMessage(record: RecordValue): boolean {
  return typeof record.id === 'string'
    && typeof record.chatID === 'string'
    && typeof record.senderID === 'string'
    && typeof record.timestamp === 'string'
}

function isUser(record: RecordValue): boolean {
  return typeof record.id === 'string'
    && (typeof record.fullName === 'string' || typeof record.username === 'string' || typeof record.email === 'string' || typeof record.phoneNumber === 'string')
}

function isAccount(record: RecordValue): boolean {
  return typeof (record.accountID ?? record.id) === 'string'
    && (typeof record.network === 'string' || typeof record.bridge === 'string' || typeof record.displayName === 'string')
}

function isAsset(record: RecordValue): boolean {
  return typeof record.uploadID === 'string' || typeof record.srcURL === 'string'
}

function printChat(chat: RecordValue): void {
  const badges = compact([
    chat.network,
    chat.type,
    chat.isPinned ? 'pinned' : undefined,
    chat.isMuted ? 'muted' : undefined,
    chat.isArchived ? 'archived' : undefined,
    chat.isLowPriority ? 'low priority' : undefined,
    chat.isReadOnly ? 'read only' : undefined,
  ])
  const unread = Number(chat.unreadCount ?? 0)
  const mentions = Number(chat.unreadMentionsCount ?? 0)
  const unreadText = unread > 0 ? `  unread ${unread}${mentions > 0 ? ` / mentions ${mentions}` : ''}` : ''
  process.stdout.write(`${String(chat.title)}${badges.length ? `  [${badges.join(' / ')}]` : ''}${unreadText}\n`)
  const preview = chatPreview(chat)
  if (preview) process.stdout.write(`  ${preview}\n`)
  const meta = compact([
    formatTime(chat.lastActivity),
    chat.reminder && typeof chat.reminder === 'object' ? `reminder ${formatTime((chat.reminder as RecordValue).remindAt ?? (chat.reminder as RecordValue).remindAtMs)}` : undefined,
    typeof chat.participants === 'object' ? participantsSummary(chat.participants as RecordValue) : undefined,
  ])
  if (meta.length) process.stdout.write(`  ${meta.join('  |  ')}\n`)
  process.stdout.write(`  id: ${String(chat.id)}\n`)
}

function printMessage(message: RecordValue): void {
  const sender = stringValue(message.senderName) ?? shortID(String(message.senderID))
  const text = messageText(message)
  const badges = compact([
    message.type && message.type !== 'TEXT' ? message.type : undefined,
    message.isSender ? 'me' : undefined,
    message.isUnread ? 'unread' : undefined,
    message.isDeleted ? 'deleted' : undefined,
    message.editedTimestamp ? 'edited' : undefined,
    Array.isArray(message.attachments) && message.attachments.length > 0 ? attachmentSummary(message.attachments) : undefined,
    Array.isArray(message.reactions) && message.reactions.length > 0 ? `${message.reactions.length} reactions` : undefined,
  ])
  process.stdout.write(`${sender}${badges.length ? `  [${badges.join(' / ')}]` : ''}  ${formatTime(message.timestamp) ?? ''}\n`)
  if (text) process.stdout.write(`  ${text}\n`)
  const status = typeof message.sendStatus === 'object' && message.sendStatus ? message.sendStatus as RecordValue : undefined
  if (status?.status && status.status !== 'SUCCESS') process.stdout.write(`  status: ${String(status.status)}${status.message ? ` - ${String(status.message)}` : ''}\n`)
  process.stdout.write(`  id: ${String(message.id)}  chat: ${String(message.chatID)}\n`)
}

function printUser(user: RecordValue): void {
  const title = stringValue(user.fullName) ?? stringValue(user.username) ?? stringValue(user.email) ?? stringValue(user.phoneNumber) ?? String(user.id)
  const bits = compact([user.username, user.email, user.phoneNumber, user.cannotMessage ? 'cannot message' : undefined, user.isSelf ? 'self' : undefined])
  process.stdout.write(`${title}${bits.length ? `  [${bits.join(' / ')}]` : ''}\n`)
  process.stdout.write(`  id: ${String(user.id)}${user.accountID ? `  account: ${String(user.accountID)}` : ''}\n`)
}

function printAccount(account: RecordValue): void {
  const id = account.accountID ?? account.id
  const title = account.displayName ?? account.name ?? account.network ?? id
  const bits = compact([account.network, account.bridge, account.username, account.userID])
  process.stdout.write(`${String(title)}${bits.length ? `  [${bits.join(' / ')}]` : ''}\n`)
  process.stdout.write(`  id: ${String(id)}\n`)
}

function printAsset(asset: RecordValue): void {
  const title = asset.fileName ?? asset.uploadID ?? asset.srcURL
  process.stdout.write(`${String(title)}\n`)
  const bits = compact([
    asset.uploadID ? `upload: ${String(asset.uploadID)}` : undefined,
    asset.mimeType,
    typeof asset.fileSize === 'number' ? formatBytes(asset.fileSize) : undefined,
    asset.width && asset.height ? `${String(asset.width)}x${String(asset.height)}` : undefined,
    asset.srcURL,
    asset.error ? `error: ${String(asset.error)}` : undefined,
  ])
  for (const bit of bits) process.stdout.write(`  ${String(bit)}\n`)
}

function chatPreview(chat: RecordValue): string | undefined {
  if (chat.draft && typeof chat.draft === 'object') {
    const draft = chat.draft as RecordValue
    const text = cleanText(draft.text)
    return `draft${text ? `: ${text}` : ''}`
  }
  const lastMessage = (chat.latestMessage ?? chat.lastMessage) as RecordValue | undefined
  if (lastMessage && typeof lastMessage === 'object') {
    const sender = stringValue(lastMessage.senderName) ?? (lastMessage.isSender ? 'me' : undefined)
    const text = messageText(lastMessage)
    return compact([sender ? `${sender}:` : undefined, text]).join(' ')
  }
  return undefined
}

function participantsSummary(participants: RecordValue): string | undefined {
  const total = participants.total
  const items = Array.isArray(participants.items) ? participants.items : []
  if (typeof total === 'number') return `${total} participant${total === 1 ? '' : 's'}`
  if (items.length) return `${items.length} participant${items.length === 1 ? '' : 's'}`
  return undefined
}

function messageText(message: RecordValue): string | undefined {
  if (message.isDeleted) return 'Deleted message'
  const text = cleanText(message.text)
  if (text) return text
  if (Array.isArray(message.attachments) && message.attachments.length > 0) return attachmentSummary(message.attachments)
  if (Array.isArray(message.links) && message.links.length > 0) return `${message.links.length} link${message.links.length === 1 ? '' : 's'}`
  return undefined
}

function attachmentSummary(attachments: unknown[]): string {
  const labels = attachments.map(item => {
    if (!item || typeof item !== 'object') return 'attachment'
    const attachment = item as RecordValue
    return stringValue(attachment.fileName) ?? stringValue(attachment.type) ?? 'attachment'
  })
  return labels.length === 1 ? labels[0]! : `${labels.length} attachments: ${labels.slice(0, 3).join(', ')}${labels.length > 3 ? ', ...' : ''}`
}

function cleanText(value: unknown): string | undefined {
  const raw = stringValue(value)
  if (!raw) return undefined
  const text = raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`~>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text ? truncate(text, 160) : undefined
}

function formatTime(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return String(value)
  const now = Date.now()
  const diffMs = now - date.valueOf()
  const abs = Math.abs(diffMs)
  const suffix = diffMs >= 0 ? 'ago' : 'from now'
  if (abs < 60_000) return 'just now'
  if (abs < 3_600_000) return `${Math.round(abs / 60_000)}m ${suffix}`
  if (abs < 86_400_000) return `${Math.round(abs / 3_600_000)}h ${suffix}`
  if (abs < 604_800_000) return `${Math.round(abs / 86_400_000)}d ${suffix}`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`
}

function shortID(value: string): string {
  const local = value.split(':')[0]
  return local?.replace(/^@/, '') || value
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function compact(values: unknown[]): string[] {
  return values.filter((value): value is string | number => typeof value === 'string' || typeof value === 'number').map(String).filter(Boolean)
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
