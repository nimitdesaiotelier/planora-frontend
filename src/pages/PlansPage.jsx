import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchActualsYears } from "../api/actualsApi";
import { createPlan, deletePlan, fetchPlans, fetchProperties } from "../api/plansApi";

const PLAN_TYPE_STYLE = {
  BUDGET: { label: "Budget", className: "plan-type-budget" },
  FORECAST: { label: "Forecast", className: "plan-type-forecast" },
  WHAT_IF: { label: "What-if", className: "plan-type-whatif" },
};

const PLAN_TYPE_ORDER = ["BUDGET", "FORECAST", "WHAT_IF"];

function buildFiscalYearOptions() {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current - 5; y <= current + 7; y++) {
    years.push(y);
  }
  return years;
}

export default function PlansPage() {
  const navigate = useNavigate();
  const fiscalYearOptions = useMemo(() => buildFiscalYearOptions(), []);
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createPropertyId, setCreatePropertyId] = useState("");
  const [createYear, setCreateYear] = useState(new Date().getFullYear());
  const [createType, setCreateType] = useState("BUDGET");
  const [createProgress, setCreateProgress] = useState(0);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createError, setCreateError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pageAlert, setPageAlert] = useState(null); // { type, message }
  const [createAlert, setCreateAlert] = useState(null); // { type, message, existingPlanId? }
  /** Plans for selected property — used to pick copy source in create modal */
  const [createInitPlans, setCreateInitPlans] = useState([]);
  /** none | last_year | from_year | from_actuals | from_plan — used when createInitEnabled */
  const [initMode, setInitMode] = useState("none");
  const [copySourceYear, setCopySourceYear] = useState("");
  const [copySourcePlanId, setCopySourcePlanId] = useState("");
  const [createInitEnabled, setCreateInitEnabled] = useState(false);
  const [createInitLoading, setCreateInitLoading] = useState(false);
  /** Distinct years with uploaded actuals for the selected property */
  const [actualsYears, setActualsYears] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const props = await fetchProperties(1);
        if (!cancelled) {
          setProperties(props);
          if (props.length > 0) {
            setCreatePropertyId(String(props[0].id));
          }
        }
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

  useEffect(() => {
    if (!creating) return undefined;
    const id = setInterval(() => {
      setCreateProgress((p) => (p < 90 ? p + 7 : p));
    }, 250);
    return () => clearInterval(id);
  }, [creating]);

  useEffect(() => {
    if (!createModalOpen || !createPropertyId || !createInitEnabled) {
      setCreateInitLoading(false);
      return;
    }
    let cancelled = false;
    setCreateInitLoading(true);
    (async () => {
      try {
        const [plansData, yearsData] = await Promise.all([
          fetchPlans(createPropertyId),
          fetchActualsYears(createPropertyId, 1),
        ]);
        if (!cancelled) {
          setCreateInitPlans(Array.isArray(plansData) ? plansData : []);
          setActualsYears(Array.isArray(yearsData) ? yearsData : []);
        }
      } catch {
        if (!cancelled) {
          setCreateInitPlans([]);
          setActualsYears([]);
        }
      } finally {
        if (!cancelled) setCreateInitLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [createModalOpen, createPropertyId, createInitEnabled]);

  const initPlansSameType = useMemo(() => {
    if (!createPropertyId) return [];
    return createInitPlans.filter(
      (p) => String(p.propertyId) === String(createPropertyId) && p.planType === createType
    );
  }, [createInitPlans, createPropertyId, createType]);

  const copyYearOptions = useMemo(() => {
    const s = new Set();
    const targetY = Number(createYear);
    for (const p of initPlansSameType) {
      const fy = p.fiscalYear != null ? Number(p.fiscalYear) : NaN;
      if (Number.isFinite(fy) && fy !== targetY) {
        s.add(fy);
      }
    }
    return [...s].sort((a, b) => b - a);
  }, [initPlansSameType, createYear]);

  const hasLastYearPlan = useMemo(
    () => initPlansSameType.some((p) => Number(p.fiscalYear) === Number(createYear) - 1),
    [initPlansSameType, createYear]
  );

  const copyPlanOptions = useMemo(() => {
    if (!createPropertyId) return [];
    return createInitPlans.filter((p) => String(p.propertyId) === String(createPropertyId));
  }, [createInitPlans, createPropertyId]);

  const actualsYearOptions = useMemo(() => {
    const list = actualsYears.map((y) => Number(y)).filter((n) => Number.isFinite(n));
    return [...new Set(list)].sort((a, b) => b - a);
  }, [actualsYears]);

  const canCopyFromAnySource = useMemo(
    () =>
      hasLastYearPlan ||
      copyYearOptions.length > 0 ||
      copyPlanOptions.length > 0 ||
      actualsYearOptions.length > 0,
    [hasLastYearPlan, copyYearOptions.length, copyPlanOptions.length, actualsYearOptions.length]
  );

  useEffect(() => {
    if (!createInitEnabled || createInitLoading || !canCopyFromAnySource || initMode !== "none") {
      return;
    }
    if (hasLastYearPlan) {
      setInitMode("last_year");
    } else if (copyYearOptions.length > 0) {
      setInitMode("from_year");
      setCopySourceYear(String(copyYearOptions[0]));
    } else if (copyPlanOptions.length > 0) {
      setInitMode("from_plan");
      setCopySourcePlanId(String(copyPlanOptions[0].id));
    } else if (actualsYearOptions.length > 0) {
      setInitMode("from_actuals");
      setCopySourceYear(String(actualsYearOptions[0]));
    }
  }, [
    createInitEnabled,
    createInitLoading,
    canCopyFromAnySource,
    initMode,
    hasLastYearPlan,
    copyYearOptions,
    copyPlanOptions,
    actualsYearOptions,
  ]);

  useEffect(() => {
    if (initMode !== "from_year") return;
    if (copySourceYear === "") return;
    if (!copyYearOptions.includes(Number(copySourceYear))) {
      setCopySourceYear("");
    }
  }, [initMode, copyYearOptions, copySourceYear]);

  useEffect(() => {
    if (initMode !== "from_actuals") return;
    if (copySourceYear === "") return;
    if (!actualsYearOptions.includes(Number(copySourceYear))) {
      setCopySourceYear("");
    }
  }, [initMode, actualsYearOptions, copySourceYear]);

  useEffect(() => {
    if (initMode !== "from_plan") return;
    if (!copySourcePlanId) return;
    const ok = copyPlanOptions.some((p) => String(p.id) === String(copySourcePlanId));
    if (!ok) setCopySourcePlanId("");
  }, [initMode, copyPlanOptions, copySourcePlanId]);

  async function reloadPlans() {
    const pid = propertyId === "" ? undefined : propertyId;
    const data = await fetchPlans(pid);
    setPlans(data);
  }

  const availableYears = useMemo(() => {
    const s = new Set();
    for (const p of plans) {
      const n = p.fiscalYear != null && p.fiscalYear !== "" ? Number(p.fiscalYear) : NaN;
      if (Number.isFinite(n)) s.add(n);
    }
    return [...s].sort((a, b) => b - a);
  }, [plans]);

  useEffect(() => {
    if (yearFilter === "") return;
    const y = Number(yearFilter);
    if (!Number.isFinite(y) || !availableYears.includes(y)) {
      setYearFilter("");
    }
  }, [availableYears, yearFilter]);

  const filteredPlans = useMemo(() => {
    let list = plans;
    if (yearFilter !== "") {
      const y = Number(yearFilter);
      list = list.filter((p) => Number(p.fiscalYear) === y);
    }
    if (typeFilter !== "") {
      list = list.filter((p) => p.planType === typeFilter);
    }
    return list;
  }, [plans, yearFilter, typeFilter]);

  const plansByYear = useMemo(() => {
    const groups = new Map();
    for (const p of filteredPlans) {
      const raw = p.fiscalYear;
      const n = raw != null && raw !== "" ? Number(raw) : NaN;
      const key = Number.isFinite(n) ? n : "__other__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }
    const numericYears = [...groups.keys()].filter((k) => k !== "__other__");
    numericYears.sort((a, b) => b - a);
    const ordered = numericYears.map((year) => ({ year, plans: groups.get(year) }));
    if (groups.has("__other__")) {
      ordered.push({ year: null, plans: groups.get("__other__") });
    }
    return ordered;
  }, [filteredPlans]);

  async function onCreatePlan(e) {
    e.preventDefault();
    if (!createPropertyId) return;
    if (createInitEnabled) {
      if (initMode === "from_year" && (copySourceYear === "" || copySourceYear == null)) {
        setCreateError("Select a year to copy values from.");
        return;
      }
      if (initMode === "from_plan" && !copySourcePlanId) {
        setCreateError("Select a plan to copy values from.");
        return;
      }
      if (initMode === "from_actuals" && (copySourceYear === "" || copySourceYear == null)) {
        setCreateError("Select the actuals year to copy values from.");
        return;
      }
    }
    setCreating(true);
    setCreateError(null);
    setCreateAlert(null);
    setCreateProgress(8);
    try {
      const payload = {
        propertyId: Number(createPropertyId),
        fiscalYear: Number(createYear),
        planType: createType,
        organizationId: 1,
        initMode: "NONE",
      };
      if (createInitEnabled) {
        if (initMode === "last_year") {
          payload.initMode = "LAST_YEAR";
        } else if (initMode === "from_year") {
          payload.initMode = "FROM_YEAR";
          payload.sourceYear = Number(copySourceYear);
        } else if (initMode === "from_plan") {
          payload.initMode = "FROM_PLAN";
          payload.sourcePlanId = Number(copySourcePlanId);
        } else if (initMode === "from_actuals") {
          payload.initMode = "FROM_ACTUALS";
          payload.sourceYear = Number(copySourceYear);
        }
      }
      const created = await createPlan(payload);
      setCreateProgress(100);
      await reloadPlans();
      setCreateAlert({
        type: "success",
        message: `Plan created successfully: ${created.name}`,
      });
      setTimeout(() => {
        setCreateModalOpen(false);
        setCreateProgress(0);
      }, 300);
    } catch (err) {
      if (err?.status === 409 && err?.existingPlanId != null) {
        setCreateAlert({
          type: "warning",
          message: err.message || "This plan already exists.",
          existingPlanId: err.existingPlanId,
        });
        setCreateError(err.message || String(err));
        setCreateProgress(0);
        return;
      }
      setCreateAlert({
        type: "error",
        message: err.message || String(err),
      });
      setCreateError(err.message || String(err));
      setCreateProgress(0);
    } finally {
      setCreating(false);
    }
  }

  function onDeletePlan(plan) {
    setDeleteTarget(plan);
  }

  async function confirmDeletePlan() {
    if (!deleteTarget) return;
    setDeletingPlanId(deleteTarget.id);
    setPageAlert(null);
    try {
      await deletePlan(deleteTarget.id);
      setPlans((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setPageAlert({
        type: "success",
        message: `Plan deleted: ${deleteTarget.name}`,
      });
    } catch (err) {
      setPageAlert({
        type: "error",
        message: err.message || String(err),
      });
      setError(err.message || String(err));
    } finally {
      setDeleteTarget(null);
      setDeletingPlanId(null);
    }
  }

  return (
    <div className="plans-screen">
      <div className="plan-header">
        <div className="plan-header-left">
          <div className="plan-info">
            <h1>All plans</h1>
            <span className="plan-badge">Live data</span>
          </div>
          <div className="plan-header-filters">
            <div className="plan-filter-field">
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
            <div className="plan-filter-field">
              <label htmlFor="year-filter">Year</label>
              <select
                id="year-filter"
                className="provider-select"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                <option value="">All years</option>
                {availableYears.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="plan-filter-field">
              <label htmlFor="type-filter">Type</label>
              <select
                id="type-filter"
                className="provider-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All types</option>
                {PLAN_TYPE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {PLAN_TYPE_STYLE[t]?.label ?? t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="plan-header-actions">
          <button
            className="btn-primary"
            type="button"
            onClick={() => {
              setCreateAlert(null);
              setCreateError(null);
              setCreateInitEnabled(false);
              setInitMode("none");
              setCopySourceYear("");
              setCopySourcePlanId("");
              setCreateInitPlans([]);
              setCreateModalOpen(true);
            }}
          >
            Create plan
          </button>
        </div>
      </div>

      <main className="main-content">
        {pageAlert && (
          <div className={`plans-inline-alert plans-inline-alert-${pageAlert.type}`}>
            <div>{pageAlert.message}</div>
            <div className="plans-inline-alert-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPageAlert(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
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
        {!loading && !error && plans.length > 0 && filteredPlans.length === 0 && (
          <div className="plans-state">
            No plans match the selected filters. Try &quot;All years&quot;, &quot;All types&quot;, or another property.
          </div>
        )}
        {!loading && !error && filteredPlans.length > 0 && (
          <div className="plans-by-year">
            {plansByYear.map(({ year, plans: yearPlans }) => (
              <section key={year ?? "other"} className="plans-year-group">
                <h2 className="plans-year-heading">
                  {year != null ? String(year) : "Other"}
                </h2>
                <div className="plans-grid">
                  {yearPlans.map((p) => {
                    const t = PLAN_TYPE_STYLE[p.planType] || {
                      label: p.planType,
                      className: "plan-type-default",
                    };
                    return (
                      <div
                        key={p.id}
                        className="plan-card plan-card-compact"
                        role="link"
                        tabIndex={0}
                        onClick={() => navigate(`/plans/${p.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(`/plans/${p.id}`);
                          }
                        }}
                      >
                        <div className="plan-card-link">
                          <span className={`plan-card-type ${t.className}`}>{t.label}</span>
                          <div className="plan-card-text">
                            <div className="plan-card-title-wrap" title={p.name ?? ""}>
                              <span className="plan-card-title">{p.name}</span>
                            </div>
                            <div className="plan-card-meta">
                              <span className="plan-card-fy">{p.fiscalYear}</span>
                              {p.propertyName ? (
                                <span className="plan-card-property">{p.propertyName}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="plan-card-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePlan(p);
                          }}
                          disabled={deletingPlanId === p.id}
                          title="Delete plan"
                          aria-label={`Delete plan ${p.name ?? p.id}`}
                        >
                          {deletingPlanId === p.id ? (
                            <span className="spinner plan-card-delete-spinner" aria-hidden />
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {createModalOpen && (
        <div
          className="modal-overlay"
          role="presentation"
        >
          <div className="modal-box api-key-modal create-plan-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create plan</h2>
              <p>Choose property, year, and type. Optionally copy month values from an existing plan.</p>
            </div>
            <form className="modal-body coa-form" onSubmit={onCreatePlan}>
              {createAlert && (
                <div className={`plans-inline-alert plans-inline-alert-modal plans-inline-alert-${createAlert.type}`}>
                  <div className="plans-inline-alert-message">{createAlert.message}</div>
                  <div className="plans-inline-alert-actions">
                    {createAlert.existingPlanId != null && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setCreateModalOpen(false);
                          setCreateProgress(0);
                          navigate(`/plans/${createAlert.existingPlanId}`);
                        }}
                      >
                        Open existing plan
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setCreateAlert(null)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
              <label className="coa-field">
                Property
                <select
                  className="provider-select"
                  value={createPropertyId}
                  onChange={(e) => setCreatePropertyId(e.target.value)}
                  required
                  disabled={creating}
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="coa-field">
                Fiscal year
                <select
                  className="provider-select"
                  value={createYear}
                  onChange={(e) => setCreateYear(Number(e.target.value))}
                  required
                  disabled={creating}
                >
                  {fiscalYearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              <label className="coa-field">
                Plan type
                <select
                  className="provider-select"
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value)}
                  disabled={creating}
                >
                  <option value="BUDGET">Budget</option>
                  <option value="FORECAST">Forecast</option>
                  <option value="WHAT_IF">What-if</option>
                </select>
              </label>

              <div className="create-plan-init-section">
                <label className="table-tools-toggle create-plan-init-toggle">
                  <span className="table-tools-toggle-label">Initialize from an existing plan</span>
                  <input
                    type="checkbox"
                    checked={createInitEnabled}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setCreateInitEnabled(on);
                      if (!on) {
                        setInitMode("none");
                        setCopySourceYear("");
                        setCopySourcePlanId("");
                        setCreateInitPlans([]);
                        setActualsYears([]);
                      }
                    }}
                    disabled={creating}
                  />
                  <span className="table-tools-switch" aria-hidden="true" />
                </label>
                <p className="create-plan-init-intro">
                  With this off, the new plan starts with zero amounts. Turn it on to copy month values from another
                  plan or from uploaded actuals (matched by account line / COA).
                </p>

                {createInitEnabled && (
                  <fieldset className="create-plan-init-fieldset">
                    <legend className="create-plan-init-legend">Copy from</legend>
                    {createInitLoading && (
                      <p className="create-plan-init-status" aria-live="polite">
                        Loading plans…
                      </p>
                    )}
                    {!createInitLoading && !canCopyFromAnySource && (
                      <p className="create-plan-init-status create-plan-init-muted">
                        No plans or actuals for this property to copy from. Add actuals under Actuals, create the plan
                        with zero amounts, or pick another property.
                      </p>
                    )}
                    {!createInitLoading && canCopyFromAnySource && (
                      <>
                <label className="create-plan-init-option">
                  <input
                    type="radio"
                    name="initMode"
                    value="last_year"
                    checked={initMode === "last_year"}
                    onChange={() => setInitMode("last_year")}
                    disabled={creating || !hasLastYearPlan}
                  />
                  <span>
                    Copy from previous year ({Number(createYear) - 1}, same property &amp; plan type)
                    {!hasLastYearPlan && (
                      <span className="create-plan-init-muted"> — no plan found for that year</span>
                    )}
                  </span>
                </label>
                <label className="create-plan-init-option">
                  <input
                    type="radio"
                    name="initMode"
                    value="from_year"
                    checked={initMode === "from_year"}
                    onChange={() => setInitMode("from_year")}
                    disabled={creating || copyYearOptions.length === 0}
                  />
                  <span>
                    Copy from a fiscal year (same property &amp; plan type)
                    {copyYearOptions.length === 0 && (
                      <span className="create-plan-init-muted"> — no other year available</span>
                    )}
                  </span>
                </label>
                {initMode === "from_year" && copyYearOptions.length > 0 && (
                  <label className="coa-field create-plan-init-detail">
                    Year to copy from
                    <select
                      className="provider-select"
                      value={copySourceYear}
                      onChange={(e) => setCopySourceYear(e.target.value)}
                      required={initMode === "from_year"}
                      disabled={creating}
                    >
                      <option value="">Select year…</option>
                      {copyYearOptions.map((y) => (
                        <option key={y} value={String(y)}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="create-plan-init-option">
                  <input
                    type="radio"
                    name="initMode"
                    value="from_actuals"
                    checked={initMode === "from_actuals"}
                    onChange={() => {
                      setInitMode("from_actuals");
                      if (actualsYearOptions.length > 0) {
                        const y = Number(copySourceYear);
                        if (!actualsYearOptions.includes(y)) {
                          setCopySourceYear(String(actualsYearOptions[0]));
                        }
                      }
                    }}
                    disabled={creating || actualsYearOptions.length === 0}
                  />
                  <span>
                    Copy from actuals (uploaded data for a calendar year)
                    {actualsYearOptions.length === 0 && (
                      <span className="create-plan-init-muted"> — no actuals for this property</span>
                    )}
                  </span>
                </label>
                {initMode === "from_actuals" && actualsYearOptions.length > 0 && (
                  <label className="coa-field create-plan-init-detail">
                    Actuals year
                    <select
                      className="provider-select"
                      value={copySourceYear}
                      onChange={(e) => setCopySourceYear(e.target.value)}
                      required={initMode === "from_actuals"}
                      disabled={creating}
                    >
                      <option value="">Select year…</option>
                      {actualsYearOptions.map((y) => (
                        <option key={y} value={String(y)}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="create-plan-init-option">
                  <input
                    type="radio"
                    name="initMode"
                    value="from_plan"
                    checked={initMode === "from_plan"}
                    onChange={() => setInitMode("from_plan")}
                    disabled={creating || copyPlanOptions.length === 0}
                  />
                  <span>
                    Copy from a specific plan
                    {copyPlanOptions.length === 0 && (
                      <span className="create-plan-init-muted"> — no plans for this property</span>
                    )}
                  </span>
                </label>
                {initMode === "from_plan" && copyPlanOptions.length > 0 && (
                  <label className="coa-field create-plan-init-detail">
                    Source plan
                    <select
                      className="provider-select"
                      value={copySourcePlanId}
                      onChange={(e) => setCopySourcePlanId(e.target.value)}
                      required={initMode === "from_plan"}
                      disabled={creating}
                    >
                      <option value="">Select plan…</option>
                      {copyPlanOptions.map((p) => {
                        const pt = PLAN_TYPE_STYLE[p.planType] || { label: p.planType };
                        return (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.fiscalYear} ({pt.label})
                          </option>
                        );
                      })}
                    </select>
                  </label>
                )}
                      </>
                    )}
                  </fieldset>
                )}
              </div>

              {creating && (
                <div className="create-progress-wrap" aria-live="polite">
                  <div className="create-progress-label">Creating plan... {createProgress}%</div>
                  <div className="create-progress-track">
                    <div className="create-progress-fill" style={{ width: `${createProgress}%` }} />
                  </div>
                </div>
              )}
              {createError && <div className="plans-error-detail">{createError}</div>}
              <div className="modal-footer">
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={
                    creating ||
                    !createPropertyId ||
                    (createInitEnabled &&
                      (createInitLoading ||
                        !canCopyFromAnySource ||
                        initMode === "none" ||
                        (initMode === "from_year" && !copySourceYear) ||
                        (initMode === "from_actuals" && !copySourceYear) ||
                        (initMode === "from_plan" && !copySourcePlanId) ||
                        (initMode === "last_year" && !hasLastYearPlan)))
                  }
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="modal-overlay"
          role="presentation"
        >
          <div className="modal-box api-key-modal create-plan-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete plan</h2>
              <p>
                Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This plan will be hidden.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={Boolean(deletingPlanId)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                type="button"
                onClick={confirmDeletePlan}
                disabled={Boolean(deletingPlanId)}
              >
                {deletingPlanId ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
