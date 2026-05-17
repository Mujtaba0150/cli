# @beeper/cli-plugin-cloudflare

Cloudflare Tunnel commands for Beeper CLI.

```sh
beeper plugins install @beeper/cli-plugin-cloudflare
beeper targets tunnel
```

`targets tunnel` exposes the selected Beeper Desktop or Server API target through
a Cloudflare quick tunnel and keeps the tunnel running until interrupted.

```sh
beeper targets tunnel desktop
beeper targets tunnel --target server
beeper targets tunnel --base-url http://127.0.0.1:23373
beeper targets tunnel --url-only
```

The command uses `cloudflared`. If it is already installed, pass its path:

```sh
BEEPER_CLOUDFLARED_PATH=/opt/homebrew/bin/cloudflared beeper targets tunnel
```

Or let the plugin download the pinned `cloudflared` binary:

```sh
beeper targets tunnel --install
```

Tunneling makes the Desktop API reachable from the public internet. Only run it
for targets and networks you intend to expose, and stop it with `Ctrl-C` when you
are done.
