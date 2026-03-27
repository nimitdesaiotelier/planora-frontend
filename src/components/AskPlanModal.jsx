import { useMemo, useRef, useState } from "react";
import { askPlan } from "../api/askPlanApi";
import { MONTHS } from "../data/budgetData";
import BudgetTable from "./BudgetTable";

const QUICK_PROMPTS = [
  "Show top 5 Revenue and Expense line items",
  "Compare with Actuals 2024",
  "What is room Revenue in Actual 2024",
  "Compare Statistics items with Budget 2025",
];

const BUDGET_TYPES = new Set(["Revenue", "Expense", "Statistics"]);

function normalizeMonthValues(baseValues) {
  return Object.fromEntries(MONTHS.map((m) => [m, Number(baseValues?.[m]) || 0]));
}

/** Maps ask-plan API resultRows to BudgetTable row shape (same as plan detail grid). */
function askPlanResultRowsToBudgetRows(resultRows, turnId) {
  if (!Array.isArray(resultRows)) return [];
  return resultRows.map((r, idx) => {
    const type = BUDGET_TYPES.has(r.type) ? r.type : "Expense";
    return {
      id: `${turnId}-${r.lineKey}-${idx}`,
      lineKey: r.lineKey,
      coaCode: r.lineKey ?? "",
      coaName: r.label ?? "",
      label: r.label ?? "",
      department: (r.category ?? "").trim() || "Unassigned",
      type,
      category: r.category ?? "",
      values: normalizeMonthValues(r.baseValues),
      dailyDetails: {},
      actualsValues: {},
    };
  });
}

function AskPlanTurnAnswer({ turnId, response }) {
  const hasRows = Array.isArray(response?.resultRows) && response.resultRows.length > 0;
  const budgetRows = useMemo(
    () => (hasRows ? askPlanResultRowsToBudgetRows(response.resultRows, turnId) : []),
    [hasRows, response?.resultRows, turnId]
  );

  if (!hasRows) {
    return (
      <div className="ask-plan-turn-answer">
        <div className="result-section">
          <div className="result-section-title">Results</div>
          <p className="ask-plan-no-rows">No rows returned.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ask-plan-turn-answer ask-plan-turn-answer--budget">
      <div className="result-section">
        <div className="result-section-title">Results</div>
        <div className="ask-plan-budget-wrap">
          <BudgetTable rows={budgetRows} showAiColumn={false} lastUpdated={null} />
        </div>
      </div>
    </div>
  );
}

export default function AskPlanModal({ planId, planScope, onClose }) {
  const [provider, setProvider] = useState("gemini");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [isClosing, setIsClosing] = useState(false);
  const closingRef = useRef(false);

  const titlePlanName = planScope?.planName?.trim() || "Plan";
  const titleFy =
    planScope && planScope.fiscalYear != null && planScope.fiscalYear !== ""
      ? planScope.fiscalYear
      : null;

  const canRun = useMemo(() => question.trim().length > 0, [question]);

  function requestClose() {
    if (closingRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      onClose();
      return;
    }
    closingRef.current = true;
    setIsClosing(true);
  }

  function handlePanelAnimationEnd(e) {
    if (e.target !== e.currentTarget) return;
    if (!closingRef.current) return;
    if (e.animationName !== "askPlanPanelOut") return;
    closingRef.current = false;
    onClose();
  }

  async function runAskPlan() {
    const finalQuestion = question.trim();
    if (!finalQuestion) return;

    setLoading(true);
    setError("");

    try {
      const data = await askPlan({
        provider,
        question: finalQuestion,
        basePlanId: Number(planId),
      });
      const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `turn-${Date.now()}`;
      setHistory((h) => [...h, { id, question: finalQuestion, response: data }]);
    } catch (err) {
      setError(err.message || "Ask plan failed.");
    } finally {
      setLoading(false);
    }
  }

  const showEmptyHint = history.length === 0 && !loading && !error;

  return (
    <div
      className={`modal-overlay ask-plan-overlay${isClosing ? " ask-plan-overlay--exit" : ""}`}
      onClick={(e) => {
        if (isClosing) return;
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        className="modal-box ai-modal ask-plan-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-plan-title"
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={handlePanelAnimationEnd}
      >
        <div className="ask-plan-modal-header modal-header">
          <div className="row-badge">Plan</div>
          <h2 id="ask-plan-title">
            ✨ Ask Plan — <span className="row-name">{titlePlanName}</span>
            {titleFy != null && <span className="plan-ai-title-year">, FY {titleFy}</span>}
          </h2>
          <button className="close-btn" type="button" onClick={requestClose} disabled={isClosing} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="ask-plan-main">
          <div className="ask-plan-results-scroll" aria-label="Ask plan results">
            {showEmptyHint && (
              <div className="ask-plan-empty">Ask a question below to see results here.</div>
            )}
            {history.map((entry) => (
              <article key={entry.id} className="ask-plan-turn">
                <div className="ask-plan-turn-question">
                  <span className="ask-plan-turn-label">Question</span>
                  <p className="ask-plan-turn-text">{entry.question}</p>
                </div>
                <AskPlanTurnAnswer turnId={entry.id} response={entry.response} />
              </article>
            ))}
            {(loading || error) && (
              <div
                className={`ask-plan-trailing-status${history.length > 0 ? " ask-plan-trailing-status--after-history" : ""}`}
              >
                {loading && (
                  <div className="ask-plan-loading">
                    <span className="spinner" aria-hidden />
                    <span>Thinking…</span>
                  </div>
                )}
                {error && <div className="error-banner ask-plan-results-error">⚠️ {error}</div>}
              </div>
            )}
          </div>
        </div>

        <div className="ask-plan-modal-footer">
          <div className="ai-provider-row">
            <span className="quick-label">Model</span>
            <select
              className="provider-select"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              disabled={loading || isClosing}
            >
              <option value="gemini">Gemini (server key)</option>
              <option value="openai">OpenAI (server key)</option>
            </select>
          </div>

          <div className="quick-actions">
            <span className="quick-label">Examples:</span>
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                className="quick-btn"
                type="button"
                onClick={() => setQuestion(q)}
                disabled={loading || isClosing}
              >
                {q}
              </button>
            ))}
          </div>

          <div className="prompt-area">
            <textarea
              className="prompt-input"
              placeholder='e.g. "Show top 5 Revenue and Expense line items"'
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              disabled={isClosing}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  runAskPlan();
                }
              }}
            />
            <button
              className="btn-primary run-btn"
              type="button"
              onClick={runAskPlan}
              disabled={loading || !canRun || isClosing}
            >
              {loading ? <span className="spinner" /> : "Ask Plan →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
