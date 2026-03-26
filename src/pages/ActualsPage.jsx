import { useEffect, useState } from "react";
import { fetchActuals, uploadActualsExcel } from "../api/actualsApi";
import { fetchProperties } from "../api/plansApi";
import { MONTHS } from "../data/budgetData";

function fmt(v) {
  if (v == null) return "—";
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(v);
}

export default function ActualsPage() {
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [organizationId] = useState(1);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadMsg, setUploadMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchProperties(organizationId);
        setProperties(p);
        if (p.length && !propertyId) setPropertyId(String(p[0].id));
      } catch {
        setProperties([]);
      }
    })();
  }, [organizationId]);

  async function loadActuals() {
    if (!propertyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchActuals(year, propertyId, organizationId);
      setRows(data);
    } catch (e) {
      setError(e.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (propertyId) loadActuals();
  }, [year, propertyId, organizationId]);

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file || !propertyId) return;
    setUploadMsg("");
    try {
      const res = await uploadActualsExcel(file, year, Number(propertyId), organizationId);
      setUploadMsg(`Imported ${res.importedRows} row(s).`);
      await loadActuals();
    } catch (err) {
      setUploadMsg(err.message || "Upload failed");
    }
    e.target.value = "";
  }

  const monthFields = [
    "janValue",
    "febValue",
    "marValue",
    "aprValue",
    "mayValue",
    "junValue",
    "julValue",
    "augValue",
    "sepValue",
    "octValue",
    "novValue",
    "decValue",
  ];

  return (
    <div className="plans-screen">
      <div className="plan-header">
        <div className="plan-info">
          <h1>Actuals</h1>
          <span className="plan-badge">tbl_actuals_details</span>
        </div>
        <div className="plan-filter-row actuals-toolbar">
          <label>
            Year{" "}
            <input
              type="number"
              className="year-input"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </label>
          <label>
            Property{" "}
            <select
              className="provider-select"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary" type="button" onClick={loadActuals} disabled={loading}>
            Refresh
          </button>
          <label className="upload-label">
            Upload Excel
            <input type="file" accept=".xlsx,.xls" className="file-input" onChange={onFile} />
          </label>
        </div>
        <p className="plan-meta">
          Excel layout: column A = COA code, B–M = Jan–Dec, optional N+ = daily values (array).
        </p>
        {uploadMsg && <div className="upload-msg">{uploadMsg}</div>}
      </div>

      <main className="main-content">
        {loading && <div className="plans-state">Loading…</div>}
        {error && (
          <div className="plans-error">
            <pre className="plans-error-detail">{error}</pre>
          </div>
        )}
        {!loading && !error && rows.length === 0 && (
          <div className="plans-state">No actuals for this year/property. Upload an Excel file.</div>
        )}
        {!loading && !error && rows.length > 0 && (
          <div className="table-wrapper">
            <table className="budget-table actuals-table">
              <thead>
                <tr>
                  <th>COA</th>
                  {MONTHS.map((m) => (
                    <th key={m}>{m}</th>
                  ))}
                  <th>Daily (count)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="label-cell">{r.coaCode}</td>
                    {monthFields.map((f) => (
                      <td key={f}>{fmt(r[f])}</td>
                    ))}
                    <td className="daily-preview">
                      {Array.isArray(r.dailyDetails) ? `${r.dailyDetails.length} values` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
