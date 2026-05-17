# Final proposal: Beeper CLI setup redesign

## Product goal

`beeper setup` should make the CLI usable in the fastest, safest, least confusing way possible.

For most desktop users, setup should feel like:

```bash
beeper setup
```

```txt
✨ Found Beeper Desktop signed in as you@beeper.com

Use this Desktop session for CLI access?
This is the fastest option and works with your already-synced apps.

Press Enter to connect, or choose another option.
```

Enter = done.

---

# 1. Setup concepts

## Connection targets

The CLI can connect to:

1. **Local Beeper Desktop**
2. **Remote Beeper Desktop**
3. **Beeper Server**
4. **Manual/custom config**

## Auth methods

The CLI can authenticate via:

1. **Local Desktop session**
   - Reads Matrix/access token from local Beeper Desktop DB/cache/config.
   - Best for trusted local machines.
   - No browser flow.
   - Highest convenience.

2. **OAuth / PKCE**
   - Browser-based authorization.
   - Explicit, limited, revocable permissions.
   - Good for remote, safer, or enterprise-like setups.

3. **Manual token/config**
   - Escape hatch.
   - Advanced users only.

---

# 2. Internal provider IDs

Use these:

```ts
type SetupProvider =
  | "desktop-local"
  | "desktop-oauth"
  | "desktop-install"
  | "server-install"
  | "remote-oauth"
  | "manual";
```

Optional richer model:

```ts
type SetupTarget =
  | "desktop"
  | "remote"
  | "server"
  | "manual";

type SetupAuthMethod =
  | "local"
  | "oauth"
  | "manual";

type SetupAction =
  | "connect"
  | "install"
  | "repair";
```

Connection config:

```ts
type ConnectionConfig =
  | {
      id: string;
      name: string;
      target: "desktop";
      auth: "local";
      desktopPath?: string;
      userId?: string;
      homeserverUrl?: string;
      accessTokenRef: string;
    }
  | {
      id: string;
      name: string;
      target: "desktop";
      auth: "oauth";
      endpoint: string;
      accessTokenRef: string;
      refreshTokenRef?: string;
      scopes: string[];
    }
  | {
      id: string;
      name: string;
      target: "remote";
      auth: "oauth";
      endpoint: string;
      accessTokenRef: string;
      refreshTokenRef?: string;
      scopes: string[];
    }
  | {
      id: string;
      name: string;
      target: "server";
      auth: "oauth" | "manual";
      endpoint: string;
      accessTokenRef: string;
    };
```

---

# 3. User-facing command structure

## Primary command

```bash
beeper setup
```

Interactive smart wizard.

## Explicit setup commands

```bash
beeper setup desktop
beeper setup desktop --local
beeper setup desktop --oauth
beeper setup desktop --install
beeper setup desktop --repair

beeper setup remote
beeper setup remote --url <url>

beeper setup server
beeper setup server --install
beeper setup server --url <url>

beeper setup manual
```

## Auth commands

```bash
beeper auth status
beeper auth list
beeper auth use <connection>
beeper auth logout
beeper auth logout <connection>

beeper auth desktop --local
beeper auth desktop --oauth

beeper auth remote --url <url>
beeper auth manual
```

## Install commands

```bash
beeper install desktop
beeper install server
```

## Diagnostics

```bash
beeper doctor
beeper doctor desktop
beeper doctor server
beeper doctor auth
```

---

# 4. Default `beeper setup` behavior

`beeper setup` should inspect the machine first.

Detection order:

1. Is there an existing valid CLI connection?
2. Is Beeper Desktop installed?
3. Is Beeper Desktop running?
4. Is Beeper Desktop logged in?
5. Is Desktop API reachable?
6. Can we read local Desktop session/cache/token?
7. Is Desktop synced enough to be useful?
8. Is Beeper Server already configured locally?
9. Is there a remote URL from env/config?

Then display a contextual menu.

---

# 5. Main UX flows

## Case A: Desktop installed, logged in, token readable

Default to `desktop-local`.

```txt
$ beeper setup

✨ Beeper CLI setup

Found:
  ✅ Beeper Desktop installed
  ✅ Signed in as you@beeper.com
  ✅ Local Desktop session available

Recommended:
  1. Connect to local Beeper Desktop
     Fastest. Uses your existing Desktop session and synced apps.

Other options:
  2. Authorize with browser
     OAuth/PKCE with explicit permissions.

  3. Connect to remote Beeper Desktop or Server
  4. Install or setup Beeper Server
  5. Manual setup

Select [1]:
```

Success:

```txt
✅ Connected to local Beeper Desktop
✅ Account: you@beeper.com
✅ Ready to use synced apps

Try:
  beeper chats
  beeper send
```

---

## Case B: Desktop installed but not logged in

```txt
$ beeper setup

Found:
  ✅ Beeper Desktop installed
  ⚠️  Not signed in

What would you like to do?

  1. Open Beeper Desktop and sign in
  2. Authorize with browser
  3. Connect to remote Beeper Desktop or Server
  4. Install/setup Beeper Server
  5. Manual setup

Select [1]:
```

If user picks 1:

```txt
Opening Beeper Desktop...

Sign in to Beeper Desktop to continue.
Waiting for login...
```

After login:

```txt
✅ Login detected

Connect using this local Desktop session? [Y/n]
```

---

## Case C: Desktop not installed

```txt
$ beeper setup

Beeper Desktop was not found on this computer.

Recommended:
  1. Install Beeper Desktop
     Best for personal desktop use.

Other options:
  2. Connect to remote Beeper Desktop or Server
  3. Setup Beeper Server
  4. Manual setup

Select [1]:
```

---

## Case D: Existing connection exists

```txt
$ beeper setup

Beeper CLI is already connected:

  Active connection:
    Local Beeper Desktop
    you@beeper.com

What would you like to do?

  1. Keep current setup
  2. Reconnect local Desktop
  3. Add another connection
  4. Switch connection
  5. Remove connection
  6. Run doctor

Select [1]:
```

---

# 6. Naming and copy

Avoid scary words in the main UI:

Avoid:

- “full access”
- “unrestricted”
- “extract token”
- “database scraping”
- “steal token”
- “read DB”

Use:

- “Connect to local Beeper Desktop”
- “Use your existing Desktop session”
- “Authorize with browser”
- “Limited permissions”
- “Remote Beeper Desktop or Server”

Advanced/debug text can be more explicit:

```txt
Auth method: desktop-local
Source: local Beeper Desktop session cache
```

---

# 7. Permissions model

## `desktop-local`

User-facing:

```txt
Uses your signed-in Beeper Desktop app on this computer.
Best for trusted personal machines.
```

Advanced detail:

```txt
This gives the CLI similar access to your local Desktop app.
```

## `desktop-oauth`

```txt
Uses browser authorization with explicit permissions.
Recommended when you want limited or revocable access.
```

## `remote-oauth`

```txt
Connects to another Beeper Desktop or Beeper Server using browser authorization.
```

---

# 8. Configuration model

Support multiple named connections.

Example:

```json
{
  "activeConnection": "local-desktop",
  "connections": {
    "local-desktop": {
      "name": "Local Beeper Desktop",
      "target": "desktop",
      "auth": "local",
      "userId": "@you:beeper.com",
      "homeserverUrl": "https://matrix.beeper.com",
      "accessTokenRef": "keychain:beeper-cli/local-desktop"
    },
    "work-server": {
      "name": "Work Beeper Server",
      "target": "remote",
      "auth": "oauth",
      "endpoint": "https://beeper.example.com",
      "scopes": ["chats:read", "messages:send"],
      "accessTokenRef": "keychain:beeper-cli/work-server"
    }
  }
}
```

Store secrets in OS keychain when possible.

Fallback:

- macOS Keychain
- Windows Credential Manager
- libsecret on Linux
- encrypted local file if needed
- plaintext only with explicit opt-in

---

# 9. First-principles changes I would make

## A. Separate “setup” from “auth”

`setup` is a guided product experience.

`auth` is credential management.

So:

```bash
beeper setup
```

is for humans.

```bash
beeper auth desktop --local
```

is for power users/scripts.

---

## B. Make Desktop the default product path

Most users probably have Desktop.

So the CLI should assume:

> “You already use Beeper Desktop. Let me connect to that.”

Instead of starting from abstract auth concepts.

---

## C. Support multiple connections from day one

Even if v1 only uses one, the mental model should support:

```bash
beeper auth list
beeper auth use personal
beeper auth use server-prod
```

This prevents painful future migrations.

---

## D. Add `doctor`

Every setup flow should have a diagnostic equivalent.

```bash
beeper doctor desktop
```

Should check:

- Desktop installed
- Desktop running
- user logged in
- Desktop API reachable
- token readable
- token valid
- homeserver reachable
- config writable
- keychain writable

---

## E. Add repair paths, not just errors

Bad:

```txt
Error: token not found
```

Good:

```txt
Could not find a local Desktop session.

Try:
  1. Open Beeper Desktop and sign in
  2. Reconnect with browser authorization
  3. Run beeper doctor desktop
```

---

## F. Make install part of setup

If Desktop is missing, don’t dead-end. Offer install.

```bash
beeper setup desktop --install
```

Could use platform-specific instructions first, then automation later.

---

## G. Keep advanced/manual flows hidden but available

Manual setup should exist, but never be the recommended path unless detection fails badly.

---

# 10. Recommended MVP

Implement in this order:

1. `beeper setup`
2. `desktop-local`
3. `desktop-oauth`
4. `remote-oauth`
5. `auth status/list/use/logout`
6. `doctor desktop`
7. `desktop-install`
8. `server-install`
9. `manual`

MVP wizard options:

```txt
1. Connect to local Beeper Desktop
2. Authorize with browser
3. Connect to remote Beeper
4. Manual setup
```

Then add install/server polish after.

---

# 11. Final recommended top-level menu

```txt
✨ Beeper CLI setup

Recommended:
  1. Connect to local Beeper Desktop
     Fastest. Uses your signed-in Desktop app on this computer.

Other ways to connect:
  2. Authorize with browser
     OAuth/PKCE with explicit permissions.

  3. Connect to remote Beeper Desktop or Server
     For another machine or hosted server.

Setup:
  4. Install or repair Beeper Desktop
  5. Install or setup Beeper Server

Advanced:
  6. Manual setup

Select [1]:
```

That is the core experience I’d build around.
