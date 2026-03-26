import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchLineItems,
  fetchPlans,
  lineItemToRow,
  patchLineItemValues,
} from "../api/plansApi";
import AiActionModal from "../components/AiActionModal";
import BudgetTable from "../components/BudgetTable";

const PLAN_TYPE_STYLE = {
  BUDGET: { label: "Budget", className: "plan-type-budget" },
  FORECAST: { label: "Forecast", className: "plan-type-forecast" },
  WHAT_IF: { label: "What-if", className: "plan-type-whatif" },
};

export default function PlanDetailPage() {
  const { planId } = useParams();

  const [planMeta, setPlanMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRow, setActiveRow] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activityLog, setActivityLog] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plans, items] = await Promise.all([fetchPlans(), fetchLineItems(planId)]);
      const meta = plans.find((p) => String(p.id) === String(planId));
      setPlanMeta(
        meta || {
          name: `Plan ${planId}`,
          planType: "BUDGET",
          fiscalYear: "",
          propertyName: "",
        }
      );
      setRows(items.map(lineItemToRow));
    } catch (e) {
      setError(e.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApply(rowId, newValues, summary) {
    try {
      await patchLineItemValues(planId, rowId, newValues);
    } catch (e) {
      window.alert(`Could not save to server: ${e.message}`);
      return;
    }
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, values: { ...newValues } } : r))
    );
    setLastUpdated(rowId);
    setActivityLog((prev) => [
      { id: Date.now(), rowId, summary, time: new Date().toLocaleTimeString() },
      ...prev,
    ]);
    setActiveRow(null);
    setTimeout(() => setLastUpdated(null), 3000);
  }

  const typeInfo = planMeta
    ? PLAN_TYPE_STYLE[planMeta.planType] || {
        label: planMeta.planType,
        className: "plan-type-default",
      }
    : null;

  return (
    <div className="plan-detail-screen">
      <div className="plan-header">
        <div className="plan-info">
          <Link to="/" className="back-to-plans">
            ← All plans
          </Link>
          <h1>{planMeta?.name ?? "…"}</h1>
          {typeInfo && (
            <span className={`plan-badge plan-badge-type ${typeInfo.className}`}>
              {typeInfo.label}
            </span>
          )}
          {planMeta?.fiscalYear != null && planMeta.fiscalYear !== "" && (
            <span className="plan-badge plan-badge-subtle">FY {planMeta.fiscalYear}</span>
          )}
          {planMeta?.propertyName && (
            <span className="plan-badge plan-badge-subtle">{planMeta.propertyName}</span>
          )}
        </div>
        {/* <div className="plan-meta">
          Click <span className="highlight-text">✨</span> for row-level AI (keys on server:{" "}
          <code>OPENAI_API_KEY</code> / <code>GEMINI_API_KEY</code>).
        </div> */}
      </div>

      <main className="main-content">
        {loading && <div className="plans-state">Loading line items…</div>}
        {error && (
          <div className="plans-error">
            <Link to="/">← Back to plans</Link>
            <pre className="plans-error-detail">{error}</pre>
          </div>
        )}
        {!loading && !error && rows.length === 0 && (
          <div className="plans-state">No line items for this plan.</div>
        )}
        {!loading && !error && rows.length > 0 && (
          <>
            <BudgetTable rows={rows} onAiAction={setActiveRow} lastUpdated={lastUpdated} />
            {activityLog.length > 0 && (
              <div className="activity-log">
                <div className="activity-title">📋 AI Update History</div>
                {activityLog.map((entry) => (
                  <div key={entry.id} className="activity-entry">
                    <span className="activity-time">{entry.time}</span>
                    <span className="activity-summary">{entry.summary}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {activeRow && (
        <AiActionModal
          planId={planId}
          row={activeRow}
          onApply={handleApply}
          onClose={() => setActiveRow(null)}
        />
      )}
    </div>
  );
}
