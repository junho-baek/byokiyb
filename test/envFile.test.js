import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { writeProjectEnvValue, writeProjectEnvValues } from "../src/envFile.js";
const DUMMY = "dummy_replicate_token_for_env_writer_test";
async function makeProject() { return await mkdtemp(path.join(os.tmpdir(), "byokiyb-env-test-")); }
test("writes a dummy provider value only to the project-scoped env file", async () => { const projectPath = await makeProject(); await writeProjectEnvValue({ projectPath, envFile: ".env.local", keyName: "REPLICATE_API_TOKEN", value: DUMMY }); assert.equal(await readFile(path.join(projectPath, ".env.local"), "utf8"), `REPLICATE_API_TOKEN=${DUMMY}\n`); });
test("preserves unrelated env lines and comments when adding a key", async () => { const projectPath = await makeProject(); await writeFile(path.join(projectPath, ".env.local"), "# existing comment\nOTHER_SETTING=dummy_other\n"); await writeProjectEnvValue({ projectPath, envFile: ".env.local", keyName: "REPLICATE_API_TOKEN", value: DUMMY }); assert.equal(await readFile(path.join(projectPath, ".env.local"), "utf8"), `# existing comment\nOTHER_SETTING=dummy_other\nREPLICATE_API_TOKEN=${DUMMY}\n`); });
test("rejects existing keys unless overwrite is explicit", async () => { const projectPath = await makeProject(); const target = path.join(projectPath, ".env.local"); await writeFile(target, "REPLICATE_API_TOKEN=existing_dummy\n"); await assert.rejects(writeProjectEnvValue({ projectPath, envFile: ".env.local", keyName: "REPLICATE_API_TOKEN", value: DUMMY }), /already exists/); assert.equal(await readFile(target, "utf8"), "REPLICATE_API_TOKEN=existing_dummy\n"); await writeProjectEnvValue({ projectPath, envFile: ".env.local", keyName: "REPLICATE_API_TOKEN", value: DUMMY, overwrite: true }); assert.equal(await readFile(target, "utf8"), `REPLICATE_API_TOKEN=${DUMMY}\n`); });
test("rejects paths outside the project and values containing NUL or newlines", async () => { const projectPath = await makeProject(); await assert.rejects(writeProjectEnvValue({ projectPath, envFile: "../.env.local", keyName: "REPLICATE_API_TOKEN", value: DUMMY }), /within projectPath/); await assert.rejects(writeProjectEnvValue({ projectPath, envFile: ".env.local", keyName: "REPLICATE_API_TOKEN", value: "dummy\nmultiline" }), /NUL or newline/); });


test("writes multiple dummy provider values atomically", async () => {
  const projectPath = await makeProject();
  await writeFile(path.join(projectPath, ".env.local"), "# existing comment\n");
  const result = await writeProjectEnvValues({ projectPath, envFile: ".env.local", entries: [
    { keyName: "OWNCANVAS_META_APP_SECRET", value: "dummy_meta_app_secret_for_multi_env_writer" },
    { keyName: "OWNCANVAS_META_WEBHOOK_VERIFY_TOKEN", value: "dummy_meta_verify_token_for_multi_env_writer" }
  ] });
  assert.equal(result.entries.length, 2);
  assert.equal(await readFile(path.join(projectPath, ".env.local"), "utf8"), "# existing comment\nOWNCANVAS_META_APP_SECRET=dummy_meta_app_secret_for_multi_env_writer\nOWNCANVAS_META_WEBHOOK_VERIFY_TOKEN=dummy_meta_verify_token_for_multi_env_writer\n");
});

test("rejects duplicate multi-key writes before touching env file", async () => {
  const projectPath = await makeProject();
  await assert.rejects(writeProjectEnvValues({ projectPath, envFile: ".env.local", entries: [
    { keyName: "OWNCANVAS_META_APP_SECRET", value: "dummy_one" },
    { keyName: "OWNCANVAS_META_APP_SECRET", value: "dummy_two" }
  ] }), /duplicate keyName/);
  await assert.rejects(readFile(path.join(projectPath, ".env.local")), /ENOENT/);
});
