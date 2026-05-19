import { constants, promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { assertWritableSecretValue } from "./metadata.js";

const KEY_PATTERN = /^[A-Z_][A-Z0-9_]*$/;

export async function writeProjectEnvValue({ projectPath, envFile = ".env.local", keyName, value, overwrite = false }) {
  const result = await writeProjectEnvValues({ projectPath, envFile, entries: [{ keyName, value }], overwrite });
  return result.entries[0];
}

export async function writeProjectEnvValues({ projectPath, envFile = ".env.local", entries, overwrite = false }) {
  if (!projectPath) throw new Error("projectPath is required");
  if (!Array.isArray(entries) || entries.length === 0) throw new Error("entries must be a non-empty array");
  const seen = new Set();
  for (const entry of entries) {
    if (!KEY_PATTERN.test(entry?.keyName ?? "")) throw new Error("keyName must be an uppercase environment variable name");
    if (seen.has(entry.keyName)) throw new Error(`duplicate keyName: ${entry.keyName}`);
    seen.add(entry.keyName);
    assertWritableSecretValue(entry.value);
  }
  const projectRoot = await resolveExistingDirectory(projectPath);
  const destination = resolveProjectDestination(projectRoot, envFile);
  let existing = await readIfExists(destination);
  const results = [];
  for (const entry of entries) {
    const next = upsertEnvLine(existing, entry.keyName, entry.value, overwrite);
    existing = next.content;
    results.push({ destination, keyName: entry.keyName, status: next.existed ? "updated" : "created", present: true, replaced: next.replaced });
  }
  await atomicWriteFile(destination, existing, { mode: 0o600 });
  return { destination, entries: results };
}

export async function resolveExistingDirectory(projectPath) {
  const resolved = path.resolve(projectPath);
  const stat = await fs.stat(resolved);
  if (!stat.isDirectory()) throw new Error("projectPath must be a directory");
  return resolved;
}
export function resolveProjectDestination(projectRoot, envFile) {
  if (!envFile || path.isAbsolute(envFile)) throw new Error("envFile must be a project-relative path");
  const destination = path.resolve(projectRoot, envFile);
  const relative = path.relative(projectRoot, destination);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("envFile must stay within projectPath");
  return destination;
}
async function readIfExists(destination) { try { return await fs.readFile(destination, "utf8"); } catch (error) { if (error?.code === "ENOENT") return ""; throw error; } }
function upsertEnvLine(existing, keyName, value, overwrite) {
  const hadTrailingNewline = existing.endsWith("\n");
  const lines = existing.length > 0 ? existing.split(/\n/) : [];
  if (hadTrailingNewline) lines.pop();
  let existed = false; let replaced = false;
  const keyPrefix = `${keyName}=`; const nextLine = `${keyName}=${value}`;
  const nextLines = lines.map((line) => { if (line.startsWith(keyPrefix)) { existed = true; if (!overwrite) return line; replaced = true; return nextLine; } return line; });
  if (existed && !overwrite) throw new Error(`${keyName} already exists; pass --overwrite to replace it`);
  if (!existed) nextLines.push(nextLine);
  return { content: `${nextLines.join("\n")}\n`, existed, replaced };
}
async function atomicWriteFile(destination, content, options) {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const tempPath = path.join(path.dirname(destination), `.${path.basename(destination)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    const handle = await fs.open(tempPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, options.mode);
    try { await handle.writeFile(content, "utf8"); await handle.sync(); } finally { await handle.close(); }
    await fs.rename(tempPath, destination);
    await fs.chmod(destination, options.mode).catch(() => {});
  } catch (error) { await fs.rm(tempPath, { force: true }).catch(() => {}); throw error; }
}
