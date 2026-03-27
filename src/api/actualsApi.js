import { saveBlobAs } from "./coaApi.js";
import { getBlobWithProgress, postFormDataJsonWithProgress } from "../utils/xhrTransfer.js";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

async function readError(res) {
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    if (j.error) return j.error;
  } catch {
    /* ignore */
  }
  return text || `Request failed (${res.status})`;
}

/** Years that have at least one actuals row for this property (newest first). */
export async function fetchActualsYears(propertyId, organizationId = 1) {
  const params = new URLSearchParams({
    propertyId: String(propertyId),
    organizationId: String(organizationId),
  });
  const res = await fetch(apiUrl(`/api/actuals/years?${params}`));
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function fetchActuals(year, propertyId, organizationId = 1) {
  const params = new URLSearchParams({
    year: String(year),
    propertyId: String(propertyId),
    organizationId: String(organizationId),
  });
  const res = await fetch(apiUrl(`/api/actuals?${params}`));
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

/** Same layout as upload — if there is no data yet, file is headers only. Optional `onProgress(0–100)`. */
export async function downloadActualsExport(year, propertyId, organizationId = 1, onProgress) {
  const params = new URLSearchParams({
    year: String(year),
    propertyId: String(propertyId),
    organizationId: String(organizationId),
  });
  const url = apiUrl(`/api/actuals/export?${params}`);
  if (typeof onProgress === "function") {
    return getBlobWithProgress(url, onProgress);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(await readError(res));
  return res.blob();
}

/** Optional `onProgress(0–100)` during upload. */
export async function uploadActualsExcel(file, year, propertyId, organizationId = 1, onProgress) {
  const fd = new FormData();
  fd.append("file", file);
  const params = new URLSearchParams({
    year: String(year),
    propertyId: String(propertyId),
    organizationId: String(organizationId),
  });
  const url = apiUrl(`/api/actuals/upload?${params}`);
  if (typeof onProgress === "function") {
    return postFormDataJsonWithProgress(url, fd, onProgress);
  }
  const res = await fetch(url, {
    method: "POST",
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  return data;
}

export { saveBlobAs };
