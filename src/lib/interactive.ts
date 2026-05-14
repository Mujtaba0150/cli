import {
  BoxRenderable,
  MarkdownRenderable,
  RGBA,
  ScrollBoxRenderable,
  SelectRenderable,
  SelectRenderableEvents,
  SyntaxStyle,
  TextareaRenderable,
  TextRenderable,
  createCliRenderer,
  type CliRenderer,
  type KeyEvent,
  type Renderable,
  type SelectOption,
  type TextareaOptions,
  type TextOptions,
} from '@opentui/core'
import type BeeperDesktop from '@beeper/desktop-api'
import { createReadStream, readFileSync } from 'node:fs'
import { exportBeeperData } from './export/index.js'
import { collectPage } from './output.js'

type RecordValue = Record<string, unknown>

type InteractiveOptions = {
  client: BeeperDesktop
}

const colors = {
  bg: '#0b0d10',
  panel: '#111418',
  panelAlt: '#171c21',
  panelSoft: '#1d2429',
  text: '#e6e9ec',
  muted: '#89929b',
  subtle: '#58616b',
  border: '#29313a',
  active: '#64d2b7',
  activeSoft: '#163a34',
  warn: '#f0b26b',
  danger: '#ff7a90',
  mine: '#92d46f',
  other: '#8fb8ff',
  code: '#1a2026',
}

const markdownStyle = SyntaxStyle.fromStyles({
  'markup.heading.1': { fg: RGBA.fromHex(colors.active), bold: true },
  'markup.heading.2': { fg: RGBA.fromHex(colors.other), bold: true },
  'markup.strong': { fg: RGBA.fromHex(colors.text), bold: true },
  'markup.emphasis': { fg: RGBA.fromHex(colors.warn), italic: true },
  'markup.link': { fg: RGBA.fromHex(colors.active), underline: true },
  'markup.raw': { fg: RGBA.fromHex(colors.warn), bg: RGBA.fromHex(colors.code) },
  'markup.list': { fg: RGBA.fromHex(colors.active) },
  'string': { fg: RGBA.fromHex(colors.mine) },
  'number': { fg: RGBA.fromHex(colors.warn) },
  'keyword': { fg: RGBA.fromHex(colors.other), bold: true },
  'comment': { fg: RGBA.fromHex(colors.subtle), italic: true },
  default: { fg: RGBA.fromHex(colors.text) },
})

const helpMarkdown = [
  '# Beeper',
  '',
  '**Focus:** Tab cycles panes. Click to focus. Scroll lists and messages with the mouse wheel.',
  '**Composer:** Enter sends. Alt+Enter inserts a newline. Paste works as text.',
  '**Global keys:** `g` chats, `.` actions, `/` composer, `?` help, `Ctrl+F` search, `Ctrl+R` refresh, `Esc` quit.',
  '',
  '## Commands',
  '',
  '`/actions`, `/help`, `/refresh`, `/open [MESSAGE_ID] [--text TEXT] [--image PATH]`, `/accounts`, `/contacts ACCOUNT_ID [QUERY]`, `/contact ACCOUNT_ID QUERY`, `/status`, `/chats [QUERY]`, `/chat [--all-participants]`, `/search QUERY`, `/messages QUERY`, `/message MESSAGE_ID`, `/archive`, `/unarchive`, `/pin`, `/unpin`, `/low-priority`, `/inbox`, `/mute`, `/unmute`, `/title TEXT`, `/description TEXT`, `/avatar PATH`, `/message-expiry SECONDS|off`, `/notify-anyway`, `/draft TEXT`, `/draft-file FILE [TEXT]`, `/clear-draft`, `/reply MESSAGE_ID TEXT`, `/edit MESSAGE_ID TEXT`, `/delete MESSAGE_ID [--everyone]`, `/react MESSAGE_ID REACTION`, `/unreact MESSAGE_ID REACTION`, `/remind ISO_TIMESTAMP [--keep]`, `/unremind`, `/start ACCOUNT_ID USER_ID_OR_IDENTIFIER`, `/create ACCOUNT_ID PARTICIPANT_ID...`, `/upload FILE [TEXT]`, `/upload-base64 FILE [TEXT]`, `/download MXC_OR_LOCALMXC_URL`, `/serve MXC_OR_LOCALMXC_OR_FILE_URL`, `/export OUT_DIR`, `/watch [all|chat]`, `/unwatch`, `/api get PATH`, `/api post PATH JSON`, `/quit`',
].join('\n')

export async function runInteractiveApp(options: InteractiveOptions): Promise<void> {
  const app = new InteractiveApp(options.client)
  await app.start()
}

class InteractiveApp {
  private renderer!: CliRenderer
  private root!: BoxRenderable
  private header!: TextRenderable
  private chatList!: SelectRenderable
  private messagesBox!: ScrollBoxRenderable
  private actionsList!: SelectRenderable
  private detailsBox!: ScrollBoxRenderable
  private details!: MarkdownRenderable
  private status!: TextRenderable
  private input!: TextareaRenderable
  private composerFrame!: BoxRenderable
  private chats: RecordValue[] = []
  private messages: RecordValue[] = []
  private ws: WebSocket | undefined
  private selectedChatID: string | undefined
  private selectedChat: RecordValue | undefined
  private lastSelectedMessage: RecordValue | undefined
  private focusIndex = 1
  private loadingMessages = false

  constructor(private readonly client: BeeperDesktop) {}

  async start(): Promise<void> {
    this.renderer = await createCliRenderer({
      autoFocus: true,
      backgroundColor: colors.bg,
      consoleMode: 'disabled',
      enableMouseMovement: true,
      exitOnCtrlC: true,
      targetFps: 30,
      useMouse: true,
    })

    this.buildLayout()
    this.bindKeys()
    await this.loadChats()
    this.input.focus()

    await new Promise<void>(resolve => {
      this.renderer.on('destroy', resolve)
    })
  }

  private buildLayout(): void {
    this.root = new BoxRenderable(this.renderer, {
      id: 'beeper-interactive',
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      backgroundColor: colors.bg,
    })

    this.header = this.text({
      id: 'header',
      height: 3,
      content: 'Beeper Desktop\nChats  Messages  Actions  Composer',
      fg: colors.text,
      bg: colors.bg,
    })

    const body = new BoxRenderable(this.renderer, {
      id: 'body',
      flexGrow: 1,
      flexDirection: 'row',
      gap: 1,
      paddingX: 1,
      backgroundColor: colors.bg,
    })

    this.chatList = new SelectRenderable(this.renderer, {
      id: 'chat-list',
      width: '28%',
      height: '100%',
      options: [],
      backgroundColor: colors.panel,
      focusedBackgroundColor: colors.panel,
      selectedBackgroundColor: colors.activeSoft,
      selectedTextColor: colors.active,
      textColor: colors.text,
      descriptionColor: colors.muted,
      selectedDescriptionColor: colors.text,
      itemSpacing: 1,
      showScrollIndicator: true,
      showDescription: true,
      wrapSelection: true,
    })

    this.messagesBox = new ScrollBoxRenderable(this.renderer, {
      id: 'messages',
      width: '48%',
      height: '100%',
      border: true,
      borderColor: colors.border,
      focusedBorderColor: colors.active,
      title: ' Messages ',
      backgroundColor: colors.panel,
      stickyScroll: true,
      stickyStart: 'bottom',
      scrollY: true,
      scrollX: false,
      paddingX: 1,
      paddingY: 1,
      viewportCulling: true,
      scrollbarOptions: {
        trackOptions: {
          backgroundColor: colors.panelAlt,
          foregroundColor: colors.active,
        },
      },
    })

    const side = new BoxRenderable(this.renderer, {
      id: 'side',
      flexGrow: 1,
      height: '100%',
      flexDirection: 'column',
      border: true,
      borderColor: colors.border,
      title: ' Actions ',
      backgroundColor: colors.panel,
      paddingX: 1,
      paddingY: 1,
    })
    this.actionsList = new SelectRenderable(this.renderer, {
      id: 'actions',
      width: '100%',
      height: 16,
      options: [],
      backgroundColor: colors.panel,
      focusedBackgroundColor: colors.panel,
      selectedBackgroundColor: colors.activeSoft,
      selectedTextColor: colors.active,
      textColor: colors.text,
      descriptionColor: colors.muted,
      selectedDescriptionColor: colors.text,
      itemSpacing: 1,
      showDescription: true,
      showScrollIndicator: true,
      wrapSelection: true,
    })
    this.detailsBox = new ScrollBoxRenderable(this.renderer, {
      id: 'details-box',
      width: '100%',
      flexGrow: 1,
      border: true,
      borderColor: colors.border,
      focusedBorderColor: colors.active,
      title: ' Context ',
      backgroundColor: colors.panel,
      scrollY: true,
      scrollX: false,
      paddingX: 1,
      paddingY: 1,
    })
    this.details = this.markdown({
      id: 'details-text',
      width: '100%',
      content: helpMarkdown,
      bg: colors.panel,
    })
    this.detailsBox.add(this.details)
    side.add(this.actionsList)
    side.add(this.detailsBox)

    body.add(this.chatList)
    body.add(this.messagesBox)
    body.add(side)

    const footer = new BoxRenderable(this.renderer, {
      id: 'footer',
      height: 8,
      flexDirection: 'column',
      paddingX: 1,
      paddingY: 1,
      backgroundColor: colors.bg,
    })
    this.status = this.text({
      id: 'status',
      height: 1,
      content: 'Loading chats...',
      fg: colors.muted,
      bg: colors.bg,
    })
    this.composerFrame = new BoxRenderable(this.renderer, {
      id: 'composer-frame',
      width: '100%',
      flexGrow: 1,
      border: true,
      borderColor: colors.border,
      focusedBorderColor: colors.active,
      title: ' Composer ',
      backgroundColor: colors.panel,
      paddingX: 1,
    })
    this.input = new TextareaRenderable(this.renderer, {
      id: 'composer',
      width: '100%',
      height: '100%',
      placeholder: 'Message, /help, /search dinner, /archive...',
      placeholderColor: colors.subtle,
      backgroundColor: colors.panel,
      focusedBackgroundColor: colors.panelAlt,
      textColor: colors.text,
      focusedTextColor: colors.text,
      cursorColor: colors.active,
      selectionBg: colors.activeSoft,
      selectionFg: colors.text,
      wrapMode: 'word',
      keyBindings: [
        { name: 'return', action: 'submit' },
        { name: 'return', meta: true, action: 'newline' },
        { name: 'return', ctrl: true, action: 'submit' },
      ],
      onSubmit: () => {
        const command = this.input.plainText.trim()
        this.clearComposer()
        if (!command) return
        void this.submit(command)
      },
    } satisfies TextareaOptions)

    footer.add(this.status)
    this.composerFrame.add(this.input)
    footer.add(this.composerFrame)
    this.root.add(this.header)
    this.root.add(body)
    this.root.add(footer)
    this.renderer.root.add(this.root)

    this.chatList.on(SelectRenderableEvents.SELECTION_CHANGED, () => {
      const selected = this.chatList.getSelectedOption()
      const chat = selected?.value as RecordValue | undefined
      if (!chat) return
      void this.selectChat(chat)
    })
    this.chatList.on(SelectRenderableEvents.ITEM_SELECTED, () => this.input.focus())
    this.actionsList.on(SelectRenderableEvents.ITEM_SELECTED, () => {
      const selected = this.actionsList.getSelectedOption()
      const command = selected?.value
      if (typeof command !== 'string') return
      if (command.endsWith(' ')) {
        this.setComposer(command)
        this.input.focus()
        return
      }
      void this.submit(command)
    })
  }

  private bindKeys(): void {
    this.renderer.keyInput.on('keypress', (key: KeyEvent) => {
      const typing = this.input.focused
      if (key.name === 'escape') {
        this.stopWatching()
        this.renderer.destroy()
        return
      }
      if (key.name === 'tab') {
        this.cycleFocus()
        key.preventDefault()
        return
      }
      if (typing) return
      if (key.name === 'g' && !key.ctrl && !key.meta) {
        this.chatList.focus()
        key.preventDefault()
        return
      }
      if (key.name === '.' && !key.ctrl && !key.meta) {
        this.actionsList.focus()
        key.preventDefault()
        return
      }
      if (key.name === '/' && !key.ctrl && !key.meta) {
        this.setComposer('/')
        this.input.focus()
        key.preventDefault()
        return
      }
      if (key.name === '?' && !key.ctrl && !key.meta) {
        this.setDetails('Help', helpMarkdown)
        this.detailsBox.focus()
        key.preventDefault()
        return
      }
      if (key.name === 'a' && !key.ctrl && !key.meta) {
        void this.submit(isArchived(this.selectedChat) ? '/unarchive' : '/archive')
        key.preventDefault()
        return
      }
      if (key.name === 'm' && !key.ctrl && !key.meta) {
        void this.submit(isMuted(this.selectedChat) ? '/unmute' : '/mute')
        key.preventDefault()
        return
      }
      if (key.name === 'u' && !key.ctrl && !key.meta) {
        void this.submit(isUnread(this.selectedChat) ? '/read' : '/unread')
        key.preventDefault()
        return
      }
      if (key.name === 'o' && !key.ctrl && !key.meta) {
        void this.submit('/open')
        key.preventDefault()
        return
      }
      if (key.ctrl && key.name === 'r') {
        void this.loadChats()
        key.preventDefault()
        return
      }
      if (key.ctrl && key.name === 'f') {
        this.setComposer('/chats ')
        this.input.focus()
        key.preventDefault()
      }
    })
  }

  private cycleFocus(): void {
    const focusables: Renderable[] = [this.chatList, this.messagesBox, this.actionsList, this.input]
    this.focusIndex = (this.focusIndex + 1) % focusables.length
    focusables[this.focusIndex]?.focus()
  }

  private async loadChats(query?: string): Promise<void> {
    this.setStatus(query ? `Searching chats for "${query}"...` : 'Loading chats...')
    try {
      this.chats = query
        ? await collectPage(this.client.chats.search({ includeMuted: true, query }), 50) as unknown as RecordValue[]
        : await collectPage(this.client.chats.list(), 50) as unknown as RecordValue[]
      this.chatList.options = this.chats.map(chatToOption)
      if (!this.chats.length) {
        this.selectedChat = undefined
        this.selectedChatID = undefined
        this.lastSelectedMessage = undefined
        this.renderMessages([])
        this.renderDetails(undefined)
        this.setStatus('No chats found')
        return
      }
      this.chatList.setSelectedIndex(0)
      await this.selectChat(this.chats[0]!)
      this.setStatus(`${this.chats.length} chats loaded`)
    } catch (error) {
      this.setError(error)
    }
  }

  private async selectChat(chat: RecordValue): Promise<void> {
    if (this.loadingMessages) return
    this.selectedChat = chat
    this.selectedChatID = chatID(chat)
    this.header.content = `Beeper Desktop\n${titleOf(chat)}`
    this.renderDetails(chat)
    this.renderActions()
    await this.loadMessages()
  }

  private async loadMessages(): Promise<void> {
    const id = this.requireSelectedChatID(false)
    if (!id) return
    this.loadingMessages = true
    this.setStatus(`Loading ${titleOf(this.selectedChat)}...`)
    try {
      this.messages = await collectPage(this.client.messages.list(id), 80) as unknown as RecordValue[]
      this.lastSelectedMessage = this.messages[0]
      this.renderMessages(this.messages)
      this.setStatus(`${this.messages.length} messages loaded`)
    } catch (error) {
      this.setError(error)
    } finally {
      this.loadingMessages = false
    }
  }

  private renderMessages(messages: RecordValue[]): void {
    for (const child of [...this.messagesBox.getChildren()]) this.messagesBox.remove(child.id)
    for (const message of messages.slice().reverse()) {
      this.messagesBox.add(this.messageCard(message))
    }
    if (!messages.length) {
      this.messagesBox.add(this.markdown({
        id: 'empty-messages',
        width: '100%',
        height: 4,
        content: '_No messages loaded._',
        bg: colors.panel,
      }))
    }
    this.messagesBox.scrollTo(Number.MAX_SAFE_INTEGER)
    this.messagesBox.requestRender()
  }

  private messageCard(message: RecordValue): BoxRenderable {
    const mine = isMine(message)
    const selected = message === this.lastSelectedMessage
    const sender = stringField(message, 'senderName') || stringField(message, 'senderID') || 'Unknown'
    const timestamp = formatTimestamp(stringField(message, 'timestamp') || stringField(message, 'date'))
    const id = stringField(message, 'id') || stringField(message, 'messageID') || ''
    const attachmentText = attachmentSummary(message)
    const body = messageMarkdown(message)
    const card = new BoxRenderable(this.renderer, {
      id: `message-${stableID(id || sender + timestamp)}`,
      width: '100%',
      minHeight: messageHeight(message),
      marginBottom: 1,
      flexDirection: 'column',
      border: true,
      borderStyle: selected ? 'double' : 'rounded',
      borderColor: selected ? colors.active : mine ? colors.mine : colors.border,
      focusedBorderColor: colors.active,
      title: mine ? ' You ' : ` ${truncate(sender, 34)} `,
      bottomTitle: timestamp ? ` ${timestamp} ` : undefined,
      backgroundColor: mine ? '#111a14' : colors.panelAlt,
      paddingX: 1,
      paddingY: 1,
      onMouseDown: event => {
        this.lastSelectedMessage = message
        this.renderMessages(this.messages)
        event.stopPropagation()
      },
    })
    card.add(this.markdown({
      id: `message-md-${stableID(id || sender + timestamp)}`,
      width: '100%',
      minHeight: Math.max(1, body.split('\n').length),
      content: body,
      bg: mine ? '#111a14' : colors.panelAlt,
    }))
    if (attachmentText) {
      card.add(this.text({
        id: `message-attachments-${stableID(id || sender + timestamp)}`,
        width: '100%',
        height: attachmentText.split('\n').length,
        content: attachmentText,
        fg: colors.warn,
        bg: mine ? '#111a14' : colors.panelAlt,
      }))
    }
    if (id) {
      card.add(this.text({
        id: `message-id-${stableID(id)}`,
        width: '100%',
        height: 1,
        content: id,
        fg: colors.subtle,
        bg: mine ? '#111a14' : colors.panelAlt,
      }))
    }
    return card
  }

  private renderDetails(chat: RecordValue | undefined): void {
    if (!chat) {
      this.setDetails('Help', helpMarkdown)
      this.actionsList.options = globalActions()
      return
    }
    const caps = asRecord(chat.capabilities)
    const state = asRecord(caps?.state)
    this.setDetails('Chat', [
      `# ${escapeMarkdown(titleOf(chat))}`,
      '',
      '| Field | Value |',
      '| --- | --- |',
      `| ID | \`${escapeTable(chatID(chat) || '-')}\` |`,
      `| Local | \`${escapeTable(stringField(chat, 'localChatID') || '-')}\` |`,
      `| Network | ${escapeTable(stringField(chat, 'network') || '-')} |`,
      `| Account | \`${escapeTable(stringField(chat, 'accountID') || '-')}\` |`,
      `| Type | ${escapeTable(stringField(chat, 'type') || '-')} |`,
      `| Unread | ${String(chat.unreadCount ?? 0)} |`,
      `| Archived | ${String(Boolean(chat.isArchived))} |`,
      `| Muted | ${String(Boolean(chat.isMuted))} |`,
      `| Send disabled | ${String(Boolean(chat.isSendDisabled))} |`,
      '',
      '## Capabilities',
      '',
      `- Send: \`${capValue(state, 'sendMessage')}\``,
      `- Edit: \`${capValue(state, 'editMessage')}\``,
      `- Delete: \`${capValue(state, 'deleteMessageForSelf')}\` / \`${capValue(state, 'deleteMessageForEveryone')}\``,
      `- React: \`${capValue(state, 'reaction')}\``,
      `- Archive: \`${capValue(state, 'archive')}\``,
      `- Mark unread: \`${capValue(state, 'markUnread')}\``,
      '',
      '## Fast Actions',
      '',
      `- ${isArchived(chat) ? 'Unarchive' : 'Archive'}: \`a\``,
      `- ${isMuted(chat) ? 'Unmute' : 'Mute'}: \`m\``,
      `- ${isUnread(chat) ? 'Mark as Read' : 'Mark as Unread'}: \`u\``,
      '- Open in Beeper Desktop: `o`',
    ].join('\n'))
  }

  private renderActions(): void {
    this.actionsList.options = this.selectedChat ? chatActions(this.selectedChat) : globalActions()
  }

  private async submit(value: string): Promise<void> {
    if (value === '/quit' || value === '/exit') {
      this.stopWatching()
      this.renderer.destroy()
      return
    }
    if (!value.startsWith('/')) {
      await this.sendMessage(value)
      return
    }
    const [command, ...args] = splitCommand(value.slice(1))
    try {
      await this.runSlash(command ?? '', args)
    } catch (error) {
      this.setError(error)
    }
  }

  private async runSlash(command: string, args: string[]): Promise<void> {
    switch (command) {
      case 'actions':
        this.renderActions()
        this.actionsList.focus()
        this.setStatus('Actions')
        return
      case 'help':
        this.setDetails('Help', helpMarkdown)
        this.setStatus('Help opened')
        return
      case 'refresh':
        await this.loadChats()
        return
      case 'accounts':
        this.showObject('Accounts', await this.client.accounts.list())
        return
      case 'contacts':
        this.showObject('Contacts', await collectPage(this.client.accounts.contacts.list(required(args[0], 'account id'), {
          query: args.slice(1).join(' ') || undefined,
        }), 30))
        return
      case 'contact':
        this.showObject('Contacts', await this.client.accounts.contacts.search(required(args[0], 'account id'), {
          query: required(args.slice(1).join(' '), 'query'),
        }))
        return
      case 'status':
      case 'info':
        this.showObject('Status', await this.client.info.retrieve())
        return
      case 'chats':
        await this.loadChats(args.join(' ') || undefined)
        return
      case 'chat':
        this.showObject('Chat Info', await this.client.chats.retrieve(this.requireSelectedChatID(true), {
          maxParticipantCount: args.includes('--all-participants') ? -1 : 100,
        }))
        return
      case 'search':
        this.showObject('Search', await this.client.search({ query: required(args.join(' '), 'query') }))
        return
      case 'messages':
        this.showObject('Message search', await collectPage(this.client.messages.search({
          chatIDs: this.selectedChatID ? [this.selectedChatID] : undefined,
          query: required(args.join(' '), 'query'),
        }), 30))
        return
      case 'message':
        this.showObject('Message', await this.client.messages.retrieve(required(args[0], 'message id'), {
          chatID: this.requireSelectedChatID(true),
        }))
        return
      case 'open':
        await this.client.focus(focusParams(this.requireSelectedChatID(true), args))
        this.setStatus('Opened selected chat in Beeper Desktop')
        return
      case 'read':
        this.showObject('Read', await this.client.chats.markRead(this.requireSelectedChatID(true), { messageID: args[0] }))
        await this.loadMessages()
        return
      case 'unread':
        this.showObject('Unread', await this.client.chats.markUnread(this.requireSelectedChatID(true), { messageID: args[0] }))
        await this.loadMessages()
        return
      case 'archive':
      case 'unarchive':
        await this.client.chats.archive(this.requireSelectedChatID(true), { archived: command === 'archive' })
        this.setStatus(command === 'archive' ? 'Archived chat' : 'Unarchived chat')
        await this.loadChats()
        return
      case 'mute':
      case 'unmute':
        this.showObject(command, await this.client.chats.update(this.requireSelectedChatID(true), { isMuted: command === 'mute' }))
        await this.loadChats()
        return
      case 'pin':
      case 'unpin':
        this.showObject(command === 'pin' ? 'Pin' : 'Unpin', await this.client.chats.update(this.requireSelectedChatID(true), { isPinned: command === 'pin' }))
        await this.loadChats()
        return
      case 'low-priority':
      case 'inbox':
        this.showObject(command === 'low-priority' ? 'Move to Low Priority' : 'Move to Inbox', await this.client.chats.update(this.requireSelectedChatID(true), { isLowPriority: command === 'low-priority' }))
        await this.loadChats()
        return
      case 'title':
        this.showObject('Edit Group', await this.client.chats.update(this.requireSelectedChatID(true), { title: required(args.join(' '), 'title') }))
        await this.loadChats()
        return
      case 'description':
        this.showObject('Edit Group', await this.client.chats.update(this.requireSelectedChatID(true), { description: args.join(' ') || null }))
        return
      case 'avatar':
        this.showObject('Edit Group', await this.client.chats.update(this.requireSelectedChatID(true), { imgURL: required(args[0], 'image path') }))
        return
      case 'message-expiry':
        this.showObject('Message Expiry', await this.client.chats.update(this.requireSelectedChatID(true), {
          messageExpirySeconds: args[0] === 'off' ? null : Number(required(args[0], 'seconds')),
        }))
        return
      case 'notify-anyway':
        this.showObject('Notify anyway', await this.client.chats.notifyAnyway(this.requireSelectedChatID(true)))
        return
      case 'draft':
        this.showObject('Draft', await this.client.chats.update(this.requireSelectedChatID(true), { draft: { text: required(args.join(' '), 'text') } }))
        return
      case 'draft-file':
        await this.setDraftFile(args)
        return
      case 'clear-draft':
        this.showObject('Draft cleared', await this.client.chats.update(this.requireSelectedChatID(true), { draft: null }))
        return
      case 'reply':
        await this.sendMessage(required(args.slice(1).join(' '), 'text'), args[0])
        return
      case 'edit':
        this.showObject('Edit', await this.client.messages.update(required(args[0], 'message id'), {
          chatID: this.requireSelectedChatID(true),
          text: required(args.slice(1).join(' '), 'text'),
        }))
        await this.loadMessages()
        return
      case 'delete':
        await this.client.messages.delete(required(args[0], 'message id'), {
          chatID: this.requireSelectedChatID(true),
          forEveryone: args.includes('--everyone'),
        })
        this.setStatus('Deleted message')
        await this.loadMessages()
        return
      case 'react':
        this.showObject('Reaction', await this.client.chats.messages.reactions.add(required(args[0], 'message id'), {
          chatID: this.requireSelectedChatID(true),
          reactionKey: required(args[1], 'reaction'),
        }))
        return
      case 'unreact':
        this.showObject('Reaction removed', await this.client.chats.messages.reactions.delete(required(args[1], 'reaction'), {
          chatID: this.requireSelectedChatID(true),
          messageID: required(args[0], 'message id'),
        }))
        return
      case 'remind':
        await this.client.chats.reminders.create(this.requireSelectedChatID(true), {
          reminder: {
            remindAt: required(args[0], 'ISO timestamp'),
            dismissOnIncomingMessage: !args.includes('--keep'),
          },
        })
        this.setStatus('Reminder set')
        return
      case 'unremind':
        await this.client.chats.reminders.delete(this.requireSelectedChatID(true))
        this.setStatus('Reminder cleared')
        return
      case 'start':
        this.showObject('Start chat', await this.client.chats.start({
          accountID: required(args[0], 'account id'),
          user: contactFromInput(required(args[1], 'user id or identifier')),
        }))
        await this.loadChats()
        return
      case 'create':
        this.showObject('Create chat', await this.client.chats.create({
          accountID: required(args[0], 'account id'),
          participantIDs: args.slice(1),
          type: args.length > 2 ? 'group' : 'single',
        }))
        await this.loadChats()
        return
      case 'upload':
        await this.uploadAndSend(args)
        return
      case 'upload-base64':
        await this.uploadBase64AndSend(args)
        return
      case 'download':
        this.showObject('Download', await this.client.assets.download({ url: required(args[0], 'url') }))
        return
      case 'serve':
        await this.serveAsset(args)
        return
      case 'export':
        await exportBeeperData(this.client, {
          downloadAttachments: true,
          force: false,
          outDir: required(args[0], 'output directory'),
          quiet: true,
        })
        this.setStatus(`Exported data to ${args[0]}`)
        return
      case 'watch':
        await this.watchEvents(args[0] === 'all')
        return
      case 'unwatch':
        this.stopWatching('Stopped watching events')
        return
      case 'api':
        await this.rawAPI(args)
        return
      default:
        throw new Error(`Unknown command /${command}. Type /help.`)
    }
  }

  private async uploadAndSend(args: string[]): Promise<void> {
    const file = required(args[0], 'file')
    const text = args.slice(1).join(' ')
    const attachment = await this.client.assets.upload({ file: createReadStream(file) })
    this.showObject('Upload', attachment)
    if (!this.selectedChatID) {
      this.setStatus(`Uploaded ${file}`)
      return
    }
    await this.client.messages.send(this.requireSelectedChatID(true), {
      text,
      attachment: attachment.uploadID
        ? {
          uploadID: attachment.uploadID,
          duration: attachment.duration,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          size: attachment.width && attachment.height ? { height: attachment.height, width: attachment.width } : undefined,
        }
        : undefined,
    })
    this.setStatus(`Sent ${file}`)
    await this.loadMessages()
  }

  private async uploadBase64AndSend(args: string[]): Promise<void> {
    const file = required(args[0], 'file')
    const text = args.slice(1).join(' ')
    const attachment = await this.client.assets.uploadBase64({
      content: readFileSync(file).toString('base64'),
    })
    this.showObject('Upload', attachment)
    if (this.selectedChatID) {
      await this.client.messages.send(this.selectedChatID, {
        text,
        attachment: uploadToAttachment(attachment as unknown as RecordValue),
      })
      await this.loadMessages()
    }
  }

  private async setDraftFile(args: string[]): Promise<void> {
    const file = required(args[0], 'file')
    const text = args.slice(1).join(' ')
    const attachment = await this.client.assets.upload({ file: createReadStream(file) })
    const upload = uploadToDraftAttachment(attachment as unknown as RecordValue)
    this.showObject('Draft', await this.client.chats.update(this.requireSelectedChatID(true), {
      draft: {
        text,
        attachments: upload ? { [upload.uploadID]: upload } : undefined,
      },
    }))
  }

  private async serveAsset(args: string[]): Promise<void> {
    const response = await this.client.assets.serve({ url: required(args[0], 'url') })
    this.showObject('Asset', {
      contentLength: response.headers.get('content-length'),
      contentType: response.headers.get('content-type'),
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    })
  }

  private async rawAPI(args: string[]): Promise<void> {
    const method = args[0]
    const path = required(args[1], 'path')
    if (method === 'get') {
      this.showObject(`GET ${path}`, await this.client.get(path))
      return
    }
    if (method === 'post') {
      this.showObject(`POST ${path}`, await this.client.post(path, { body: parseJSON(args.slice(2).join(' ') || '{}') }))
      return
    }
    throw new Error('/api supports: /api get PATH, /api post PATH JSON')
  }

  private async watchEvents(allChats: boolean): Promise<void> {
    this.stopWatching()
    const info = await this.client.info.retrieve()
    const endpoint = info.endpoints.ws_events || '/v1/ws'
    const url = new URL(endpoint, this.client.baseURL)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    this.ws = new WebSocket(url, { headers: { Authorization: `Bearer ${this.client.accessToken}` } } as unknown as string[])
    this.ws.addEventListener('open', () => {
      const chatIDs = allChats || !this.selectedChatID ? ['*'] : [this.selectedChatID]
      this.ws?.send(JSON.stringify({ type: 'subscriptions.set', chatIDs }))
      this.setStatus(`Watching ${chatIDs[0] === '*' ? 'all chats' : titleOf(this.selectedChat)}`)
    })
    this.ws.addEventListener('message', event => {
      const data = typeof event.data === 'string' ? event.data : event.data.toString()
      let parsed: RecordValue | undefined
      try {
        parsed = JSON.parse(data) as RecordValue
      } catch {
        parsed = { event: data }
      }
      this.showObject('Event', parsed)
      if (parsed.type === 'message.upserted' || parsed.type === 'chat.updated') void this.loadMessages()
    })
    this.ws.addEventListener('error', () => this.setError(new Error('WebSocket connection failed')))
    this.ws.addEventListener('close', event => {
      if (this.ws && event.code !== 1000) this.setError(new Error(`WebSocket closed: ${event.code} ${event.reason}`))
      this.ws = undefined
    })
  }

  private stopWatching(status?: string): void {
    if (!this.ws) {
      if (status) this.setStatus(status)
      return
    }
    const ws = this.ws
    this.ws = undefined
    ws.close(1000)
    if (status) this.setStatus(status)
  }

  private async sendMessage(text: string, replyToMessageID?: string): Promise<void> {
    const chatIDValue = this.requireSelectedChatID(true)
    this.showObject('Sending', await this.client.messages.send(chatIDValue, { replyToMessageID, text }))
    await this.loadMessages()
  }

  private showObject(title: string, value: unknown): void {
    this.setDetails(title, `# ${escapeMarkdown(title)}\n\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``)
    this.setStatus(title)
  }

  private requireSelectedChatID(throwIfMissing: true): string
  private requireSelectedChatID(throwIfMissing: false): string | undefined
  private requireSelectedChatID(throwIfMissing: boolean): string | undefined {
    if (this.selectedChatID) return this.selectedChatID
    if (throwIfMissing) throw new Error('Select a chat first')
    return undefined
  }

  private setStatus(value: string): void {
    this.status.content = value
    this.status.fg = colors.muted
  }

  private setError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error)
    this.status.content = message
    this.status.fg = colors.danger
    this.setDetails('Error', `# Error\n\n${escapeMarkdown(message)}`)
  }

  private text(options: TextOptions): TextRenderable {
    return new TextRenderable(this.renderer, options)
  }

  private markdown(options: Omit<ConstructorParameters<typeof MarkdownRenderable>[1], 'syntaxStyle'>): MarkdownRenderable {
    return new MarkdownRenderable(this.renderer, {
      syntaxStyle: markdownStyle,
      conceal: true,
      concealCode: false,
      tableOptions: {
        borderColor: colors.border,
        borderStyle: 'rounded',
        cellPaddingX: 1,
        style: 'grid',
        widthMode: 'full',
        wrapMode: 'word',
      },
      ...options,
    })
  }

  private setDetails(title: string, content: string): void {
    this.detailsBox.title = ` ${title} `
    this.details.content = content
    this.detailsBox.scrollTo(0)
    this.detailsBox.requestRender()
  }

  private setComposer(value: string): void {
    this.clearComposer()
    this.input.insertText(value)
    this.input.gotoBufferEnd()
  }

  private clearComposer(): void {
    this.input.selectAll()
    this.input.deleteSelection()
  }
}

function chatToOption(chat: RecordValue): SelectOption {
  const unread = Number(chat.unreadCount ?? 0)
  const markers = [
    stringField(chat, 'network'),
    unread > 0 ? `${unread} unread` : '',
    isMuted(chat) ? 'muted' : '',
    isArchived(chat) ? 'archived' : '',
    isPinned(chat) ? 'pinned' : '',
  ].filter(Boolean)
  return {
    name: titleOf(chat),
    description: markers.join('  '),
    value: chat,
  }
}

function messageMarkdown(message: RecordValue): string {
  const text = stringField(message, 'text') || stringField(message, 'body')
  if (text) return text
  const html = stringField(message, 'html') || stringField(message, 'formattedBody')
  if (html) return htmlToMarkdownish(html)
  return '_No text_'
}

function messageHeight(message: RecordValue): number {
  const bodyLines = messageMarkdown(message).split('\n').length
  const attachmentLines = attachmentSummary(message)?.split('\n').length ?? 0
  return Math.min(18, Math.max(5, bodyLines + attachmentLines + 5))
}

function titleOf(value: RecordValue | undefined): string {
  if (!value) return 'Unknown'
  return stringField(value, 'title')
    || stringField(value, 'displayName')
    || stringField(value, 'name')
    || stringField(value, 'id')
    || 'Untitled'
}

function chatID(chat: RecordValue): string | undefined {
  return stringField(chat, 'id') || stringField(chat, 'chatID')
}

function stringField(value: RecordValue | undefined, key: string): string | undefined {
  const item = value?.[key]
  return typeof item === 'string' && item ? item : undefined
}

function asRecord(value: unknown): RecordValue | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : undefined
}

function capValue(state: RecordValue | undefined, key: string): string {
  const value = state?.[key]
  if (value == null) return '-'
  if (typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function isMine(message: RecordValue): boolean {
  return message.sender === 'me' || message.isMine === true || message.fromMe === true
}

function isArchived(chat: RecordValue | undefined): boolean {
  return Boolean(chat?.isArchived ?? chat?.archived)
}

function isMuted(chat: RecordValue | undefined): boolean {
  return Boolean(chat?.isMuted ?? chat?.muted)
}

function isUnread(chat: RecordValue | undefined): boolean {
  return Number(chat?.unreadCount ?? 0) > 0 || Boolean(chat?.isUnread)
}

function isPinned(chat: RecordValue | undefined): boolean {
  return Boolean(chat?.isPinned ?? chat?.pinned)
}

function globalActions(): SelectOption[] {
  return [
    action('Start a new chat', 'Create or reuse a direct chat', '/start '),
    action('Manage chat accounts', 'List connected accounts', '/accounts'),
    action('Search...', 'Search chats and messages', '/search '),
    action('Refresh', 'Reload chats', '/refresh'),
    action('Server Status', 'Show Desktop API metadata', '/status'),
    action('Watch Events', 'Subscribe to WebSocket events', '/watch all'),
    action('Export...', 'Export Desktop API data', '/export '),
  ]
}

function chatActions(chat: RecordValue): SelectOption[] {
  const archived = isArchived(chat)
  const muted = isMuted(chat)
  const unread = isUnread(chat)
  const pinned = isPinned(chat)
  return [
    action('Open in Beeper Desktop', 'Focus this chat in the desktop app', '/open'),
    action(archived ? 'Unarchive' : 'Archive', 'Move this chat between Archive and Inbox', archived ? '/unarchive' : '/archive'),
    action(muted ? 'Unmute' : 'Mute', 'Change notifications for this chat', muted ? '/unmute' : '/mute'),
    action(`Mark as ${unread ? 'Read' : 'Unread'}`, 'Update read state', unread ? '/read' : '/unread'),
    action(pinned ? 'Unpin' : 'Pin', 'Pin or unpin this chat', pinned ? '/unpin' : '/pin'),
    action('Search...', 'Search messages in this chat', '/messages '),
    action('Remind Me', 'Set a custom reminder', '/remind '),
    action('Dismiss Reminder', 'Clear the reminder', '/unremind'),
    action('Notify Anyway', 'Force a delivery notification when supported', '/notify-anyway'),
    action('Edit Group...', 'Set title, description, avatar, or expiry with /title, /description, /avatar, /message-expiry', '/chat --all-participants'),
    action('Move to Low Priority', 'Mark this chat as low priority', '/low-priority'),
    action('Move to Inbox', 'Remove low priority state', '/inbox'),
    action('Copy Chat Info', 'Show IDs and metadata', '/chat'),
    action('Watch Events', 'Subscribe to events for this chat', '/watch'),
  ]
}

function action(name: string, description: string, command: string): SelectOption {
  return { name, description, value: command }
}

function focusParams(chatIDValue: string, args: string[]): { chatID: string; messageID?: string; draftText?: string; draftAttachmentPath?: string } {
  const params: { chatID: string; messageID?: string; draftText?: string; draftAttachmentPath?: string } = { chatID: chatIDValue }
  const textIndex = args.indexOf('--text')
  const imageIndex = args.indexOf('--image')
  const messageID = args.find((arg, index) => !arg.startsWith('--') && index !== textIndex + 1 && index !== imageIndex + 1)
  if (messageID) params.messageID = messageID
  if (textIndex >= 0) params.draftText = args.slice(textIndex + 1, imageIndex > textIndex ? imageIndex : undefined).join(' ')
  if (imageIndex >= 0) params.draftAttachmentPath = args[imageIndex + 1]
  return params
}

function uploadToAttachment(attachment: RecordValue | undefined): { uploadID: string; duration?: number; fileName?: string; mimeType?: string; size?: { height: number; width: number } } | undefined {
  const uploadID = stringField(attachment, 'uploadID')
  if (!uploadID) return undefined
  return {
    uploadID,
    duration: numberField(attachment, 'duration'),
    fileName: stringField(attachment, 'fileName'),
    mimeType: stringField(attachment, 'mimeType'),
    size: numberField(attachment, 'width') && numberField(attachment, 'height')
      ? { height: numberField(attachment, 'height')!, width: numberField(attachment, 'width')! }
      : undefined,
  }
}

function uploadToDraftAttachment(attachment: RecordValue | undefined): { uploadID: string; duration?: number; fileName?: string; mimeType?: string; size?: { height: number; width: number } } | undefined {
  return uploadToAttachment(attachment)
}

function numberField(value: RecordValue | undefined, key: string): number | undefined {
  const item = value?.[key]
  return typeof item === 'number' && Number.isFinite(item) ? item : undefined
}

function attachmentSummary(message: RecordValue): string | undefined {
  if (!Array.isArray(message.attachments) || !message.attachments.length) return undefined
  return message.attachments
    .map((attachment, index) => {
      const item = asRecord(attachment)
      const name = stringField(item, 'fileName') || stringField(item, 'name') || stringField(item, 'id') || `attachment-${index + 1}`
      const mime = stringField(item, 'mimeType') || stringField(item, 'type')
      return `attachment ${index + 1}: ${name}${mime ? ` (${mime})` : ''}`
    })
    .join('\n')
}

function formatTimestamp(value: string | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  return `${value.slice(0, Math.max(0, max - 3))}...`
}

function stableID(value: string): string {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash).toString(36)
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!|]/g, '\\$&')
}

function escapeTable(value: string): string {
  return value.replaceAll('|', '\\|').replace(/\n/g, ' ')
}

function htmlToMarkdownish(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()
}

function required(value: string | undefined, label: string): string {
  if (value) return value
  throw new Error(`Missing ${label}`)
}

function parseJSON(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function splitCommand(line: string): string[] {
  const result: string[] = []
  let current = ''
  let quote: '"' | "'" | undefined
  let escaped = false
  for (const char of line) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (quote) {
      if (char === quote) quote = undefined
      else current += char
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (/\s/.test(char)) {
      if (current) {
        result.push(current)
        current = ''
      }
      continue
    }
    current += char
  }
  if (current) result.push(current)
  return result
}

function contactFromInput(value: string): { id?: string; email?: string; phoneNumber?: string; username?: string } {
  if (value.includes('@') && !value.startsWith('@')) return { email: value }
  if (/^\+?[0-9][0-9(). -]+$/.test(value)) return { phoneNumber: value }
  if (value.startsWith('@') || value.includes(':')) return { id: value }
  return { username: value }
}
