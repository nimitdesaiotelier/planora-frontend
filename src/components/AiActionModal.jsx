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

const FAILSAFE_PROMPTS = [
  { label: "Try simple +5%", prompt: "Increase by 5% for full_year" },
  { label: "Try one month set", prompt: "Set Jan to 1000" },
  { label: "Try copy LY budget", prompt: "Copy from last year budget for full_year" },
];

/** Shown when the model did not produce an applicable budget action or month values. */
const INVALID_AI_ACTION_MESSAGE =
  "That is not a valid budget instruction. Please try again with a clear action (for example: increase, decrease, set an amount, or copy from a source).";

function normalizeAiActionErrorMessage(message) {
  const m = String(message || "").trim();
  if (!m) return INVALID_AI_ACTION_MESSAGE;
  if (
    /could not interpret|refine the prompt|no month values|not interpret/i.test(m)
  ) {
    return INVALID_AI_ACTION_MESSAGE;
  }
  return m;
}

/** True when normalized instructions are empty or no month totals were returned. */
function isMissingAiAction(parsed, newValues) {
  const instructions = parsed?.instructions ?? [];
  if (!Array.isArray(instructions) || instructions.length === 0) return true;
  if (!newValues || typeof newValues !== "object") return true;
  const monthKeys = MONTHS.filter((mo) => Object.prototype.hasOwnProperty.call(newValues, mo));
  if (monthKeys.length === 0) return true;
  return false;
}

function parseFiscalYear(fy) {
  if (fy == null || fy === "") return null;
  const n = Number(fy);
  return Number.isFinite(n) ? n : null;
}

export default function AiActionModal({ planId, row, fiscalYear, planType, onApply, onClose }) {
  const quickActions = LINE_ITEM_QUICK_ACTIONS;
  const promptPlaceholder = 'e.g. "Increase by 12% for Q2"';
  const effectiveRow = row;

  const [provider, setProvider] = useState("openai");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { raw, parsed, newValues, newDailyDetails }
  const [showParsedJson, setShowParsedJson] = useState(false);

  if (!effectiveRow) return null;

  async function handleRun(instruction) {
    const text = instruction || prompt.trim();
    if (!text) return;
    setLoading(true);
    setError("");
    setResult(null);
    setShowParsedJson(false);
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
          planType: planType ?? null,
        }
      );
      const parsed = normalizeParsedForTransform(raw);
      const newValues = raw.newValues ?? {};
      const newDailyDetails = raw.newDailyDetails ?? null;
      if (isMissingAiAction(parsed, newValues)) {
        throw new Error(INVALID_AI_ACTION_MESSAGE);
      }
      setResult({ raw, parsed, newValues, newDailyDetails });
    } catch (err) {
      setError(
        normalizeAiActionErrorMessage(err.message) ||
          "AI request failed. Try a simpler prompt or switch model."
      );
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
    <div className="modal-overlay">
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

        {error && (
          <div className="error-banner ai-failsafe-banner">
            <div>⚠️ {error}</div>
            <div className="ai-failsafe-help">
              Try a shorter explicit prompt (action + amount + period).
            </div>
            <div className="ai-failsafe-actions">
              {FAILSAFE_PROMPTS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="quick-btn"
                  onClick={() => {
                    setPrompt(item.prompt);
                    handleRun(item.prompt);
                  }}
                  disabled={loading}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {result && (
          <div className="result-panel">
            <div className="result-section">
              <button
                type="button"
                className="quick-btn parsed-json-toggle-btn"
                onClick={() => setShowParsedJson((prev) => !prev)}
              >
                {showParsedJson ? "Hide parsed JSON" : "Show parsed JSON"}
              </button>
              {showParsedJson && (
                <pre className="json-output">{JSON.stringify(result.raw, null, 2)}</pre>
              )}
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
