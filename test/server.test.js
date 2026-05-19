import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { createSession } from "../src/sessionStore.js";
import { startIntakeServer } from "../src/server.js";
const DUMMY = "dummy_replicate_token_for_server_flow";
async function makeProject() { return await mkdtemp(path.join(os.tmpdir(), "byokiyb-server-test-")); }
test("mobile intake submit writes dummy value and returns safe metadata only", async (t) => { const projectPath = await makeProject(); const { session, code } = await createSession({ projectPath, envFile: ".env.local", provider: "replicate", keyName: "REPLICATE_API_TOKEN", ttlMs: 600000 }); let server; let localUrl; try { ({ server, localUrl } = await startIntakeServer({ session, code })); } catch (error) { if (error.code === "EPERM" && error.syscall === "listen") { t.skip("sandbox does not permit local listen"); return; } throw error; } try { const res = await fetch(`${localUrl}/submit`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, value: DUMMY }) }); assert.equal(res.status, 200); const text = await res.text(); assert.equal(text.includes(DUMMY), false); assert.equal((await readFile(path.join(projectPath, ".env.local"), "utf8")).includes(DUMMY), true); const replay = await fetch(`${localUrl}/submit`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, value: "another_dummy" }) }); assert.equal(replay.status, 409); } finally { server.close(); } });
