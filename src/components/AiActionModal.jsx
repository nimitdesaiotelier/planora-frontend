import { useState } from "react";
import { normalizeParsedForTransform, parseBudgetInstruction } from "../api/aiApi";
import { formatLineAmount, rowTotal } from "../utils/applyTransformation";
import { MONTHS } from "../data/budgetData";

const LINE_ITEM_QUICK_ACTIONS = [
  { label: "+5%", prompt: "Increase by 5%" },
  { label: "+10%", prompt: "Increase by 10%" },
  { label: "-$1,000", prompt: "Reduce by $1000" },
  { label: "Copy prior-year budget", prompt: "Set equal to last year budget" },
];

function parseFiscalYear(fy) {
  if (fy == null || fy === "") return null;
  const n = Number(fy);
  return Number.isFinite(n) ? n : null;
}

export default function AiActionModal({ planId, row, fiscalYear, onApply, onClose }) {
  const quickActions = LINE_ITEM_QUICK_ACTIONS;
  const promptPlaceholder = 'e.g. "Increase by 12% for Q2"';
  const effectiveRow = row;

  const [provider, setProvider] = useState("openai");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { raw, parsed, newValues, newDailyDetails }

  if (!effectiveRow) return null;

  async function handleRun(instruction) {
    const text = instruction || prompt.trim();
    if (!text) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const raw = await parseBudgetInstruction(
        provider,
        effectiveRow.label,
        text,
        effectiveRow.values,
        planId,
        effectiveRow.lineKey,
        {
          fiscalYear: parseFiscalYear(fiscalYear),
          lineItemType: effectiveRow.type ?? null,
          dailyDetails:
            effectiveRow.dailyDetails && Object.keys(effectiveRow.dailyDetails).length > 0
              ? effectiveRow.dailyDetails
              : null,
        }
      );
      const parsed = normalizeParsedForTransform(raw);
      const newValues = raw.newValues ?? {};
      const newDailyDetails = raw.newDailyDetails ?? null;
      setResult({ raw, parsed, newValues, newDailyDetails });
    } catch (err) {
      setError(err.message || "AI request failed. Configure keys on the server.");
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!result || effectiveRow.id == null || !onApply) return;
    const body =
      result.newDailyDetails != null
        ? { values: result.newValues, dailyDetails: result.newDailyDetails }
        : { values: result.newValues };
    onApply(effectiveRow.id, body, result.parsed.summary);
  }

  const beforeTotal = rowTotal(effectiveRow.values);
  const afterTotal = result ? rowTotal(result.newValues) : null;
  const diff = afterTotal !== null ? afterTotal - beforeTotal : null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box ai-modal">
        <div className="modal-header">
          <div className="row-badge">{row.category}</div>
          <h2>
            ✨ AI Action — <span className="row-name">{row.label}</span>
          </h2>
          <button className="close-btn" type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="ai-provider-row">
          <span className="quick-label">Model</span>
          <select
            className="provider-select"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            disabled={loading}
          >
            <option value="openai">OpenAI (server key)</option>
            <option value="gemini">Gemini (server key)</option>
          </select>
        </div>

        <div className="quick-actions">
          <span className="quick-label">Quick:</span>
          {quickActions.map((qa) => (
            <button
              key={qa.label}
              className="quick-btn"
              type="button"
              onClick={() => {
                setPrompt(qa.prompt);
                handleRun(qa.prompt);
              }}
              disabled={loading}
            >
              {qa.label}
            </button>
          ))}
        </div>

        <div className="prompt-area">
          <textarea
            className="prompt-input"
            placeholder={promptPlaceholder}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleRun();
              }
            }}
          />
          <button
            className="btn-primary run-btn"
            type="button"
            onClick={() => handleRun()}
            disabled={loading || !prompt.trim()}
          >
            {loading ? <span className="spinner" /> : "Run AI →"}
          </button>
        </div>

        {error && <div className="error-banner">⚠️ {error}</div>}

        {result && (
          <div className="result-panel">
            <div className="result-section">
              <div className="result-section-title">AI Parsed Intent (JSON)</div>
              <pre className="json-output">{JSON.stringify(result.raw, null, 2)}</pre>
            </div>

            <div className="summary-banner">💬 {result.parsed.summary}</div>
            {result.parsed.warnings?.length > 0 && (
              <div className="warning-banner">⚠️ {result.parsed.warnings.join(" ")}</div>
            )}

            <div className="before-after">
              <div className="ba-card before">
                <div className="ba-label">Before (Annual Total)</div>
                <div className="ba-value">{formatLineAmount(effectiveRow, beforeTotal)}</div>
              </div>
              <div className="ba-arrow">→</div>
              <div className="ba-card after">
                <div className="ba-label">After (Annual Total)</div>
                <div className="ba-value">{formatLineAmount(effectiveRow, afterTotal)}</div>
              </div>
              <div className={`ba-card diff ${diff >= 0 ? "positive" : "negative"}`}>
                <div className="ba-label">Change</div>
                <div className="ba-value">
                  {diff >= 0 ? "+" : ""}
                  {formatLineAmount(effectiveRow, diff)}
                </div>
              </div>
            </div>

            <div className="result-section">
              <div className="result-section-title">Month-by-Month Preview</div>
              <div className="month-table-wrapper">
                <table className="month-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Before</th>
                      <th>After</th>
                      <th>Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MONTHS.map((m) => {
                      const before = effectiveRow.values[m];
                      const after = result.newValues[m] ?? before;
                      const d = after - before;
                      const changed = d !== 0;
                      return (
                        <tr key={m} className={changed ? "changed-row" : ""}>
                          <td>{m}</td>
                          <td>{formatLineAmount(effectiveRow, before)}</td>
                          <td className={changed ? "after-val" : ""}>{formatLineAmount(effectiveRow, after)}</td>
                          <td className={d > 0 ? "pos-delta" : d < 0 ? "neg-delta" : ""}>
                            {d !== 0 ? `${d > 0 ? "+" : ""}${formatLineAmount(effectiveRow, d)}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" type="button" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-apply" type="button" onClick={handleApply}>
                ✅ Apply to Budget
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
