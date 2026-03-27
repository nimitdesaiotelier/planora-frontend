import { saveBlobAs } from "./coaApi";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

const XLSX_MEDIA =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Prefer simple quoted filename; avoid misparsing RFC 2047 / encoded-word fragments. */
function parseFilenameFromContentDisposition(cd) {
  if (!cd || typeof cd !== "string") return null;
  const quoted = /;\s*filename="((?:[^"\\]|\\.)*)"/i.exec(cd);
  if (quoted?.[1]) {
    const inner = quoted[1].replace(/\\(.)/g, "$1");
    if (inner && !/^\=\?/i.test(inner.trim())) {
      return inner.trim();
    }
  }
  const star = /;\s*filename\*\s*=\s*UTF-8''([^;\n]+)/i.exec(cd);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      /* fall through */
    }
  }
  const unquoted = /;\s*filename=([^;\n]+)/i.exec(cd);
  if (unquoted?.[1]) {
    let v = unquoted[1].trim().replace(/^["']|["']$/g, "");
    if (v && !/^\=\?/i.test(v)) return v;
  }
  return null;
}

function safeExcelFilename(name, fallback = "ask-plan-export.xlsx") {
  let s = (name || "").trim() || fallback;
  if (/=\?|UTF-8_Q|_UTF-8|^\s*=\s*_/i.test(s)) {
    s = fallback;
  }
  s = s.replace(/[/\\?*:"<>|]+/g, "-");
  if (!/\.xlsx$/i.test(s)) {
    s = `${s.replace(/\.+$/g, "")}.xlsx`;
  }
  if (s.length > 180) {
    s = `${s.slice(0, 160)}.xlsx`;
  }
  return s || fallback;
}

function cleanOptionalString(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

export async function askPlan({
  provider,
  question,
  basePlanId,
}) {
  const safeProvider = cleanOptionalString(provider);
  const safeQuestion = cleanOptionalString(question);
  const safeBasePlanId = Number(basePlanId);

  if (!safeProvider) {
    throw new Error("Provider is required.");
  }
  if (!safeQuestion) {
    throw new Error("Question is required.");
  }
  if (!Number.isFinite(safeBasePlanId)) {
    throw new Error("basePlanId is required.");
  }

  const body = {
    provider: safeProvider,
    question: safeQuestion,
    basePlanId: safeBasePlanId,
  };

  const res = await fetch(`${API_BASE}/api/ai/ask-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Ask plan failed (${res.status})`);
  }
  return data;
}

/**
 * POSTs the ask-plan JSON; the server builds title rows from {@code meta.basePlanId} and the plan record.
 * @param {object} [options]
 * @param {boolean} [options.includeChart] - when true, workbook includes a monthly line chart
 */
export async function exportAskPlanExcel(response, options = {}) {
  const body = { response, includeChart: Boolean(options.includeChart) };
  const res = await fetch(`${API_BASE}/api/ai/ask-plan/export-xlsx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition");
  const parsed = parseFilenameFromContentDisposition(cd);
  const filename = safeExcelFilename(parsed, "ask-plan-export.xlsx");
  const typedBlob =
    blob.type && blob.type.includes("spreadsheet")
      ? blob
      : new Blob([blob], { type: XLSX_MEDIA });
  saveBlobAs(typedBlob, filename);
}
