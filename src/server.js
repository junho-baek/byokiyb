import http from "node:http";
import { URLSearchParams } from "node:url";
import { fingerprintValue } from "./metadata.js";
import { writeProjectEnvValues } from "./envFile.js";
import { isExpired, loadSession, safeSession, saveSession, verifyCode } from "./sessionStore.js";

export function startIntakeServer({ session, code, overwrite = false, host = "127.0.0.1" }) {
  const server = http.createServer(async (req, res) => {
    setSafeHeaders(res);
    try {
      if (req.method === "GET" && req.url === "/health") return sendJson(res, 200, { ok: true });
      if (req.method === "GET" && req.url?.startsWith(`/r/${session.requestId}`)) return sendHtml(res, renderPage(session));
      if (req.method === "POST" && req.url === `/r/${session.requestId}/submit`) return await handleSubmit(req, res, session.requestId, overwrite);
      return sendJson(res, 404, { error: "not_found" });
    } catch (error) {
      return sendJson(res, 500, { error: "internal_error", message: String(error.message ?? error).replace(/=.*/, "") });
    }
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, port, localUrl: `http://${host}:${port}/r/${session.requestId}`, code });
    });
  });
}

async function handleSubmit(req, res, requestId, overwrite) {
  const body = await readBody(req);
  const params = new URLSearchParams(body);
  const code = params.get("code");
  const session = await loadSession(requestId);
  if (session.status === "written") return sendJson(res, 409, { error: "replay_rejected", status: "replayed" });
  if (session.status === "revoked") return sendJson(res, 410, { error: "revoked" });
  if (isExpired(session)) {
    session.status = "expired";
    await saveSession(session);
    return sendJson(res, 410, { error: "expired" });
  }
  if (!verifyCode(session, code)) return sendJson(res, 403, { error: "invalid_code" });
  const slots = sessionSlots(session);
  const entries = slots.map((slot) => ({ keyName: slot.keyName, value: params.get(fieldName(slot.keyName)) }));
  const writeResult = await writeProjectEnvValues({ projectPath: session.projectPath, envFile: session.envFile, entries, overwrite });
  const fingerprints = {};
  session.slots = slots.map((slot, index) => {
    const value = entries[index].value;
    const fingerprint = fingerprintValue(value);
    fingerprints[slot.keyName] = fingerprint;
    return { ...slot, present: true, fingerprint, status: writeResult.entries[index].status, rawValueReturned: false };
  });
  session.status = "written";
  session.present = true;
  session.fingerprints = fingerprints;
  if (session.slots.length === 1) session.fingerprint = session.slots[0].fingerprint;
  session.writtenAt = new Date().toISOString();
  session.destination = writeResult.destination;
  await saveSession(session);
  return sendJson(res, 200, safeSession(session));
}

function sessionSlots(session) {
  if (Array.isArray(session.slots) && session.slots.length > 0) return session.slots;
  return [{ keyName: session.keyName, provider: session.provider }];
}
function fieldName(keyName) { return `value__${keyName}`; }
function renderPage(session) {
  const slots = sessionSlots(session);
  const slotInputs = slots.map((slot) => `<label>${escapeHtml(slot.label ?? slot.keyName)}</label><p class="meta">Key: ${escapeHtml(slot.keyName)}</p><input name="${escapeHtml(fieldName(slot.keyName))}" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" required>`).join("\n");
  const keyText = slots.length === 1 ? escapeHtml(slots[0].keyName) : `${slots.length} keys: ${escapeHtml(slots.map((slot) => slot.keyName).join(", "))}`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BYOKIYB Intake</title><style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;margin:0;background:#101014;color:#f7f7f8}.wrap{max-width:560px;margin:0 auto;padding:28px}.card{background:#1b1b22;border:1px solid #333443;border-radius:24px;padding:22px}label{display:block;margin:16px 0 8px;color:#c9c9d3}input{box-sizing:border-box;width:100%;font-size:18px;padding:14px;border-radius:14px;border:1px solid #44465a;background:#0d0d12;color:#fff}button{margin-top:18px;width:100%;border:0;border-radius:16px;padding:15px;font-size:17px;font-weight:700;background:#ff9568;color:#18100c}.meta{font-size:14px;line-height:1.5;color:#b6b6c1;word-break:break-word}.warn{color:#ffd0bd}</style></head><body><main class="wrap"><section class="card"><h1>Bring Your Own Key In Your Bed</h1><p class="warn">Do not paste these values into chat. This page stores keys locally and never displays them back.</p><p class="meta">Project: ${escapeHtml(session.projectPath)}<br>Destination: ${escapeHtml(session.envFile)}<br>Keys: ${keyText}<br>Provider: ${escapeHtml(session.provider)}<br>Expires: ${escapeHtml(session.expiresAt)}</p><form method="post" action="/r/${session.requestId}/submit"><label>One-time code</label><input name="code" inputmode="numeric" autocomplete="one-time-code" required>${slotInputs}<button>Save locally</button></form></section></main></body></html>`;
}
function setSafeHeaders(res) { res.setHeader("Cache-Control", "no-store"); res.setHeader("Referrer-Policy", "no-referrer"); res.setHeader("X-Content-Type-Options", "nosniff"); }
function sendHtml(res, html) { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(html); }
function sendJson(res, status, payload) { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(payload, null, 2) + "\n"); }
function readBody(req) { return new Promise((resolve, reject) => { let body = ""; req.setEncoding("utf8"); req.on("data", (chunk) => { body += chunk; if (body.length > 1024 * 1024) req.destroy(); }); req.on("end", () => resolve(body)); req.on("error", reject); }); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])); }
