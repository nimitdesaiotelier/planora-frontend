import { useMemo, useState } from "react";
import { MONTHS } from "../data/budgetData";

const QUARTERS = [
  { key: "Q1", months: ["Jan", "Feb", "Mar"] },
  { key: "Q2", months: ["Apr", "May", "Jun"] },
  { key: "Q3", months: ["Jul", "Aug", "Sep"] },
  { key: "Q4", months: ["Oct", "Nov", "Dec"] },
];

function toMonthDraft(values) {
  const out = {};
  MONTHS.forEach((m) => {
    out[m] = String(values?.[m] ?? 0);
  });
  return out;
}

function toInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

export default function ManualEditModal({ row, onApply, onClose }) {
  const [draft, setDraft] = useState(() => toMonthDraft(row?.values));
  const [saving, setSaving] = useState(false);

  const total = useMemo(
    () => MONTHS.reduce((sum, month) => sum + toInt(draft[month]), 0),
    [draft]
  );
  const quarterTotals = useMemo(
    () =>
      QUARTERS.map((q) => ({
        key: q.key,
        total: q.months.reduce((sum, month) => sum + toInt(draft[month]), 0),
      })),
    [draft]
  );

  if (!row) return null;

  async function handleSave() {
    if (!onApply || row.id == null) return;
    setSaving(true);
    const values = {};
    MONTHS.forEach((month) => {
      values[month] = toInt(draft[month]);
    });
    await onApply(row.id, { values }, `Manual edit applied for ${row.label}`);
    setSaving(false);
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box manual-edit-modal">
        <div className="modal-header manual-edit-header">
          <div className="row-badge">{row.category}</div>
          <h2>
            📝 Manual Edit — <span className="row-name">{row.label}</span>
          </h2>
          <button className="close-btn" type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="manual-edit-subtitle">
          Update monthly values directly. Empty or invalid values are saved as 0.
        </div>

        <div className="manual-edit-grid">
          {QUARTERS.map((quarter) => (
            <div key={quarter.key} className="manual-edit-quarter">
              <div className="manual-edit-quarter-head">
                <span className="manual-edit-quarter-title">{quarter.key}</span>
                <span className="manual-edit-quarter-total">
                  Total: {quarter.months.reduce((sum, month) => sum + toInt(draft[month]), 0).toLocaleString()}
                </span>
              </div>
              <div className="manual-edit-quarter-months">
                {quarter.months.map((month) => (
                  <label key={month} className="manual-edit-field">
                    <span className="manual-edit-month">{month}</span>
                    <input
                      className="manual-edit-input"
                      type="number"
                      value={draft[month]}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [month]: e.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="manual-edit-total-bar">
          <span className="manual-edit-total-label">
            Annual Total ({quarterTotals.map((q) => `${q.key}: ${q.total.toLocaleString()}`).join(" | ")})
          </span>
          <span className="manual-edit-total-value">{total.toLocaleString()}</span>
        </div>

        <div className="modal-footer manual-edit-footer">
          <button className="btn-secondary" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-apply" type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Monthly Values"}
          </button>
        </div>
      </div>
    </div>
  );
}
