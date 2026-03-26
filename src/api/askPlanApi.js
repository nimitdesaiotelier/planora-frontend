const API_BASE = import.meta.env.VITE_API_BASE ?? "";

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
