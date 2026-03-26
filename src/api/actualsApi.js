const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export async function fetchActuals(year, propertyId, organizationId = 1) {
  const params = new URLSearchParams({
    year: String(year),
    propertyId: String(propertyId),
    organizationId: String(organizationId),
  });
  const res = await fetch(`${API_BASE}/api/actuals?${params}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadActualsExcel(file, year, propertyId, organizationId = 1) {
  const fd = new FormData();
  fd.append("file", file);
  const params = new URLSearchParams({
    year: String(year),
    propertyId: String(propertyId),
    organizationId: String(organizationId),
  });
  const res = await fetch(`${API_BASE}/api/actuals/upload?${params}`, {
    method: "POST",
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  return data;
}
