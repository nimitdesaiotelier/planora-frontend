import { useEffect } from "react";
import "./ExcelProgressToast.css";

/**
 * Fixed top-right toast with optional progress bar for Excel import/export.
 * @param {boolean} open
 * @param {string} title
 * @param {string} [detail]
 * @param {number|null} progress — 0–100; null with variant loading = indeterminate bar
 * @param {'loading'|'success'|'error'} variant
 * @param {() => void} [onDismiss] — called after auto-dismiss or when clicking ×
 */
export default function ExcelProgressToast({ open, title, detail, progress, variant, onDismiss }) {
  useEffect(() => {
    if (!open || !onDismiss) return undefined;
    if (variant !== "success" && variant !== "error") return undefined;
    const ms = variant === "success" ? 2800 : 5200;
    const t = setTimeout(() => onDismiss(), ms);
    return () => clearTimeout(t);
  }, [open, variant, onDismiss]);

  if (!open) return null;

  const pct = progress == null ? null : Math.min(100, Math.max(0, progress));
  const showBar = variant === "loading";

  return (
    <div className="excel-toast-wrap" role="status" aria-live="polite">
      <div className={`excel-toast excel-toast--${variant}`}>
        <div className="excel-toast-header">
          <span className="excel-toast-title">{title}</span>
          {onDismiss && (
            <button type="button" className="excel-toast-close" onClick={onDismiss} aria-label="Dismiss">
              ×
            </button>
          )}
        </div>
        {detail ? <div className="excel-toast-detail">{detail}</div> : null}
        {showBar && (
          <>
            <div className="excel-toast-bar-wrap">
              {pct === null ? (
                <div className="excel-toast-bar-indeterminate" />
              ) : (
                <div className="excel-toast-bar-fill" style={{ width: `${pct}%` }} />
              )}
            </div>
            {pct !== null && <div className="excel-toast-pct">{pct}%</div>}
          </>
        )}
      </div>
    </div>
  );
}
