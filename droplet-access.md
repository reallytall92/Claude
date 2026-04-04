# Remote Access (Shared)

This page is the quick reference for SSH access in this repo:
- Linux droplet (`do-droplet`)
- Isolated OpenClaw droplet (`openclaw-droplet`)
- Windows gaming PC over Tailscale (`gaming-pc-tailscale`)

Host alias (SSH config):
- Name: do-droplet
- HostName: 165.227.117.11
- User: root
- IdentityFile: ~/.ssh/id_ed25519

Add to `~/.ssh/config`:
```
Host do-droplet
  HostName 165.227.117.11
  User root
  IdentityFile ~/.ssh/id_ed25519
```

Windows notes (OpenSSH):
- Keep the private key at `C:\Users\<you>\.ssh\id_ed25519` (no `.txt` extension).
- If you create/edit the key in Notepad, save as plain text UTF-8.
- Restrict key permissions:
  - `icacls $HOME\.ssh\id_ed25519 /inheritance:r`
  - `icacls $HOME\.ssh\id_ed25519 /grant:r "$($env:USERNAME):(R)"`
- If SSH reports `invalid format`, confirm the file still includes:
  - `-----BEGIN OPENSSH PRIVATE KEY-----`
  - `-----END OPENSSH PRIVATE KEY-----`
  and re-save the file as plain text UTF-8.

Usage:
- ssh do-droplet

Verify:
- `ssh do-droplet "hostname"`

Checks:
- systemctl status smartsheet-web-ui --no-pager
- journalctl -u smartsheet-web-ui -n 200 --no-pager

Env:
- Single env file lives at `/opt/.env` (shared by services).
- Ensure smartsheet systemd units point `EnvironmentFile` to `/opt/.env`.

## OpenClaw Isolated Droplet

Host alias (SSH config):
- Name: openclaw-droplet
- HostName: 159.203.167.18
- User: johnkret
- IdentityFile: ~/.ssh/id_ed25519_openclaw

Add to `~/.ssh/config`:
```
Host openclaw-droplet
  HostName 159.203.167.18
  User johnkret
  IdentityFile ~/.ssh/id_ed25519_openclaw
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
```

Usage:
- `ssh openclaw-droplet`

Verify:
- `ssh openclaw-droplet "hostname"`
- `ssh openclaw-droplet "whoami && hostname && uname -a"`

Notes:
- This droplet is intended to stay isolated from local-machine access; OpenClaw and related app services should run fully on-host.
- Use the dedicated SSH key `~/.ssh/id_ed25519_openclaw` for this host instead of the shared default droplet key.
- Ongoing SSH access is through the non-root sudo user `johnkret`; root SSH login is disabled.
- Password auth is disabled, `ufw` is enabled with only `OpenSSH` allowed inbound, and `fail2ban` is active for the `sshd` jail.
- When OpenClaw is installed, keep the gateway loopback-only and access the dashboard via SSH tunnel:
  - `ssh -N -L 18789:127.0.0.1:18789 openclaw-droplet`
  - then open `http://127.0.0.1:18789/`
- Do not open port `18789` publicly in `ufw` unless there is a later deliberate tailnet or proxy design.
- The co-located nutrition backend is also loopback-only:
  - PostgreSQL: `127.0.0.1:5432`
  - nutrition API: `127.0.0.1:18890`
  - systemd unit: `nutrition-chat-api.service`
- Full OpenClaw deployment/security notes: `docs/codex/integrations/openclaw.md`

## Gaming PC Over Tailscale (Mac/Linux client)

Host alias (SSH config):
- Name: gaming-pc-tailscale
- HostName: 100.122.121.17
- User: reall
- IdentityFile: ~/.ssh/id_ed25519

Add to `~/.ssh/config`:
```
Host gaming-pc-tailscale
  HostName 100.122.121.17
  User reall
  IdentityFile ~/.ssh/id_ed25519
```

Usage:
- `ssh gaming-pc-tailscale`
- `ssh gaming-pc-tailscale "whoami && hostname"`

Quick process check:
- `ssh gaming-pc-tailscale "powershell -NoProfile -Command \"Get-Process | Sort-Object CPU -Descending | Select-Object -First 20 ProcessName,Id,CPU | Format-Table -AutoSize\""`

Notes:
- Connectivity path is private Tailscale (no public router port forwarding required).
- Windows OpenSSH for admin users reads `C:\ProgramData\ssh\administrators_authorized_keys`.
- Keep password auth disabled after key auth is verified.
- Full setup/runbook: `docs/codex/ops/gaming-pc-remote-testing.md`.
