---
name: byokiyb
description: Use Bring Your Own Key In Your Bed to create project-aware environment slots and guide the user to fill them safely from mobile without exposing raw values to agents.
---

# BYOKIYB

Use this skill when a project needs an environment variable value such as an API key, token, app secret, webhook value, or provider-specific configuration entry from the user.

BYOKIYB is not a static provider guidebook library and not a vault replacement. It is an agent-era setup handoff layer:

> Stop pasting secrets into AI chats. Send the right key to the right local project from bed.

## Core job

1. Inspect the project and determine the exact environment variable slot needed.
2. Explain what the slot is for in plain language.
3. Use starter hints or project manifests when available, then find current official docs/dashboard links when needed.
4. Tell the user whether login is required, how annoying the step is likely to be, and what they should expect.
5. Start a BYOKIYB intake for the exact project/key/destination.
6. Send a touchable link plus code/status details, never the raw value.
7. Verify only with metadata: `present`, `status`, destination, request id, and non-secret fingerprint.

## Rules

- Never ask the user to paste raw values into chat, issues, docs, prompts, or logs.
- Do not maintain giant hardcoded provider guidebooks as the primary workflow.
- Prefer live/current official docs or dashboard links when the project needs a provider value.
- Use static recipes only as starter hints or project manifests, not as the source of truth for every provider.
- Encourage the user with: `조금만 더 버티면 돼요. 여기까지 완료했어요.`
- Run `byokiyb intake` for exactly one provider/key/destination at a time unless the project provides a clear setup manifest.
- Send the user only the local/Tailscale URL, one-time code, key name, destination, expiry, and concise instructions.
- Verify with `byokiyb status <request-id> --json` or MCP metadata only.
- Do not read or print `.env.local` values.
- If the destination is a vault/reference writer such as 1Password, describe the reference target and status only; never expose raw values.

## User guidance tone

Be specific, calm, and encouraging. The user may be on a phone in bed. Reduce resistance.

Good examples:

- “조금만 더 버티면 돼요. 지금은 Meta Dashboard에서 App Secret만 찾으면 됩니다.”
- “여기까지 완료했어요: project slot은 만들었고, 이제 이 링크에 값만 넣으면 됩니다.”
- “로그인이 필요할 수 있어요. 난이도는 중간입니다. Dashboard UI에서 App settings → Basic 쪽을 찾으면 됩니다.”
- “값은 채팅에 붙이지 마세요. 아래 링크에만 붙여넣으면 됩니다.”

## Discovery checklist

Before starting intake, gather:

- Project root path.
- Environment variable name, for example `REPLICATE_API_TOKEN` or `META_APP_SECRET`.
- Destination mode: plaintext `.env.local`, 1Password reference, or future adapter.
- Provider/dashboard official link.
- Whether login or account/admin access is required.
- Short “where to find it” instruction.
- Safety warning about not pasting the value into chat.

## Example

```bash
byokiyb intake \
  --project /path/to/project \
  --env .env.local \
  --provider replicate \
  --key REPLICATE_API_TOKEN \
  --ttl 10m \
  --json
```

The agent may report `present: true`, `status: written`, destination, and a non-secret fingerprint. It must never report the raw value.
