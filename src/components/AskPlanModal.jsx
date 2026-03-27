import { useMemo, useState } from "react";
import { askPlan } from "../api/askPlanApi";
import { MONTHS } from "../data/budgetData";

const QUICK_PROMPTS = [
  "Show top 5 Revenue and Expense line items",
  "Compare with Actuals 2024",
  "What is room Revenue in Actual 2024",
  "Compare Statistics items with Budget 2025",
];

function formatAmount(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDelta(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const numeric = Number(value);
  return `${numeric > 0 ? "+" : ""}${formatAmount(numeric)}`;
}

function MonthValuesTable({ baseValues, compareValues, actualValues, showCompare, showActuals }) {
  return (
    <div className="month-table-wrapper ask-plan-month-table">
      <table className="month-table">
        <thead>
          <tr>
            <th>Month</th>
            <th>Base</th>
            {showCompare && <th>Compare</th>}
            {showActuals && <th>Actual</th>}
          </tr>
        </thead>
        <tbody>
          {MONTHS.map((m) => (
            <tr key={m}>
              <td>{m}</td>
              <td>{formatAmount(baseValues?.[m])}</td>
              {showCompare && <td>{formatAmount(compareValues?.[m])}</td>}
              {showActuals && <td>{formatAmount(actualValues?.[m])}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AskPlanModal({ planId, planScope, onClose }) {
  const [provider, setProvider] = useState("gemini");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState(null);
  const [expandedLineKeys, setExpandedLineKeys] = useState({});

  const titlePlanName = planScope?.planName?.trim() || "Plan";
  const titleFy =
    planScope && planScope.fiscalYear != null && planScope.fiscalYear !== ""
      ? planScope.fiscalYear
      : null;

  const compareMode = response?.appliedFilters?.compareMode || "none";
  const showCompare = compareMode === "plan";
  const showActuals = compareMode === "actuals" || Boolean(response?.appliedFilters?.includeActuals);

  const hasRows = Array.isArray(response?.resultRows) && response.resultRows.length > 0;

  const canRun = useMemo(() => question.trim().length > 0, [question]);

  function toggleExpanded(lineKey) {
    setExpandedLineKeys((prev) => ({ ...prev, [lineKey]: !prev[lineKey] }));
  }

  async function runAskPlan(overrideQuestion) {
    const finalQuestion = (overrideQuestion ?? question).trim();
    if (!finalQuestion) return;

    setLoading(true);
    setError("");
    setResponse(null);
    setExpandedLineKeys({});

    try {
      const data = await askPlan({
        provider,
        question: finalQuestion,
        basePlanId: Number(planId),
      });
      setResponse(data);
    } catch (err) {
      setError(err.message || "Ask plan failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box ai-modal ask-plan-modal">
        <div className="modal-header">
          <div className="row-badge">Plan</div>
          <h2>
            ✨ Ask Plan — <span className="row-name">{titlePlanName}</span>
            {titleFy != null && <span className="plan-ai-title-year">, FY {titleFy}</span>}
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
              onClick={() => {
                setQuestion(q);
                runAskPlan(q);
              }}
              disabled={loading}
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
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                runAskPlan();
              }
            }}
          />
          <button className="btn-primary run-btn" type="button" onClick={() => runAskPlan()} disabled={loading || !canRun}>
            {loading ? <span className="spinner" /> : "Ask Plan →"}
          </button>
        </div>

        {error && <div className="error-banner">⚠️ {error}</div>}

        {response && (
          <div className="result-panel">
            <div className="result-section">
              <div className="result-section-title">Result Rows</div>
              <div className="month-table-wrapper ask-plan-result-table-wrap">
                <table className="month-table ask-plan-result-table">
                  <thead>
                    <tr>
                      <th>Label</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Base Total</th>
                      {showCompare && <th>Compare Total</th>}
                      {showCompare && <th>Delta Vs Compare</th>}
                      {showActuals && <th>Actual Total</th>}
                      {showActuals && <th>Delta Vs Actual</th>}
                      <th>Months</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!hasRows && (
                      <tr>
                        <td colSpan={showCompare ? (showActuals ? 9 : 7) : showActuals ? 7 : 5}>
                          No rows returned.
                        </td>
                      </tr>
                    )}
                    {hasRows &&
                      response.resultRows.map((r) => {
                        const isExpanded = Boolean(expandedLineKeys[r.lineKey]);
                        return (
                          <FragmentRow
                            key={r.lineKey}
                            row={r}
                            isExpanded={isExpanded}
                            onToggle={() => toggleExpanded(r.lineKey)}
                            showCompare={showCompare}
                            showActuals={showActuals}
                          />
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" type="button" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FragmentRow({ row, isExpanded, onToggle, showCompare, showActuals }) {
  const columns = showCompare ? (showActuals ? 9 : 7) : showActuals ? 7 : 5;

  return (
    <>
      <tr>
        <td>{row.label}</td>
        <td>{row.type}</td>
        <td>{row.category}</td>
        <td>{formatAmount(row.baseTotal)}</td>
        {showCompare && <td>{formatAmount(row.compareTotal)}</td>}
        {showCompare && <td className={Number(row.deltaVsCompare) > 0 ? "pos-delta" : Number(row.deltaVsCompare) < 0 ? "neg-delta" : ""}>{formatDelta(row.deltaVsCompare)}</td>}
        {showActuals && <td>{formatAmount(row.actualTotal)}</td>}
        {showActuals && <td className={Number(row.deltaVsActual) > 0 ? "pos-delta" : Number(row.deltaVsActual) < 0 ? "neg-delta" : ""}>{formatDelta(row.deltaVsActual)}</td>}
        <td>
          <button type="button" className="quick-btn" onClick={onToggle}>
            {isExpanded ? "Hide" : "Show"}
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={columns}>
            <MonthValuesTable
              baseValues={row.baseValues}
              compareValues={row.compareValues}
              actualValues={row.actualValues}
              showCompare={showCompare}
              showActuals={showActuals}
            />
          </td>
        </tr>
      )}
    </>
  );
}
