const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export async function parseBudgetInstruction(provider, rowLabel, instruction, values, planId, lineKey) {
  const res = await fetch(`${API_BASE}/api/ai/parse-instruction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      rowLabel,
      instruction,
      values,
      planId: Number(planId),
      lineKey,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `AI request failed (${res.status})`);
  }
  return data;
}

/**
 * Normalizes API response for UI. Backend returns { summary, instructions[], newValues }.
 */
export function normalizeParsedForTransform(raw) {
  let instructions = raw.instructions;
  if (!Array.isArray(instructions) || instructions.length === 0) {
    if (raw.action) {
      instructions = [
        {
          action: raw.action,
          value: raw.value,
          type: raw.type,
          period: raw.period,
          summary: raw.summary,
        },
      ];
    } else {
      instructions = [];
    }
  }
  const summary =
    raw.summary?.trim() ||
    instructions
      .map((s) => s.summary)
      .filter(Boolean)
      .join(" · ") ||
    "";
  return { summary, instructions };
}
