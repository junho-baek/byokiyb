import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, randomInt } from "node:crypto";
import { createRequestId, toAgentSafeMetadata } from "./metadata.js";
import { resolveExistingDirectory, resolveProjectDestination } from "./envFile.js";

export async function createSession({ projectPath, envFile, provider, keyName, keyNames, slots, ttlMs, hostHint, port }) {
  const projectRoot = await resolveExistingDirectory(projectPath);
  const destination = resolveProjectDestination(projectRoot, envFile);
  const now = new Date();
  const requestId = createRequestId();
  const code = `${randomInt(100000, 999999)}`;
  const normalizedSlots = normalizeSlots({ provider, keyName, keyNames, slots });
  const session = {
    requestId,
    codeHash: hashCode(code),
    provider,
    keyName: normalizedSlots.length === 1 ? normalizedSlots[0].keyName : undefined,
    keyNames: normalizedSlots.map((slot) => slot.keyName),
    slots: normalizedSlots.map((slot) => ({ ...slot, present: false, rawValueReturned: false })),
    projectPath: projectRoot,
    envFile,
    destination,
    status: "pending",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    present: false,
    rawValueReturned: false,
    hostHint,
    port
  };
  await saveSession(session);
  return { session, code };
}
function normalizeSlots({ provider, keyName, keyNames, slots }) {
  if (Array.isArray(slots) && slots.length > 0) return slots.map((slot) => ({ provider: slot.provider ?? provider, keyName: slot.keyName, label: slot.label }));
  const names = Array.isArray(keyNames) && keyNames.length > 0 ? keyNames : [keyName];
  return names.filter(Boolean).map((name) => ({ provider, keyName: name }));
}
export async function stateDir() { const dir = path.join(process.cwd(), ".byokiyb", "requests"); await fs.mkdir(dir, { recursive: true, mode: 0o700 }); return dir; }
export async function sessionPath(requestId) { return path.join(await stateDir(), `${requestId}.json`); }
export async function saveSession(session) { await fs.writeFile(await sessionPath(session.requestId), JSON.stringify(session, null, 2), { mode: 0o600 }); }
export async function loadSession(requestId) { return JSON.parse(await fs.readFile(await sessionPath(requestId), "utf8")); }
export async function listSessions() { const dir = await stateDir(); const files = await fs.readdir(dir).catch(() => []); const out = []; for (const file of files.filter(f => f.endsWith(".json"))) { try { out.push(JSON.parse(await fs.readFile(path.join(dir, file), "utf8"))); } catch {} } return out.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))); }
export async function updateSession(requestId, patch) { const session = { ...(await loadSession(requestId)), ...patch }; await saveSession(session); return session; }
export function isExpired(session, now = new Date()) { return now.getTime() > new Date(session.expiresAt).getTime(); }
export function verifyCode(session, code) { return session.codeHash === hashCode(String(code ?? "")); }
export function safeSession(session) { return toAgentSafeMetadata(session); }
function hashCode(code) { return createHash("sha256").update(code, "utf8").digest("hex"); }
