#!/usr/bin/env node
import { createSession, listSessions, loadSession, safeSession, saveSession } from "./sessionStore.js";
import { startIntakeServer } from "./server.js";
import { redactJson } from "./metadata.js";

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = { _: [] };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (!arg.startsWith("--")) { opts._.push(arg); continue; }
    const key = arg.slice(2);
    if (["json", "overwrite"].includes(key)) opts[key] = true;
    else opts[key] = rest[++i];
  }
  return { command, opts };
}
function ttlToMs(ttl = "10m") {
  const m = String(ttl).match(/^(\d+)(s|m|h)$/);
  if (!m) throw new Error("ttl must look like 30s, 10m, or 1h");
  return Number(m[1]) * ({ s: 1000, m: 60000, h: 3600000 }[m[2]]);
}
function help() {
  return `BYOKIYB — Bring Your Own Key In Your Bed\n\nUsage:\n  byokiyb intake --project <path> --env .env.local --provider replicate --key REPLICATE_API_TOKEN [--ttl 10m] [--host 127.0.0.1] [--json]\n  byokiyb status <request-id> [--json]\n  byokiyb list [--json]\n  byokiyb revoke <request-id> [--json]\n  byokiyb doctor\n\nAgents receive only status/metadata. Raw values must be entered only in the mobile web page, never in chat.\n`;
}
async function main() {
  const { command, opts } = parseArgs(process.argv.slice(2));
  if (!command || command === "--help" || command === "help") { process.stdout.write(help()); return; }
  if (command === "doctor") { process.stdout.write("ok: byokiyb local-first mode ready\n"); return; }
  if (command === "intake") {
    const provider = opts.provider;
    const keyName = opts.key;
    const projectPath = opts.project ?? process.cwd();
    const envFile = opts.env ?? ".env.local";
    if (!provider || !keyName) throw new Error("--provider and --key are required");
    const { session, code } = await createSession({ projectPath, envFile, provider, keyName, ttlMs: ttlToMs(opts.ttl), hostHint: opts.host ?? "127.0.0.1" });
    const { server, port, localUrl } = await startIntakeServer({ session, code, host: opts.host ?? "127.0.0.1", overwrite: Boolean(opts.overwrite) });
    session.port = port; session.localUrl = localUrl; await saveSession(session);
    const output = { ...safeSession(session), localUrl, oneTimeCode: code, instructions: "Open localUrl in the browser and enter the one-time code. Do not paste raw values into chat." };
    process.stdout.write(opts.json ? redactJson(output) : `Open: ${localUrl}\nCode: ${code}\nKey: ${keyName}\nDestination: ${envFile}\n`);
    process.stdout.write("BYOKIYB intake server is running. Press Ctrl+C to stop after submission.\n");
    await new Promise((resolve) => server.on("close", resolve));
    return;
  }
  if (command === "status") { process.stdout.write(redactJson(safeSession(await loadSession(opts._[0])))); return; }
  if (command === "list") { process.stdout.write(redactJson((await listSessions()).map(safeSession))); return; }
  if (command === "revoke") { const session = await loadSession(opts._[0]); if (session.status !== "written") session.status = "revoked"; await saveSession(session); process.stdout.write(redactJson(safeSession(session))); return; }
  throw new Error(`unknown command: ${command}`);
}
main().catch((error) => { console.error(`error: ${error.message}`); process.exit(1); });
