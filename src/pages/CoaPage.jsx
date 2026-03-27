import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCoa,
  deleteCoa,
  downloadCoaExport,
  fetchCoaList,
  saveBlobAs,
  updateCoa,
  uploadCoaExcel,
} from "../api/coaApi";
import ExcelProgressToast from "../components/ExcelProgressToast";
import SortFilterThead from "../components/SortFilterThead";
import { useTableSortFilter } from "../hooks/useTableSortFilter";
import { fetchProperties } from "../api/plansApi";

const LINE_TYPES = ["Revenue", "Expense", "Statistics"];

const emptyForm = () => ({
  coaCode: "",
  coaName: "",
  department: "",
  lineItemType: "Revenue",
});

export default function CoaPage() {
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState("");
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

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

  const loadCoa = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCoaList(propertyId, organizationId);
      setRows(data);
    } catch (e) {
      setError(e.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [propertyId, organizationId]);

  useEffect(() => {
    if (propertyId) loadCoa();
  }, [propertyId, organizationId, loadCoa]);

  const closeToast = useCallback(() => {
    setToast((t) => ({ ...t, open: false }));
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
    setModalOpen(true);
  }

  const openEdit = useCallback((row) => {
    setEditingId(row.id);
    setForm({
      coaCode: row.coaCode ?? "",
      coaName: row.coaName ?? "",
      department: row.department ?? "",
      lineItemType: row.lineItemType ?? "Revenue",
    });
    setFormError("");
    setModalOpen(true);
  }, []);

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setFormError("");
  }

  async function submitForm(e) {
    e.preventDefault();
    if (!propertyId) return;
    setFormError("");
    setSaving(true);
    try {
      if (editingId == null) {
        await createCoa({
          ...form,
          propertyId: Number(propertyId),
          organizationId,
        });
      } else {
        await updateCoa(editingId, form, propertyId, organizationId);
      }
      closeModal();
      await loadCoa();
    } catch (err) {
      setFormError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const onDelete = useCallback(
    async (row) => {
      if (!propertyId) return;
      const ok = window.confirm(`Delete COA "${row.coaCode}" (${row.coaName})?`);
      if (!ok) return;
      setError(null);
      try {
        await deleteCoa(row.id, propertyId, organizationId);
        await loadCoa();
      } catch (e) {
        setError(e.message || String(e));
      }
    },
    [propertyId, organizationId, loadCoa]
  );

  const coaColumns = useMemo(
    () => [
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
        accessor: (r) => r.coaName,
        sortable: true,
        filterable: true,
        thClassName: "col-label",
        tdClassName: "coa-name-cell",
      },
      {
        id: "department",
        header: "Department",
        accessor: (r) => r.department,
        sortable: true,
        filterable: true,
        thClassName: "col-dept",
        tdClassName: "dept-cell",
      },
      {
        id: "lineItemType",
        header: "Type",
        accessor: (r) => r.lineItemType,
        sortable: true,
        filterable: true,
        thClassName: "col-type",
        tdClassName: "type-cell",
        renderCell: (r) => <span className="coa-type-pill">{r.lineItemType}</span>,
      },
      {
        id: "actions",
        header: "Actions",
        sortable: false,
        filterable: false,
        thClassName: "coa-actions-col",
        tdClassName: "coa-actions-cell",
        renderCell: (r) => (
          <>
            <button type="button" className="btn-link" onClick={() => openEdit(r)}>
              Edit
            </button>
            <button type="button" className="btn-link btn-link-danger" onClick={() => onDelete(r)}>
              Delete
            </button>
          </>
        ),
      },
    ],
    [openEdit, onDelete]
  );

  const { processedRows, sortKey, sortDir, filters, setFilter, toggleSort } = useTableSortFilter(
    rows,
    coaColumns
  );

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
      const blob = await downloadCoaExport(propertyId, organizationId, (p) =>
        setToast((t) => ({ ...t, progress: p }))
      );
      saveBlobAs(blob, "coa-export.xlsx");
      setToast({
        open: true,
        title: "Export complete",
        detail: "Your download should start shortly.",
        progress: 100,
        variant: "success",
      });
    } catch (e) {
      setToast({
        open: true,
        title: "Export failed",
        detail: e.message || String(e),
        progress: null,
        variant: "error",
      });
    }
  }

  async function onUploadFile(e) {
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
      const res = await uploadCoaExcel(file, propertyId, organizationId, (p) =>
        setToast((t) => ({ ...t, progress: p }))
      );
      const ins = res.inserted ?? 0;
      const upd = res.updated ?? 0;
      const total = res.importedRows ?? ins + upd;
      setToast({
        open: true,
        title: "Import complete",
        detail: `${total} row(s): ${ins} inserted, ${upd} updated.`,
        progress: 100,
        variant: "success",
      });
      await loadCoa();
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

  return (
    <div className="plans-screen">
      <div className="plan-header">
        <div className="plan-info">
          <h1>Chart of accounts</h1>
          <span className="plan-badge">tbl_coa</span>
        </div>
        <div className="plan-filter-row actuals-toolbar coa-toolbar">
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
          <button className="btn-primary" type="button" onClick={loadCoa} disabled={loading}>
            Refresh
          </button>
          <button className="btn-primary" type="button" onClick={openCreate} disabled={!propertyId}>
            Add COA
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
              onChange={onUploadFile}
              disabled={!propertyId}
            />
          </label>
        </div>
        <p className="plan-meta">
          Columns: coaCode, coaName, department, lineItemType (Revenue / Expense / Statistics).{" "}
          <strong>Export</strong> is the same format as upload (headers only when empty). Re-importing after export
          updates existing codes — no separate template.
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
            No COA rows for this property. Add one, or export for a starter file (headers only), then upload.
          </div>
        )}
        {!loading && !error && rows.length > 0 && (
          <div className="table-wrapper">
            {processedRows.length === 0 && (
              <div className="plans-state table-filter-empty">No rows match your filters.</div>
            )}
            {processedRows.length > 0 && (
              <table className="budget-table coa-table">
                <thead>
                  <SortFilterThead
                    columns={coaColumns}
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
                      {coaColumns.map((col) => (
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

      {modalOpen && (
        <div className="modal-overlay" role="presentation">
          <div className="modal-box api-key-modal coa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId == null ? "Add COA" : "Edit COA"}</h2>
              <p>Code must stay unique per property and organization.</p>
            </div>
            <form onSubmit={submitForm}>
              <div className="modal-body coa-form">
                <label className="coa-field">
                  COA code
                  <input
                    className="api-key-input"
                    value={form.coaCode}
                    onChange={(e) => setForm((f) => ({ ...f, coaCode: e.target.value }))}
                    required
                    maxLength={128}
                    autoComplete="off"
                  />
                </label>
                <label className="coa-field">
                  COA name
                  <input
                    className="api-key-input"
                    value={form.coaName}
                    onChange={(e) => setForm((f) => ({ ...f, coaName: e.target.value }))}
                    required
                    maxLength={512}
                  />
                </label>
                <label className="coa-field">
                  Department
                  <input
                    className="api-key-input"
                    value={form.department}
                    onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                    required
                    maxLength={255}
                  />
                </label>
                <label className="coa-field">
                  Type
                  <select
                    className="provider-select coa-type-select"
                    value={form.lineItemType}
                    onChange={(e) => setForm((f) => ({ ...f, lineItemType: e.target.value }))}
                  >
                    {LINE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                {formError && <p className="error-text">{formError}</p>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
