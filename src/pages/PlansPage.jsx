import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPlans, fetchProperties } from "../api/plansApi";

const PLAN_TYPE_STYLE = {
  BUDGET: { label: "Budget", className: "plan-type-budget" },
  FORECAST: { label: "Forecast", className: "plan-type-forecast" },
  WHAT_IF: { label: "What-if", className: "plan-type-whatif" },
};

export default function PlansPage() {
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState("");
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const props = await fetchProperties(1);
        if (!cancelled) setProperties(props);
      } catch {
        if (!cancelled) setProperties([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const pid = propertyId === "" ? undefined : propertyId;
        const data = await fetchPlans(pid);
        if (!cancelled) setPlans(data);
      } catch (e) {
        if (!cancelled) setError(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [propertyId]);

  return (
    <div className="plans-screen">
      <div className="plan-header">
        <div className="plan-info">
          <h1>All plans</h1>
          <span className="plan-badge">Live data</span>
        </div>
        <div className="plan-filter-row">
          <label htmlFor="prop-filter">Property</label>
          <select
            id="prop-filter"
            className="provider-select"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
          >
            <option value="">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="plan-meta">
          Budget, forecast, and what-if plans are stored <strong>per property</strong>.
        </div>
      </div>

      <main className="main-content">
        {loading && <div className="plans-state">Loading plans…</div>}
        {error && (
          <div className="plans-error">
            <strong>Could not load plans.</strong> Start the Spring Boot API on port 8080 and use{" "}
            <code>npm run dev</code> (proxy) or set <code>VITE_API_BASE</code>.
            <pre className="plans-error-detail">{error}</pre>
          </div>
        )}
        {!loading && !error && plans.length === 0 && (
          <div className="plans-state">No plans for this filter. Run the backend seed.</div>
        )}
        {!loading && !error && plans.length > 0 && (
          <div className="plans-grid">
            {plans.map((p) => {
              const t = PLAN_TYPE_STYLE[p.planType] || {
                label: p.planType,
                className: "plan-type-default",
              };
              return (
                <Link key={p.id} to={`/plans/${p.id}`} className="plan-card">
                  <div className={`plan-card-type ${t.className}`}>{t.label}</div>
                  <div className="plan-card-title">{p.name}</div>
                  <div className="plan-card-meta">
                    FY {p.fiscalYear}
                    {p.propertyName ? ` · ${p.propertyName}` : ""}
                  </div>
                  <div className="plan-card-action">Open line items →</div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
