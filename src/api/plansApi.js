const API_BASE = import.meta.env.VITE_API_BASE ?? "";

function url(path) {
  return `${API_BASE}${path}`;
}

export async function fetchPlans(propertyId) {
  const qs =
    propertyId != null && propertyId !== ""
      ? `?propertyId=${encodeURIComponent(propertyId)}`
      : "";
  const res = await fetch(url(`/api/plans${qs}`));
  if (!res.ok) throw new Error(`Plans failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function createPlan(payload) {
  const res = await fetch(url("/api/plans"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Create plan failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function deletePlan(planId) {
  const res = await fetch(url(`/api/plans/${planId}`), { method: "DELETE" });
  if (!res.ok) throw new Error(`Delete plan failed: ${res.status} ${await res.text()}`);
}

export async function fetchProperties(organizationId) {
  const qs =
    organizationId != null
      ? `?organizationId=${encodeURIComponent(organizationId)}`
      : "";
  const res = await fetch(url(`/api/properties${qs}`));
  if (!res.ok) throw new Error(`Properties failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function fetchLineItems(planId) {
  const res = await fetch(url(`/api/plans/${planId}/line-items`));
  if (!res.ok) throw new Error(`Line items failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Maps backend DTO to grid row shape */
export function lineItemToRow(dto) {
  return {
    id: dto.id,
    coaCode: dto.coaCode ?? dto.lineKey,
    coaName: dto.coaName ?? dto.label,
    lineKey: dto.lineKey,
    department: dto.department,
    type: dto.type,
    category: dto.category,
    label: dto.label,
    values: dto.values,
    dailyDetails: dto.dailyDetails ?? {},
    actualsValues: dto.actualsValues ?? {},
  };
}

/**
 * @param {object} body - { values } or { values, dailyDetails }. When dailyDetails is set, the server
 *   stores dailies and sets month totals from the sum of each month’s days.
 */
export async function patchLineItemValues(planId, lineItemId, body) {
  const res = await fetch(url(`/api/plans/${planId}/line-items/${lineItemId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Save failed: ${res.status} ${await res.text()}`);
  return res.json();
}
