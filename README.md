# Bring Your Own Key In Your Bed (BYOKIYB)

**Stop pasting secrets into AI chats. Send keys to your local project from bed.**

BYOKIYB is a local-first mobile setup assistant for agent-operated projects: your phone gets the friendly form, your project gets the `.env.local` entry, and agents get only safe status.

- CLI name: `byokiyb`
- V1: CLI + mobile one-time intake + `.env.local` writer
- Agents receive only presence/status/metadata, never raw values.

## Why

When you operate agents from Telegram/mobile, you often need to provide provider keys such as `REPLICATE_API_TOKEN`. Do not paste those values into chat. BYOKIYB starts a short-lived local web intake page so the value goes directly to the target project destination.

## Quick start

```bash
npm install
node src/cli.js intake --project /path/to/project --env .env.local --provider replicate --key REPLICATE_API_TOKEN --ttl 10m --json
```

Open the returned URL on the same machine, LAN, or Tailscale-accessible browser and enter the one-time code. The submitted value is written to the project-scoped `.env.local`.

## Env slot discovery

BYOKIYB helps agents identify exact environment variable slots before starting a safe intake. Starter manifests are hints, not exhaustive provider guidebooks; actual project context determines which slots are required.

```bash
node src/cli.js guide instagram-meta
```

The guide output names the ENV slots, points to starter dashboard/docs hints when available, explains login/difficulty/resistance, and reminds the user to enter private values only through a BYOKIYB intake link. Guidance should never include private values from `.env.local`, runtime environment variables, chat, logs, or status output.

## Tailscale / mobile use

For mobile operation, run the CLI on your workstation and expose the local server through a trusted path such as Tailscale. Public tunnels should be paired with the one-time code, short TTL, and immediate revoke/stop after use.

## Threat model

BYOKIYB protects against accidental exposure through chat, agent prompts, stdout, status output, GitHub issues, docs, and MCP responses. V1 is local-first for a single local user. It is not a hosted vault, multi-user auth system, cloud sync service, or encrypted keychain. `.env.local` is plaintext; use OS/keychain backends in future versions for stronger at-rest protection.

## Commands

```bash
byokiyb intake --project <path> --env .env.local --provider replicate --key REPLICATE_API_TOKEN --ttl 10m --json --offer-file /tmp/byokiyb-offer.json
byokiyb guide instagram-meta
byokiyb status <request-id> --json
byokiyb list --json
byokiyb revoke <request-id> --json
byokiyb doctor
```

## Agent boundary

Agents may see only: provider, key name, destination, request id, status, timestamps, presence, and non-secret fingerprint. Agents must never receive raw values.

Seed/spec: [`SEED.yaml`](./SEED.yaml). Implementation seed: [`IMPLEMENTATION_SEED.yaml`](./IMPLEMENTATION_SEED.yaml). MCP schema: [`docs/mcp-tools.md`](./docs/mcp-tools.md). Hermes skill draft: [`skills/byokiyb/SKILL.md`](./skills/byokiyb/SKILL.md).
