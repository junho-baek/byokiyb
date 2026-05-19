# Implementation Plan: BYOKIYB Issue #3 Env Slot Discovery

Plan file path: `docs/superpowers/plans/2026-05-19-issue-3-env-slot-discovery-plan.md`

## Goal

Implement Issue #3 under the corrected BYOKIYB framing:

BYOKIYB is project-aware ENV slot discovery plus safe mobile handoff. It should help agents identify exact environment variable slots, optionally use lightweight provider hints, explain what the user needs to do, and generate encouraging Telegram-ready guidance for BYOKIYB intake links.

It is not a giant static provider guidebook library. Static manifests and recipes are only starter hints or project manifests.

Required tone:

> 조금만 더 버티면 돼요. 여기까지 완료했어요.

## Scope

In scope:

- Add setup/env slot manifest schema.
- Support optional provider hint fields.
- Add starter `instagram-meta` manifest/example without implying an infinite guidebook library.
- Implement CLI guide command behavior, keeping `byokiyb guide instagram-meta` if compatible.
- Define invalid manifest behavior.
- Add no-private-value and generated-guidance safety tests.
- Ensure encouraging Telegram-ready guidance text.

Out of scope:

- Offer JSON generation.
- Recipe-driven intake start.
- Web guide panel.
- 1Password adapter implementation.
- Actual Meta dashboard validation.

## Acceptance Mapping

### PASS

Issue #3 passes if:

- A manifest schema exists for project-aware ENV slot discovery.
- Manifests can declare required env slots and optional provider hints.
- `instagram-meta` exists as a starter/example manifest only.
- `byokiyb guide instagram-meta` returns useful Telegram-ready guidance if this command already fits the CLI shape.
- Invalid manifests fail with clear, non-crashing errors.
- Generated guidance never includes private values from `.env` or runtime environment.
- Guidance explains login, expected difficulty, resistance points, and what the user needs to provide.
- Guidance uses the corrected product tone and includes: `조금만 더 버티면 돼요. 여기까지 완료했어요.`
- Tests cover schema validation, invalid manifests, no-private-value safety, and generated guidance text.

### PARTIAL

Issue #3 is partial if:

- Env slot manifests work, but provider hints are incomplete.
- `instagram-meta` exists but copy still implies hardcoded guidebook expansion.
- CLI guide works for the starter manifest but invalid manifest behavior is weak.
- Safety tests exist but do not cover both `.env` and `process.env` leakage.
- Guidance is technically correct but not Telegram-ready or not encouraging enough.

### FAIL

Issue #3 fails if:

- Implementation centers static provider guidebooks instead of project-aware env slot discovery.
- Guidance can leak private env values.
- Invalid manifests crash the CLI/server.
- `instagram-meta` is treated as the start of an infinite built-in recipe catalog.
- Tests are absent for safety-sensitive behavior.
- Work includes out-of-scope features like offer JSON generation, web guide panel, recipe-driven intake, 1Password adapter, or actual Meta dashboard validation.

## Implementation Tasks

### 1. Add Tests For Manifest Schema First

Files:

- Create: `test/manifest.test.js`

Add focused tests before implementation. Keep manifest/guide tests separate from env writer, session store, and HTTP server tests so the new setup-slot layer does not pollute secret storage primitives.

Test cases:

- Valid manifest with env slots passes validation.
- Env slot requires a stable slot name such as `META_APP_ID`.
- Env slot may include human-facing description.
- Env slot may include optional provider hint fields.
- Provider hints are optional and absence is valid.
- Invalid manifest with missing slot name fails clearly.
- Invalid manifest with malformed provider hints fails clearly.
- Manifest validation does not require actual provider dashboard access.

Keep tests small and table-driven where practical.

### 2. Define Manifest Shape

Likely files:

- Create: `src/manifest.js`
- Create: `manifests/instagram-meta.json`

Add a minimal schema for project setup-slot manifests. Do not put this in `src/metadata.js`; that file stays focused on request ids, fingerprints, redaction, and agent-safe session metadata.

Suggested shape:

```js
{
  id: "instagram-meta",
  title: "Instagram / Meta setup",
  purpose: "Connect Instagram or Meta APIs for this project.",
  envSlots: [
    {
      name: "META_APP_ID",
      label: "Meta App ID",
      description: "The app identifier from your Meta developer app.",
      required: true,
      providerHint: {
        provider: "Meta",
        dashboardUrl: "https://developers.facebook.com/apps/",
        docsUrl: "https://developers.facebook.com/docs/",
        loginRequired: true,
        difficulty: "medium",
        resistance: "Meta may ask you to confirm business or app details before the value is visible."
      }
    }
  ]
}
```

Constraints:

- Do not add broad recipe logic.
- Do not model every provider-specific edge case.
- Keep fields generic enough for env slot discovery.
- Validate structure explicitly.
- Return useful validation errors.

YAGNI boundary:

- No remote docs fetching.
- No provider dashboard validation.
- No offer JSON.
- No intake execution.

### 3. Add Starter Instagram Meta Manifest

Files:

- Create: `manifests/instagram-meta.json`

Add a starter `instagram-meta` manifest/example.

Important framing:

- Call it a starter hint or project manifest example.
- Avoid language like “provider guidebook library”.
- Avoid implying BYOKIYB has exhaustive hardcoded recipes.
- Make the manifest useful enough for `byokiyb guide instagram-meta`.

Include likely slots only as hints, for example:

- `META_APP_ID`
- `META_APP_SECRET`
- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`

Do not include fake private values.

### 4. Implement Manifest Loading And Validation

Likely files:

- Create: `src/manifest.js`

Implementation steps:

1. Add a manifest lookup by id.
2. Add `validateManifest(manifest)`.
3. Add `getManifest(id)` or equivalent.
4. Ensure unknown manifest ids produce a clear error.
5. Ensure invalid manifests produce actionable messages.

Invalid behavior should be explicit:

- Unknown manifest: `Unknown guide: instagram-meta-typo`
- Invalid manifest: `Invalid manifest instagram-meta: envSlots[0].name is required`

Do not silently skip invalid slots.

### 5. Implement CLI Guide Behavior

File:

- `src/cli.js`

Expected behavior:

- Preserve `byokiyb guide instagram-meta` if compatible with existing CLI style.
- Load the starter manifest.
- Render Telegram-ready guidance.
- Include env slot names.
- Include provider hint links when available.
- Explain login requirement.
- Explain difficulty.
- Explain common resistance.
- Include encouragement.

Guidance requirements:

- Do not include private env values.
- Refer to slots by name.
- Be copy-paste friendly.
- Make clear what the user should collect or paste into BYOKIYB.
- Include Korean encouragement exactly:

```text
조금만 더 버티면 돼요. 여기까지 완료했어요.
```

Example structure:

```text
조금만 더 버티면 돼요. 여기까지 완료했어요.

이 프로젝트에는 아래 ENV 값이 필요해요:

1. META_APP_ID
   Meta 개발자 앱에서 확인해 주세요.
   로그인 필요: 예
   난이도: 보통
   링크: https://developers.facebook.com/apps/

2. META_APP_SECRET
   Meta 개발자 앱 설정에서 확인해 주세요.
   로그인 필요: 예
   난이도: 보통
   주의: 화면 접근 권한이나 앱 역할이 필요할 수 있어요.

BYOKIYB intake 링크에서 실제 값을 안전하게 입력해 주세요. 이 메시지에는 비밀값을 넣지 않았어요.
```

### 6. Add Safety Tests For No Private Values

Files:

- `test/envFile.test.js`
- `test/session.test.js`
- `test/server.test.js`

Add tests that prove guidance does not leak:

- Values from parsed `.env` content.
- Values from `process.env`.
- Existing session private values.
- Placeholder values that look like secrets.

Test pattern:

1. Set env/private value to an unmistakable dummy marker like `dummy_meta_value_for_guidance_leak_test`.
2. Generate guidance.
3. Assert output contains slot name like `META_APP_SECRET`.
4. Assert output does not contain the private value.

This is the highest-risk behavior; keep these tests direct.

### 7. Do Not Add Server-Level Behavior In Issue #3

File:

- `src/server.js` remains out of scope unless a test proves the guide command cannot work without touching it.

Reason:

- Issue #3 is CLI/manifest guidance only.
- Web guide panels and HTTP guide endpoints belong to later issues.
- Keep the intake server focused on one-time value submission and safe metadata.

Do not add a web guide panel or new server endpoint for this issue.

### 8. Update Skill Copy

File:

- `skills/byokiyb/SKILL.md`

Update product framing:

- BYOKIYB identifies exact env variable slots.
- It can use starter hints or project manifests.
- It should find current official docs/dashboard links when needed.
- It explains login, difficulty, and resistance.
- It creates safe BYOKIYB intake links.
- It should encourage the user with: `조금만 더 버티면 돼요. 여기까지 완료했어요.`

Remove or soften any wording that implies:

- Giant static provider guidebook library.
- Exhaustive provider recipes.
- Hardcoded guidebooks as the core product.

### 9. Update README

File:

- `README.md`

Add a short section describing:

- Env slot discovery.
- Starter manifest usage.
- Example command:

```bash
byokiyb guide instagram-meta
```

State clearly:

- Starter manifests are hints.
- Actual project context determines required env slots.
- BYOKIYB guidance should never include private values.

### 10. Verify With Tests

Run:

```bash
npm test
```

If tests are split:

```bash
node --test test/envFile.test.js
node --test test/session.test.js
node --test test/server.test.js
```

Also verify CLI manually:

```bash
node src/cli.js guide instagram-meta
```

Expected manual checks:

- Output includes env slot names.
- Output includes official Meta dashboard/docs links if encoded in the starter hint.
- Output includes login/difficulty/resistance text.
- Output includes `조금만 더 버티면 돼요. 여기까지 완료했어요.`
- Output does not include any private values from `.env`, sessions, or `process.env`.

## DRY/YAGNI Notes

- Keep manifest validation centralized in `src/manifest.js`.
- Keep guidance rendering centralized so CLI and server do not duplicate copy rules.
- Avoid provider-specific branching outside starter manifest data.
- Do not add a broad provider recipe engine or docs database. A tiny local manifest loader/validator for declared setup slots is allowed and required for this issue.
- Do not add dashboard scraping or validation.
- Do not introduce a plugin architecture for providers.
- Do not add offer JSON or intake-start behavior.

## Closure Gate

Before closing Issue #3, confirm:

- `npm test` passes.
- `node src/cli.js guide instagram-meta` works.
- Invalid manifest tests pass.
- Unknown guide behavior is clear.
- Safety tests prove private values are not emitted.
- README and skill docs reflect corrected BYOKIYB framing.
- No out-of-scope features were added.
- The implementation plan has been saved at:

```text
docs/superpowers/plans/2026-05-19-issue-3-env-slot-discovery-plan.md
```