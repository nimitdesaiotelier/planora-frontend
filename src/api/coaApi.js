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

export async function fetchCoaList(propertyId, organizationId = 1) {
  const params = new URLSearchParams({
    propertyId: String(propertyId),
    organizationId: String(organizationId),
  });
  const res = await fetch(apiUrl(`/api/coa?${params}`));
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function createCoa({
  coaCode,
  coaName,
  department,
  lineItemType,
  propertyId,
  organizationId = 1,
}) {
  const res = await fetch(apiUrl("/api/coa"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      coaCode,
      coaName,
      department,
      lineItemType,
      propertyId: Number(propertyId),
      organizationId: Number(organizationId),
    }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function updateCoa(
  id,
  { coaCode, coaName, department, lineItemType },
  propertyId,
  organizationId = 1
) {
  const params = new URLSearchParams({
    propertyId: String(propertyId),
    organizationId: String(organizationId),
  });
  const res = await fetch(apiUrl(`/api/coa/${id}?${params}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coaCode, coaName, department, lineItemType }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function deleteCoa(id, propertyId, organizationId = 1) {
  const params = new URLSearchParams({
    propertyId: String(propertyId),
    organizationId: String(organizationId),
  });
  const res = await fetch(apiUrl(`/api/coa/${id}?${params}`), {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await readError(res));
}

/** Same layout as bulk upload — if there are no COA rows yet, file is headers only. Optional `onProgress(0–100)`. */
export async function downloadCoaExport(propertyId, organizationId = 1, onProgress) {
  const params = new URLSearchParams({
    propertyId: String(propertyId),
    organizationId: String(organizationId),
  });
  const url = apiUrl(`/api/coa/export?${params}`);
  if (typeof onProgress === "function") {
    return getBlobWithProgress(url, onProgress);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(await readError(res));
  return res.blob();
}

/** Optional `onProgress(0–100)` during upload. */
export async function uploadCoaExcel(file, propertyId, organizationId = 1, onProgress) {
  const fd = new FormData();
  fd.append("file", file);
  const params = new URLSearchParams({
    propertyId: String(propertyId),
    organizationId: String(organizationId),
  });
  const url = apiUrl(`/api/coa/bulk-upload?${params}`);
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

/** Trigger browser download for a Blob */
export function saveBlobAs(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
