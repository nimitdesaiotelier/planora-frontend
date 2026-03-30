import { Fragment, useEffect, useMemo, useState } from "react";
import { analyzeAskPlanResult, askPlan, exportAskPlanExcel } from "../api/askPlanApi";
import { MONTHS } from "../data/budgetData";
import AskPlanChartView from "./AskPlanChartView";
import { buildAskPlanLineBarSeries, buildAskPlanPieData } from "./askPlanChartData";

const QUICK_PROMPTS = [
  "Show top 5 Revenue and Expense line items",
  "Compare with Actuals 2024",
  "What is room Revenue in Actual 2024",
  "Compare Statistics items with Budget 2025",
];

const FAILSAFE_PROMPTS = [
  "Show top 10 Revenue line items by total",
  "Compare Revenue with Actuals 2024",
  "Show Expense lines where delta vs Actuals 2024 is highest",
  "Show Statistics items and compare with Budget 2025",
];

const RESULT_SECTIONS = [
  { key: "statistics", title: "Statistics" },
  { key: "revenue", title: "Revenue" },
  { key: "expense", title: "Expenses" },
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
  const deltaClass = (val) =>
    val > 0 ? "pos-delta" : val < 0 ? "neg-delta" : "";

  return (
    <div className="month-table-wrapper ask-plan-month-table">
      <table className="month-table">
        <thead>
          <tr>
            <th></th>
            {MONTHS.map((m) => (
              <th key={m}>{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Base</strong></td>
            {MONTHS.map((m) => (
              <td key={m}>{formatAmount(baseValues?.[m])}</td>
            ))}
          </tr>
          {showCompare && (
            <>
              <tr>
                <td><strong>Compare</strong></td>
                {MONTHS.map((m) => (
                  <td key={m}>{formatAmount(compareValues?.[m])}</td>
                ))}
              </tr>
              <tr>
                <td><strong>Delta</strong></td>
                {MONTHS.map((m) => {
                  const d = (Number(compareValues?.[m]) || 0) - (Number(baseValues?.[m]) || 0);
                  return (
                    <td key={m} className={deltaClass(d)}>{formatDelta(d)}</td>
                  );
                })}
              </tr>
            </>
          )}
          {showActuals && (
            <>
              <tr>
                <td><strong>Actual</strong></td>
                {MONTHS.map((m) => (
                  <td key={m}>{formatAmount(actualValues?.[m])}</td>
                ))}
              </tr>
              <tr>
                <td><strong>Delta</strong></td>
                {MONTHS.map((m) => {
                  const d = (Number(actualValues?.[m]) || 0) - (Number(baseValues?.[m]) || 0);
                  return (
                    <td key={m} className={deltaClass(d)}>{formatDelta(d)}</td>
                  );
                })}
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function AskPlanModal({ planId, planScope, onClose }) {
  const [provider, setProvider] = useState("openai");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState(null);
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [analysisPoints, setAnalysisPoints] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [expandedLineKeys, setExpandedLineKeys] = useState({});
  const [showIntentJson, setShowIntentJson] = useState(false);
  /** When API requests a chart, user can switch between chart and table */
  const [resultView, setResultView] = useState("chart");

  const titlePlanName = planScope?.planName?.trim() || "Plan";
  const titleFy =
    planScope && planScope.fiscalYear != null && planScope.fiscalYear !== ""
      ? planScope.fiscalYear
      : null;

  const compareMode = response?.appliedFilters?.compareMode || "none";
  const showCompare = compareMode === "plan";
  const showActuals = compareMode === "actuals" || Boolean(response?.appliedFilters?.includeActuals);

  const hasRows = Array.isArray(response?.resultRows) && response.resultRows.length > 0;
  const showNoDataInfo = Boolean(response) && !hasRows;
  const suggestedPlans = useMemo(
    () => (Array.isArray(response?.meta?.suggestedPlans) ? response.meta.suggestedPlans : []),
    [response]
  );
  const tableColSpan = (showCompare ? 9 : 7) + (showActuals ? 2 : 0);

  const showAnalysisSection =
    hasRows && (analysisLoading || analysisError || (analysisPoints != null && analysisPoints.length > 0));

  const canRun = useMemo(() => question.trim().length > 0, [question]);
  const responseMessage = useMemo(
    () => response?.summary || response?.message || response?.meta?.message || "",
    [response]
  );
  const parsedIntentJson = useMemo(() => {
    if (!response) return "";
    return JSON.stringify(
      {
        intent: response.intent ?? null,
        appliedFilters: response.appliedFilters ?? null,
        meta: response.meta ?? null,
      },
      null,
      2
    );
  }, [response]);
  const groupedRows = useMemo(() => {
    if (!hasRows) return RESULT_SECTIONS.map((s) => ({ ...s, rows: [] }));

    const normalizeType = (value) => {
      const type = String(value || "").trim().toLowerCase();
      if (type.startsWith("stat")) return "statistics";
      if (type.startsWith("rev")) return "revenue";
      if (type.startsWith("exp")) return "expense";
      return "";
    };

    const byType = {
      statistics: [],
      revenue: [],
      expense: [],
    };

    response.resultRows.forEach((row) => {
      const key = normalizeType(row.type);
      if (key) byType[key].push(row);
    });

    return RESULT_SECTIONS.map((s) => ({ ...s, rows: byType[s.key] }));
  }, [hasRows, response]);
  const visibleSections = useMemo(
    () => groupedRows.filter((section) => section.rows.length > 0),
    [groupedRows]
  );

  const chartTypeNormalized = String(response?.meta?.chartType || "").toLowerCase();
  const chartOn = Boolean(response?.meta?.isChart);
  const chartTypeSupported = ["bar", "line", "pie"].includes(chartTypeNormalized);

  const showChart = useMemo(() => {
    if (!response || !hasRows || !chartOn || !chartTypeSupported) return false;
    if (chartTypeNormalized === "pie") {
      return buildAskPlanPieData(response.resultRows).hasNumeric;
    }
    return buildAskPlanLineBarSeries(response.resultRows, showCompare, showActuals).hasNumeric;
  }, [
    response,
    hasRows,
    chartOn,
    chartTypeSupported,
    chartTypeNormalized,
    showCompare,
    showActuals,
  ]);

  useEffect(() => {
    if (!response) return;
    setResultView(showChart ? "chart" : "table");
  }, [response, showChart]);

  function toggleExpanded(lineKey) {
    setExpandedLineKeys((prev) => ({ ...prev, [lineKey]: !prev[lineKey] }));
  }

  async function runAskPlan(overrideQuestion) {
    const finalQuestion = (overrideQuestion ?? question).trim();
    if (!finalQuestion) return;

    setLoading(true);
    setError("");
    setResponse(null);
    setAnalysisPoints(null);
    setAnalysisError("");
    setExpandedLineKeys({});
    setShowIntentJson(false);

    try {
      const data = await askPlan({
        provider,
        question: finalQuestion,
        basePlanId: Number(planId),
      });
      setSubmittedQuestion(finalQuestion);
      setResponse(data);
    } catch (err) {
      setError(err.message || "Ask plan failed.");
    } finally {
      setLoading(false);
    }
  }

  async function runAnalysis() {
    if (!response || !hasRows) return;
    const q = submittedQuestion.trim() || "(no question)";
    setAnalysisLoading(true);
    setAnalysisError("");
    setAnalysisPoints(null);
    try {
      const data = await analyzeAskPlanResult({ provider, question: q, response });
      setAnalysisPoints(Array.isArray(data?.points) ? data.points : []);
    } catch (err) {
      setAnalysisError(err.message || "Analysis failed.");
    } finally {
      setAnalysisLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box ai-modal ask-plan-modal">
        <div className="ask-plan-shell">
          <div className="ask-plan-top">
            <div className="modal-header">
              <div className="row-badge">Plan</div>
              <h2>
                ✨ Ask Plan — <span className="row-name">{titlePlanName}</span>
                {titleFy != null && <span className="plan-ai-title-year">, {titleFy}</span>}
              </h2>
              <button className="close-btn" type="button" onClick={onClose}>
                ✕
              </button>
            </div>
          </div>

          <div className="ask-plan-middle">
            {error && (
              <div className="error-banner ai-failsafe-banner">
                <div>⚠️ {error}</div>
                <div className="ai-failsafe-help">
                  Try a shorter explicit prompt (metric + scope + comparison).
                </div>
                <div className="ai-failsafe-actions">
                  {FAILSAFE_PROMPTS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="quick-btn"
                      onClick={() => {
                        setQuestion(item);
                        runAskPlan(item);
                      }}
                      disabled={loading}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {response && (
              <div className="result-panel">
                <div className="result-section">
                  <div className="result-section-header">
                    <div className="result-section-title">Result Rows</div>
                    {hasRows && (
                      <div className="ask-plan-export-actions">
                        <button
                          className="btn-secondary ask-plan-export-btn"
                          type="button"
                          onClick={() => runAnalysis()}
                          disabled={loading || analysisLoading}
                        >
                          {analysisLoading ? <span className="spinner" /> : "Analyse"}
                        </button>
                        <button
                          className="btn-secondary ask-plan-export-btn"
                          type="button"
                          onClick={async () => {
                            setError("");
                            try {
                              await exportAskPlanExcel(response, {
                                includeChart: false,
                                analysisPoints: analysisPoints?.length ? analysisPoints : undefined,
                              });
                            } catch (err) {
                              setError(err.message || "Excel export failed.");
                            }
                          }}
                        >
                          Excel
                        </button>
                        <button
                          className="btn-secondary ask-plan-export-btn"
                          type="button"
                          onClick={async () => {
                            setError("");
                            try {
                              await exportAskPlanExcel(response, {
                                includeChart: true,
                                analysisPoints: analysisPoints?.length ? analysisPoints : undefined,
                              });
                            } catch (err) {
                              setError(err.message || "Excel export failed.");
                            }
                          }}
                        >
                          Excel + chart
                        </button>
                      </div>
                    )}
                  </div>

                  {showNoDataInfo && Boolean(responseMessage) && (
                    <div className="summary-banner">{responseMessage}</div>
                  )}

                  {showNoDataInfo && suggestedPlans.length > 0 && (
                    <div className="ask-plan-suggestions-block">
                      <div className="result-section-title">Suggested plans</div>
                      <div className="month-table-wrapper">
                        <table className="month-table ask-plan-suggestions-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Type</th>
                              <th>Fiscal Year</th>
                            </tr>
                          </thead>
                          <tbody>
                            {suggestedPlans.map((plan) => (
                              <tr key={plan.id ?? `${plan.name}-${plan.fiscalYear}-${plan.planType}`}>
                                <td>{plan.name ?? "—"}</td>
                                <td>{plan.planType ?? "—"}</td>
                                <td>{plan.fiscalYear ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {showChart && (
                    <div className="ask-plan-view-toggle" role="group" aria-label="Result display">
                      <button
                        type="button"
                        className={`ask-plan-view-toggle-btn ${resultView === "chart" ? "is-active" : ""}`}
                        onClick={() => setResultView("chart")}
                      >
                        Chart view
                      </button>
                      <button
                        type="button"
                        className={`ask-plan-view-toggle-btn ${resultView === "table" ? "is-active" : ""}`}
                        onClick={() => setResultView("table")}
                      >
                        Table view
                      </button>
                    </div>
                  )}

                  <div className="ask-plan-intent-block">
                    <button
                      className="btn-secondary ask-plan-intent-toggle"
                      type="button"
                      onClick={() => setShowIntentJson((prev) => !prev)}
                    >
                      {showIntentJson ? "Hide AI Parsed Intent (JSON)" : "Show AI Parsed Intent (JSON)"}
                    </button>
                    {showIntentJson && <pre className="json-output">{parsedIntentJson || "{}"}</pre>}
                  </div>

                  {showChart && resultView === "chart" ? (
                    <AskPlanChartView
                      chartType={chartTypeNormalized}
                      resultRows={response.resultRows}
                      showCompare={showCompare}
                      showActuals={showActuals}
                    />
                  ) : (
                    <div className="month-table-wrapper ask-plan-result-table-wrap">
                      <table className="month-table ask-plan-result-table">
                        <thead>
                          <tr>
                            <th>Department</th>
                            <th>COA code</th>
                            <th>COA name</th>
                            <th>Account Type</th>
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
                              <td colSpan={tableColSpan}>No rows returned.</td>
                            </tr>
                          )}
                          {hasRows &&
                            visibleSections.map((section) => (
                              <Fragment key={section.key}>
                                <tr className="ask-plan-group-row">
                                  <td colSpan={tableColSpan}>{section.title}</td>
                                </tr>
                                {section.rows.map((r) => {
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
                              </Fragment>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {showAnalysisSection && (
                    <div className="ask-plan-analysis-block">
                      <div className="result-section-title">Analysis</div>
                      {analysisLoading && (
                        <div className="ask-plan-analysis-loading" aria-live="polite">
                          <span className="spinner" /> Generating summary…
                        </div>
                      )}
                      {analysisError && !analysisLoading && (
                        <div className="warning-banner ask-plan-analysis-error">⚠️ {analysisError}</div>
                      )}
                      {!analysisLoading && !analysisError && analysisPoints && analysisPoints.length > 0 && (
                        <ul className="ask-plan-analysis-points">
                          {analysisPoints.map((p, i) => (
                            <li key={`${i}-${p.slice(0, 24)}`}>{p}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="ask-plan-bottom">
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
              <span className="quick-label">Quick:</span>
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  className="quick-btn"
                  type="button"
                  onClick={() => setQuestion(q)}
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
          </div>
        </div>
      </div>
    </div>
  );
}

function FragmentRow({ row, isExpanded, onToggle, showCompare, showActuals }) {
  const columns = (showCompare ? 9 : 7) + (showActuals ? 2 : 0);
  const accountType = row.accountType ?? row.type ?? "";
  const coaCode = row.coaCode ?? row.lineKey ?? "—";
  const coaName = row.coaName ?? row.label ?? "—";
  const department = row.department ?? "—";

  return (
    <>
      <tr>
        <td>{department}</td>
        <td>{coaCode}</td>
        <td>{coaName}</td>
        <td>{accountType}</td>
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
