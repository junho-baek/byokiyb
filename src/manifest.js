import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestDir = path.resolve(__dirname, "../manifests");
const ENCOURAGEMENT = "조금만 더 버티면 돼요. 여기까지 완료했어요.";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertString(value, field, errors, { required = true } = {}) {
  if (value === undefined) {
    if (required) errors.push(`${field} is required`);
    return;
  }
  if (typeof value !== "string" || value.trim() === "") errors.push(`${field} must be a non-empty string`);
}

function validateProviderHint(hint, field, errors) {
  if (hint === undefined) return;
  if (!isObject(hint)) {
    errors.push(`${field} must be an object`);
    return;
  }
  assertString(hint.provider, `${field}.provider`, errors, { required: false });
  assertString(hint.dashboardUrl, `${field}.dashboardUrl`, errors, { required: false });
  assertString(hint.docsUrl, `${field}.docsUrl`, errors, { required: false });
  assertString(hint.difficulty, `${field}.difficulty`, errors, { required: false });
  assertString(hint.resistance, `${field}.resistance`, errors, { required: false });
  if (hint.loginRequired !== undefined && typeof hint.loginRequired !== "boolean") {
    errors.push(`${field}.loginRequired must be a boolean`);
  }
}

export function validateManifest(manifest) {
  const errors = [];
  if (!isObject(manifest)) return { valid: false, errors: ["manifest must be an object"] };

  assertString(manifest.id, "id", errors);
  assertString(manifest.title, "title", errors);
  assertString(manifest.purpose, "purpose", errors, { required: false });

  if (!Array.isArray(manifest.envSlots) || manifest.envSlots.length === 0) {
    errors.push("envSlots must be a non-empty array");
  } else {
    manifest.envSlots.forEach((slot, index) => {
      const field = `envSlots[${index}]`;
      if (!isObject(slot)) {
        errors.push(`${field} must be an object`);
        return;
      }
      assertString(slot.name, `${field}.name`, errors);
      assertString(slot.label, `${field}.label`, errors, { required: false });
      assertString(slot.description, `${field}.description`, errors, { required: false });
      if (slot.required !== undefined && typeof slot.required !== "boolean") {
        errors.push(`${field}.required must be a boolean`);
      }
      validateProviderHint(slot.providerHint, `${field}.providerHint`, errors);
    });
  }

  return { valid: errors.length === 0, errors };
}

export function assertValidManifest(manifest, manifestId = manifest?.id ?? "unknown") {
  const result = validateManifest(manifest);
  if (!result.valid) throw new Error(`Invalid manifest ${manifestId}: ${result.errors.join("; ")}`);
  return manifest;
}

export async function getManifest(id) {
  assertString(id, "manifest id", [], { required: true });
  const manifestPath = path.join(manifestDir, `${id}.json`);
  let raw;
  try {
    raw = await fs.readFile(manifestPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") throw new Error(`Unknown guide: ${id}`);
    throw error;
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid manifest ${id}: ${error.message}`);
  }
  return assertValidManifest(manifest, id);
}

function loginText(value) {
  if (value === true) return "예";
  if (value === false) return "아니요";
  return "확인 필요";
}

function difficultyText(value) {
  if (value === "easy") return "쉬움";
  if (value === "medium") return "보통";
  if (value === "hard") return "어려움";
  return value ?? "확인 필요";
}

export function renderManifestGuide(manifest) {
  const safeManifest = assertValidManifest(manifest);
  const lines = [
    ENCOURAGEMENT,
    "",
    `${safeManifest.title}`,
  ];
  if (safeManifest.purpose) lines.push(safeManifest.purpose);
  lines.push("", "이 프로젝트에는 아래 ENV 값이 필요해요:", "");

  safeManifest.envSlots.forEach((slot, index) => {
    const hint = slot.providerHint ?? {};
    lines.push(`${index + 1}. ${slot.name}`);
    if (slot.label) lines.push(`   항목: ${slot.label}`);
    if (slot.description) lines.push(`   설명: ${slot.description}`);
    lines.push(`   로그인 필요: ${loginText(hint.loginRequired)}`);
    lines.push(`   난이도: ${difficultyText(hint.difficulty)}`);
    if (hint.dashboardUrl) lines.push(`   대시보드: ${hint.dashboardUrl}`);
    if (hint.docsUrl) lines.push(`   공식 문서: ${hint.docsUrl}`);
    if (hint.resistance) lines.push(`   주의: ${hint.resistance}`);
    lines.push("");
  });

  lines.push("BYOKIYB intake 링크에서 실제 값을 안전하게 입력해 주세요.");
  lines.push("이 안내에는 비밀값을 넣지 않았고, 채팅에 raw value를 붙여넣지 않아도 됩니다.");
  return `${lines.join("\n")}\n`;
}
