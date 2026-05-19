import { createHash, randomUUID } from "node:crypto";

const SAFE_FIELDS = ["requestId", "provider", "keyName", "destination", "status", "createdAt", "expiresAt", "fingerprint", "present", "rawValueReturned"];

export function createRequestId() { return `req_${randomUUID().replaceAll("-", "").slice(0, 16)}`; }
export function fingerprintValue(value) { assertWritableSecretValue(value); return `sha256:${createHash("sha256").update(value, "utf8").digest("hex").slice(0, 16)}`; }
export function assertWritableSecretValue(value) {
  if (typeof value !== "string" || value.length === 0) throw new Error("value must be a non-empty string");
  if (value.includes("\0") || value.includes("\n") || value.includes("\r")) throw new Error("value must not contain NUL or newline characters");
}
export function toAgentSafeMetadata(session) {
  if (!session || typeof session !== "object") throw new Error("session metadata is required");
  const metadata = {};
  for (const field of SAFE_FIELDS) if (session[field] !== undefined) metadata[field] = session[field];
  metadata.present = Boolean(session.present ?? session.fingerprint);
  metadata.rawValueReturned = false;
  return metadata;
}
export function redactJson(value) { return JSON.stringify(value, null, 2) + "\n"; }
