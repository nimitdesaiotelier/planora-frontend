import { formatCurrency, formatLineAmount, rowTotal } from "../utils/applyTransformation";
import { MONTHS } from "../data/budgetData";

/** Dept + Type + Line label + months + total + AI */
const EXTRA_COLS = 5;

export default function BudgetTable({ rows, onAiAction, lastUpdated }) {
  const revenueRows = rows.filter((r) => r.type === "Revenue");
  const statRows = rows.filter((r) => r.type === "Statistics");
  const expenseRows = rows.filter((r) => r.type === "Expense");

  function revenueTotal(month) {
    return revenueRows.reduce((s, r) => s + r.values[month], 0);
  }
  function expenseTotal(month) {
    return expenseRows.reduce((s, r) => s + r.values[month], 0);
  }
  function nopTotal(month) {
    return revenueTotal(month) - expenseTotal(month);
  }

  const fullColSpan = MONTHS.length + EXTRA_COLS;

  return (
    <div className="table-wrapper">
      <table className="budget-table">
        <thead>
          <tr>
            <th className="col-dept">Department</th>
            <th className="col-type">Type</th>
            <th className="col-label">Line item</th>
            {MONTHS.map((m) => (
              <th key={m} className="col-month">{m}</th>
            ))}
            <th className="col-total">Total</th>
            <th className="col-action">AI</th>
          </tr>
        </thead>
        <tbody>
          <tr className="section-header">
            <td colSpan={fullColSpan}>REVENUE</td>
          </tr>
          {revenueRows.map((row) => (
            <BudgetRow
              key={row.id}
              row={row}
              onAiAction={onAiAction}
              isLastUpdated={lastUpdated === row.id}
            />
          ))}
          <tr className="subtotal-row">
            <td colSpan={3}>Total Revenue</td>
            {MONTHS.map((m) => <td key={m}>{formatCurrency(revenueTotal(m))}</td>)}
            <td>{formatCurrency(MONTHS.reduce((s, m) => s + revenueTotal(m), 0))}</td>
            <td />
          </tr>

          <tr className="section-header">
            <td colSpan={fullColSpan}>STATISTICS</td>
          </tr>
          {statRows.map((row) => (
            <BudgetRow
              key={row.id}
              row={row}
              onAiAction={onAiAction}
              isLastUpdated={lastUpdated === row.id}
            />
          ))}

          <tr className="section-header">
            <td colSpan={fullColSpan}>EXPENSES</td>
          </tr>
          {expenseRows.map((row) => (
            <BudgetRow
              key={row.id}
              row={row}
              onAiAction={onAiAction}
              isLastUpdated={lastUpdated === row.id}
            />
          ))}
          <tr className="subtotal-row">
            <td colSpan={3}>Total Expenses</td>
            {MONTHS.map((m) => <td key={m}>{formatCurrency(expenseTotal(m))}</td>)}
            <td>{formatCurrency(MONTHS.reduce((s, m) => s + expenseTotal(m), 0))}</td>
            <td />
          </tr>

          <tr className="nop-row">
            <td colSpan={3}>Net Operating Profit</td>
            {MONTHS.map((m) => (
              <td key={m} className={nopTotal(m) >= 0 ? "pos" : "neg"}>
                {formatCurrency(nopTotal(m))}
              </td>
            ))}
            <td className={MONTHS.reduce((s, m) => s + nopTotal(m), 0) >= 0 ? "pos" : "neg"}>
              {formatCurrency(MONTHS.reduce((s, m) => s + nopTotal(m), 0))}
            </td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function BudgetRow({ row, onAiAction, isLastUpdated }) {
  return (
    <tr className={`data-row ${isLastUpdated ? "highlight-row" : ""}`}>
      <td className="dept-cell">{row.department ?? "—"}</td>
      <td className="type-cell">{row.type ?? "—"}</td>
      <td className="label-cell">
        {isLastUpdated && <span className="updated-dot" title="Recently updated by AI" />}
        {row.label}
      </td>
      {MONTHS.map((m) => (
        <td key={m} className="value-cell">{formatLineAmount(row, row.values[m])}</td>
      ))}
      <td className="value-cell total-cell">{formatLineAmount(row, rowTotal(row.values))}</td>
      <td className="action-cell">
        <button
          className="ai-btn"
          onClick={() => onAiAction(row)}
          title={`AI Action for ${row.label}`}
        >
          ✨
        </button>
      </td>
    </tr>
  );
}
