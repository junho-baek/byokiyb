import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { createSession } from "../src/sessionStore.js";
import { startIntakeServer } from "../src/server.js";
const DUMMY = "dummy_replicate_token_for_server_flow";
async function makeProject() { return await mkdtemp(path.join(os.tmpdir(), "byokiyb-server-test-")); }
test("mobile intake submit writes dummy value and returns safe metadata only", async (t) => { const projectPath = await makeProject(); const { session, code } = await createSession({ projectPath, envFile: ".env.local", provider: "replicate", keyName: "REPLICATE_API_TOKEN", ttlMs: 600000 }); let server; let localUrl; try { ({ server, localUrl } = await startIntakeServer({ session, code })); } catch (error) { if (error.code === "EPERM" && error.syscall === "listen") { t.skip("sandbox does not permit local listen"); return; } throw error; } try { const res = await fetch(`${localUrl}/submit`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, value__REPLICATE_API_TOKEN: DUMMY }) }); assert.equal(res.status, 200); const text = await res.text(); assert.equal(text.includes(DUMMY), false); assert.equal((await readFile(path.join(projectPath, ".env.local"), "utf8")).includes(DUMMY), true); const replay = await fetch(`${localUrl}/submit`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, value__REPLICATE_API_TOKEN: "another_dummy" }) }); assert.equal(replay.status, 409); } finally { server.close(); } });


test("mobile intake can submit multiple keys in one form without echoing values", async (t) => {
  const projectPath = await makeProject();
  const first = "dummy_meta_app_secret_for_multi_server_flow";
  const second = "dummy_meta_verify_token_for_multi_server_flow";
  const { session, code } = await createSession({ projectPath, envFile: ".env.local", provider: "instagram-meta", keyNames: ["OWNCANVAS_META_APP_SECRET", "OWNCANVAS_META_WEBHOOK_VERIFY_TOKEN"], ttlMs: 600000 });
  let server; let localUrl;
  try { ({ server, localUrl } = await startIntakeServer({ session, code })); } catch (error) { if (error.code === "EPERM" && error.syscall === "listen") { t.skip("sandbox does not permit local listen"); return; } throw error; }
  try {
    const page = await fetch(localUrl).then((res) => res.text());
    assert.equal(page.includes("OWNCANVAS_META_APP_SECRET"), true);
    assert.equal(page.includes("OWNCANVAS_META_WEBHOOK_VERIFY_TOKEN"), true);
    const res = await fetch(`${localUrl}/submit`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, value__OWNCANVAS_META_APP_SECRET: first, value__OWNCANVAS_META_WEBHOOK_VERIFY_TOKEN: second }) });
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.equal(text.includes(first), false);
    assert.equal(text.includes(second), false);
    const env = await readFile(path.join(projectPath, ".env.local"), "utf8");
    assert.equal(env.includes(`OWNCANVAS_META_APP_SECRET=${first}`), true);
    assert.equal(env.includes(`OWNCANVAS_META_WEBHOOK_VERIFY_TOKEN=${second}`), true);
  } finally { server.close(); }
});
