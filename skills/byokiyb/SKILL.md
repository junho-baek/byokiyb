---
name: byokiyb
description: Use Bring Your Own Key In Your Bed for safe mobile credential handoff without exposing raw values to agents.
---

# BYOKIYB

Use this skill when a project needs an API key, token, app secret, or provider credential from the user.

## Rules

- Never ask the user to paste raw values into chat, issues, docs, prompts, or logs.
- Run `byokiyb intake` for exactly one provider/key/destination.
- Send the user only the local/Tailscale URL, one-time code, key name, destination, and expiry.
- Verify with `byokiyb status <request-id> --json` or MCP metadata only.
- Do not read or print `.env.local` values.

## Example

```bash
byokiyb intake --project /path/to/project --env .env.local --provider replicate --key REPLICATE_API_TOKEN --ttl 10m --json
```

The agent may report `present: true`, `status: written`, and a non-secret fingerprint. It must never report the raw value.
