import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { downloadActualsExport, fetchActuals, saveBlobAs, uploadActualsExcel } from "../api/actualsApi";
import ExcelProgressToast from "../components/ExcelProgressToast";
import SortFilterThead from "../components/SortFilterThead";
import { useTableSortFilter } from "../hooks/useTableSortFilter";
import { fetchProperties } from "../api/plansApi";
import { MONTHS } from "../data/budgetData";

function fmt(v) {
  if (v == null) return "—";
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(v);
}

const ACTUALS_MONTH_FIELDS = [
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

function buildActualsColumns() {
  const cols = [
    {
      id: "coaCode",
      header: "COA code",
      accessor: (r) => r.coaCode,
      sortable: true,
      filterable: true,
      thClassName: "col-label",
      tdClassName: "label-cell coa-code-cell",
    },
    {
      id: "coaName",
      header: "COA name",
      accessor: (r) => r.coaName ?? "",
      sortable: true,
      filterable: true,
      thClassName: "col-label",
      tdClassName: "actuals-coa-name",
      renderCell: (r) => (r.coaName?.trim() ? r.coaName : "—"),
    },
  ];
  ACTUALS_MONTH_FIELDS.forEach((f, i) => {
    cols.push({
      id: f,
      header: MONTHS[i],
      accessor: (r) => r[f],
      sortable: true,
      filterable: true,
      renderCell: (r) => fmt(r[f]),
    });
  });
  cols.push({
    id: "dailyCount",
    header: "Daily (count)",
    accessor: (r) => (Array.isArray(r.dailyDetails) ? r.dailyDetails.length : 0),
    sortable: true,
    filterable: true,
    thClassName: "col-total",
    tdClassName: "daily-preview",
    renderCell: (r) =>
      Array.isArray(r.dailyDetails) ? `${r.dailyDetails.length} values` : "—",
  });
  return cols;
}

export default function ActualsPage() {
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [organizationId] = useState(1);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({
    open: false,
    title: "",
    detail: "",
    progress: null,
    variant: "loading",
  });

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

  const closeToast = useCallback(() => {
    setToast((t) => ({ ...t, open: false }));
  }, []);

  const actualsColumns = useMemo(() => buildActualsColumns(), []);
  const { processedRows, sortKey, sortDir, filters, setFilter, toggleSort } = useTableSortFilter(
    rows,
    actualsColumns
  );

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file || !propertyId) return;
    setToast({
      open: true,
      title: "Importing Excel…",
      detail: file.name,
      progress: null,
      variant: "loading",
    });
    try {
      const res = await uploadActualsExcel(file, year, Number(propertyId), organizationId, (p) =>
        setToast((t) => ({ ...t, progress: p }))
      );
      const ins = res.inserted ?? 0;
      const upd = res.updated ?? 0;
      const total = res.importedRows ?? ins + upd;
      setToast({
        open: true,
        title: "Import complete",
        detail: `${total} row(s): ${ins} inserted, ${upd} updated (upsert by COA code).`,
        progress: 100,
        variant: "success",
      });
      await loadActuals();
    } catch (err) {
      setToast({
        open: true,
        title: "Import failed",
        detail: err.message || "Upload failed",
        progress: null,
        variant: "error",
      });
    }
    e.target.value = "";
  }

  async function onDownloadExport() {
    if (!propertyId) return;
    setToast({
      open: true,
      title: "Exporting Excel…",
      detail: "",
      progress: null,
      variant: "loading",
    });
    try {
      const blob = await downloadActualsExport(year, Number(propertyId), organizationId, (p) =>
        setToast((t) => ({ ...t, progress: p }))
      );
      saveBlobAs(blob, `actuals-${year}-export.xlsx`);
      setToast({
        open: true,
        title: "Export complete",
        detail: "Your download should start shortly.",
        progress: 100,
        variant: "success",
      });
    } catch (err) {
      setToast({
        open: true,
        title: "Export failed",
        detail: err.message || String(err),
        progress: null,
        variant: "error",
      });
    }
  }

  return (
    <div className="plans-screen">
      <div className="plan-header">
        <div className="plan-info">
          <h1>Actuals</h1>
          {/* <span className="plan-badge">tbl_actuals_details</span> */}
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
          <button
            className="btn-secondary"
            type="button"
            onClick={onDownloadExport}
            disabled={!propertyId}
          >
            Export (.xlsx)
          </button>
          <label className="upload-label">
            Upload Excel
            <input
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="file-input"
              onChange={onFile}
              disabled={!propertyId}
            />
          </label>
        </div>
        <p className="plan-meta">
          Column A must be a <strong>COA code</strong> from{" "}
          <Link to="/coa" className="actuals-coa-link">
            Chart of accounts
          </Link>{" "}
          for this property. 
          {/* Column B is <strong>COA name</strong>, columns C–N = Jan–Dec, and optional columns O+ are daily values. Use{" "}
          <strong>Export</strong> for the exact upload format (headers only if there is no data yet). */}
           Re-importing the same file after export updates existing rows by COA code — no separate template.
        </p>
      </div>

      <main className="main-content">
        {loading && <div className="plans-state">Loading…</div>}
        {error && (
          <div className="plans-error">
            <pre className="plans-error-detail">{error}</pre>
          </div>
        )}
        {!loading && !error && rows.length === 0 && (
          <div className="plans-state">
            No actuals for this year/property. Export to get a starter file (headers only), fill rows, then upload.
          </div>
        )}
        {!loading && !error && rows.length > 0 && (
          <div className="table-wrapper">
            {processedRows.length === 0 && (
              <div className="plans-state table-filter-empty">No rows match your filters.</div>
            )}
            {processedRows.length > 0 && (
              <table className="budget-table actuals-table">
                <thead>
                  <SortFilterThead
                    columns={actualsColumns}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    filters={filters}
                    onSort={toggleSort}
                    onFilterChange={setFilter}
                  />
                </thead>
                <tbody>
                  {processedRows.map((r) => (
                    <tr key={r.id}>
                      {actualsColumns.map((col) => (
                        <td key={col.id} className={col.tdClassName}>
                          {col.renderCell ? col.renderCell(r) : String(col.accessor?.(r) ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>

      <ExcelProgressToast
        open={toast.open}
        title={toast.title}
        detail={toast.detail}
        progress={toast.progress}
        variant={toast.variant}
        onDismiss={closeToast}
      />
    </div>
  );
}
