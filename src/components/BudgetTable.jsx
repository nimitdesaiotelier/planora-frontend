import { useMemo } from "react";
import { formatCurrency, formatLineAmount, rowTotal } from "../utils/applyTransformation";
import { MONTHS } from "../data/budgetData";
import SortFilterThead from "./SortFilterThead";
import { useTableSortFilter } from "../hooks/useTableSortFilter";

/** Dept + Type + Line label + months + total + AI */
const EXTRA_COLS = 5;

export default function BudgetTable({ rows, onAiAction, lastUpdated }) {
  const budgetColumns = useMemo(() => {
    const cols = [
      {
        id: "department",
        header: "Department",
        accessor: (r) => r.department ?? "",
        sortable: true,
        filterable: true,
        thClassName: "col-dept",
        tdClassName: "dept-cell",
      },
      {
        id: "type",
        header: "Type",
        accessor: (r) => r.type ?? "",
        sortable: true,
        filterable: true,
        thClassName: "col-type",
        tdClassName: "type-cell",
      },
      {
        id: "label",
        header: "Line item",
        accessor: (r) => r.label ?? "",
        sortable: true,
        filterable: true,
        thClassName: "col-label",
        tdClassName: "label-cell",
        renderCell: (r) => (
          <>
            {lastUpdated === r.id && <span className="updated-dot" title="Recently updated by AI" />}
            {r.label}
          </>
        ),
      },
    ];
    MONTHS.forEach((m) => {
      cols.push({
        id: `val_${m}`,
        header: m,
        accessor: (r) => r.values?.[m] ?? 0,
        sortable: true,
        filterable: true,
        thClassName: "col-month",
        tdClassName: "value-cell",
        renderCell: (r) => formatLineAmount(r, r.values[m]),
      });
    });
    cols.push({
      id: "total",
      header: "Total",
      accessor: (r) => rowTotal(r.values),
      sortable: true,
      filterable: true,
      thClassName: "col-total",
      tdClassName: "value-cell total-cell",
      renderCell: (r) => formatLineAmount(r, rowTotal(r.values)),
    });
    cols.push({
      id: "ai",
      header: "AI",
      sortable: false,
      filterable: false,
      thClassName: "col-action",
      tdClassName: "action-cell",
      renderCell: (r) => (
        <button
          className="ai-btn"
          onClick={() => onAiAction(r)}
          title={`AI Action for ${r.label}`}
        >
          ✨
        </button>
      ),
    });
    return cols;
  }, [lastUpdated, onAiAction]);

  const { processedRows, sortKey, sortDir, filters, setFilter, toggleSort } = useTableSortFilter(
    rows,
    budgetColumns
  );

  const revenueRows = processedRows.filter((r) => r.type === "Revenue");
  const statRows = processedRows.filter((r) => r.type === "Statistics");
  const expenseRows = processedRows.filter((r) => r.type === "Expense");

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
          <SortFilterThead
            columns={budgetColumns}
            sortKey={sortKey}
            sortDir={sortDir}
            filters={filters}
            onSort={toggleSort}
            onFilterChange={setFilter}
          />
        </thead>
        <tbody>
          {processedRows.length === 0 ? (
            <tr>
              <td colSpan={fullColSpan} className="table-filter-empty-cell">
                No rows match your filters. Clear or change the filters above.
              </td>
            </tr>
          ) : (
            <>
              <tr className="section-header">
                <td colSpan={fullColSpan}>REVENUE</td>
              </tr>
              {revenueRows.map((row) => (
                <BudgetDataRow key={row.id} row={row} columns={budgetColumns} lastUpdated={lastUpdated} />
              ))}
              <tr className="subtotal-row">
                <td colSpan={3}>Total Revenue</td>
                {MONTHS.map((m) => (
                  <td key={m}>{formatCurrency(revenueTotal(m))}</td>
                ))}
                <td>{formatCurrency(MONTHS.reduce((s, m) => s + revenueTotal(m), 0))}</td>
                <td />
              </tr>

              <tr className="section-header">
                <td colSpan={fullColSpan}>STATISTICS</td>
              </tr>
              {statRows.map((row) => (
                <BudgetDataRow key={row.id} row={row} columns={budgetColumns} lastUpdated={lastUpdated} />
              ))}

              <tr className="section-header">
                <td colSpan={fullColSpan}>EXPENSES</td>
              </tr>
              {expenseRows.map((row) => (
                <BudgetDataRow key={row.id} row={row} columns={budgetColumns} lastUpdated={lastUpdated} />
              ))}
              <tr className="subtotal-row">
                <td colSpan={3}>Total Expenses</td>
                {MONTHS.map((m) => (
                  <td key={m}>{formatCurrency(expenseTotal(m))}</td>
                ))}
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
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

function BudgetDataRow({ row, columns, lastUpdated }) {
  return (
    <tr className={`data-row ${lastUpdated === row.id ? "highlight-row" : ""}`}>
      {columns.map((col) => (
        <td key={col.id} className={col.tdClassName ?? ""}>
          {col.renderCell ? col.renderCell(row) : String(col.accessor?.(row) ?? "")}
        </td>
      ))}
    </tr>
  );
}
