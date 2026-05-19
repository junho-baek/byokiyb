import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { createSession, safeSession, updateSession } from "../src/sessionStore.js";
async function makeProject() { return await mkdtemp(path.join(os.tmpdir(), "byokiyb-session-test-")); }
test("creates agent-safe metadata without raw values", async () => { const { session, code } = await createSession({ projectPath: await makeProject(), envFile: ".env.local", provider: "replicate", keyName: "REPLICATE_API_TOKEN", ttlMs: 600000 }); const safe = safeSession(session); assert.equal(safe.rawValueReturned, false); assert.equal(safe.provider, "replicate"); assert.equal(safe.keyName, "REPLICATE_API_TOKEN"); assert.ok(code.length >= 6); assert.equal(JSON.stringify(safe).includes(code), false); });
test("revoked session metadata stays value-free", async () => { const { session } = await createSession({ projectPath: await makeProject(), envFile: ".env.local", provider: "replicate", keyName: "REPLICATE_API_TOKEN", ttlMs: 600000 }); const revoked = await updateSession(session.requestId, { status: "revoked" }); assert.equal(safeSession(revoked).status, "revoked"); assert.equal("value" in safeSession(revoked), false); });
