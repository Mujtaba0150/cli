# accounts

Read when: listing or adding chat-network accounts (WhatsApp, Discord,
iMessage, etc.), choosing a default account for `--account`-filtered
commands, or removing one.

## Commands

```sh
beeper accounts list   [--account SELECTOR]... [--ids]
beeper accounts add    [type] [--flow ID] [--login-id ID] [--cookie name=value]... [--field id=value]... [--non-interactive] [--no-guided]
beeper accounts show   <selector>
beeper accounts use    <selector | "">              # "" clears defaultAccount
beeper accounts remove <selector>
```

## Notes

- An *account selector* matches by account ID, network name, bridge type/id,
  or user identity (display name, username, email, phone).
- `accounts add` without a type lists every available network with its
  current connection status.
- `accounts use NAME` persists `defaultAccount` in CLI config. Subsequent
  account-scoped commands fall back to that default when `--account` is
  omitted.
- `accounts use ""` clears the default.
- `accounts list --json` annotates the default account with `default: true`.
- For non-interactive sign-in, pass `--flow`, `--field`, and `--cookie` and
  add `--non-interactive` to fail instead of prompting.

## Examples

```sh
beeper accounts list --json
beeper accounts add whatsapp
beeper accounts add discord --non-interactive --cookie sessionid=…
beeper accounts use whatsapp-main
beeper accounts use ""
beeper accounts show whatsapp-main --json
beeper accounts remove whatsapp-main
```
