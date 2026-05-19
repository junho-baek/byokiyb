import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { getManifest, renderManifestGuide, validateManifest } from "../src/manifest.js";

const validManifest = {
  id: "test-meta",
  title: "Test Meta setup",
  purpose: "Discover project ENV slots.",
  envSlots: [
    {
      name: "META_APP_ID",
      label: "Meta App ID",
      description: "The app identifier from the provider dashboard.",
      required: true,
      providerHint: {
        provider: "Meta",
        dashboardUrl: "https://developers.facebook.com/apps/",
        docsUrl: "https://developers.facebook.com/docs/",
        loginRequired: true,
        difficulty: "medium",
        resistance: "Dashboard access may depend on app role."
      }
    }
  ]
};

test("valid manifest with env slots and provider hints passes validation", () => {
  const result = validateManifest(validManifest);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("provider hints are optional", () => {
  const result = validateManifest({
    id: "minimal",
    title: "Minimal setup",
    envSlots: [{ name: "META_APP_ID", description: "Stable slot name to collect." }]
  });
  assert.equal(result.valid, true);
});

test("env slot requires a stable slot name", () => {
  const result = validateManifest({
    id: "missing-slot",
    title: "Missing slot",
    envSlots: [{ description: "No name." }]
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /envSlots\[0\]\.name is required/);
});

test("malformed provider hints fail clearly", () => {
  const result = validateManifest({
    id: "bad-hint",
    title: "Bad hint",
    envSlots: [{ name: "META_APP_ID", providerHint: { loginRequired: "yes" } }]
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /envSlots\[0\]\.providerHint\.loginRequired must be a boolean/);
});

test("manifest validation does not require provider dashboard access", () => {
  const result = validateManifest({
    id: "offline",
    title: "Offline",
    envSlots: [
      {
        name: "META_APP_ID",
        providerHint: {
          provider: "Meta",
          dashboardUrl: "https://developers.facebook.com/apps/",
          loginRequired: true
        }
      }
    ]
  });
  assert.equal(result.valid, true);
});

test("loads the starter instagram-meta manifest", async () => {
  const manifest = await getManifest("instagram-meta");
  assert.equal(manifest.id, "instagram-meta");
  assert.ok(manifest.envSlots.some((slot) => slot.name === "META_APP_SECRET"));
});

test("unknown manifest ids fail with a clear error", async () => {
  await assert.rejects(getManifest("does-not-exist"), /Unknown guide: does-not-exist/);
});

test("rendered guidance is Telegram-ready and explains expected resistance", () => {
  const output = renderManifestGuide(validManifest);
  assert.match(output, /조금만 더 버티면 돼요\. 여기까지 완료했어요\./);
  assert.match(output, /META_APP_ID/);
  assert.match(output, /로그인 필요: 예/);
  assert.match(output, /난이도: 보통/);
  assert.match(output, /Dashboard access may depend on app role/);
  assert.match(output, /BYOKIYB intake 링크/);
});

test("rendered guidance does not leak process env or project env file values", async () => {
  const secret = "dummy_meta_value_for_guidance_leak_test";
  const oldSecret = process.env.META_APP_SECRET;
  process.env.META_APP_SECRET = secret;
  const projectPath = await mkdtemp(path.join(os.tmpdir(), "byokiyb-manifest-test-"));
  await writeFile(path.join(projectPath, ".env.local"), `META_APP_SECRET=${secret}\n`);
  try {
    const output = renderManifestGuide(validManifest);
    assert.match(output, /META_APP_ID/);
    assert.doesNotMatch(output, new RegExp(secret));
  } finally {
    if (oldSecret === undefined) delete process.env.META_APP_SECRET;
    else process.env.META_APP_SECRET = oldSecret;
  }
});

test("rendered guidance includes slot names but not existing session private values", () => {
  const sessionPrivateValue = "existing-session-private-value-456";
  const output = renderManifestGuide(validManifest);
  assert.match(output, /META_APP_ID/);
  assert.doesNotMatch(output, new RegExp(sessionPrivateValue));
});
