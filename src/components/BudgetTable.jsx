import { useMemo, useState } from "react";
import { formatCurrency, formatLineAmount, rowTotal } from "../utils/applyTransformation";
import { MONTHS } from "../data/budgetData";
import SortFilterThead from "./SortFilterThead";
import { useTableSortFilter } from "../hooks/useTableSortFilter";

/** Tree blank + COA code + COA name + Dept + Account type + months + total + AI */
const EXTRA_COLS = 7;

export default function BudgetTable({ rows, onAiAction, lastUpdated }) {
  const [collapsedSections, setCollapsedSections] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const budgetColumns = useMemo(() => {
    const cols = [
      {
        id: "treeBlank",
        header: "",
        sortable: false,
        filterable: false,
        thClassName: "col-tree",
        tdClassName: "nested-shift-empty",
        renderCell: () => null,
      },
      {
        id: "coaCode",
        header: "COA code",
        accessor: (r) => r.coaCode ?? r.lineKey ?? "",
        sortable: true,
        filterable: true,
        thClassName: "col-label",
        tdClassName: "label-cell coa-code-cell",
      },
      {
        id: "coaName",
        header: "COA name",
        accessor: (r) => r.coaName ?? r.label ?? "",
        sortable: true,
        filterable: true,
        thClassName: "col-label",
        tdClassName: "coa-name-cell",
      },
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
        header: "Account type",
        accessor: (r) => r.type ?? "",
        sortable: true,
        filterable: true,
        thClassName: "col-type",
        tdClassName: "type-cell",
        renderCell: (r) => (
          <>
            {lastUpdated === r.id && <span className="updated-dot" title="Recently updated by AI" />}
            {r.type}
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

  const statRows = processedRows.filter((r) => r.type === "Statistics");
  const revenueRows = processedRows.filter((r) => r.type === "Revenue");
  const expenseRows = processedRows.filter((r) => r.type === "Expense");

  function revenueTotal(month) {
    return revenueRows.reduce((s, r) => s + r.values[month], 0);
  }
  function statsTotal(month) {
    return statRows.reduce((s, r) => s + r.values[month], 0);
  }
  function expenseTotal(month) {
    return expenseRows.reduce((s, r) => s + r.values[month], 0);
  }
  function nopTotal(month) {
    return revenueTotal(month) - expenseTotal(month);
  }

  function groupByDepartment(sectionRows) {
    const groups = new Map();
    sectionRows.forEach((r) => {
      const dept = r.department?.trim() || "Unassigned";
      if (!groups.has(dept)) groups.set(dept, []);
      groups.get(dept).push(r);
    });
    return Array.from(groups.entries()).map(([department, items]) => ({
      department,
      items,
      values: MONTHS.reduce((acc, m) => {
        acc[m] = items.reduce((s, r) => s + (r.values?.[m] ?? 0), 0);
        return acc;
      }, {}),
    }));
  }

  function renderDepartmentGroups(sectionRows, sectionType) {
    const groups = groupByDepartment(sectionRows);
    return groups.map((g) => {
      const groupKey = `${sectionType}::${g.department}`;
      const isCollapsed = Boolean(collapsedGroups[groupKey]);
      const summaryRow = {
        id: null,
        coaCode: "",
        coaName: g.department,
        department: g.department,
        type: sectionType,
        values: g.values,
      };
      return (
        <tbody key={`${sectionType}-${g.department}`}>
          <tr className="subtotal-row group-parent-row dept-child-row">
            <td className="label-cell department-parent-cell">
              <button
                type="button"
                className="group-toggle-btn"
                onClick={() =>
                  setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }))
                }
                aria-expanded={!isCollapsed}
                aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${g.department} ${sectionType}`}
              >
                {isCollapsed ? "▸" : "▾"}
              </button>
              {g.department}
            </td>
            <td />
            <td />
            <td />
            <td className="type-cell">{sectionType}</td>
            {MONTHS.map((m) => (
              <td key={m}>{formatCurrency(g.values[m])}</td>
            ))}
            <td>{formatCurrency(rowTotal(g.values))}</td>
            <td className="action-cell" />
          </tr>
          {!isCollapsed &&
            g.items.map((row, idx) => (
              <BudgetDataRow
                key={row.id}
                row={row}
                columns={budgetColumns}
                lastUpdated={lastUpdated}
                showAi
                rowClassName={`nested-child-row nested-grandchild-row ${idx === g.items.length - 1 ? "nested-child-last" : ""}`}
              />
            ))}
        </tbody>
      );
    });
  }

  function renderSection(sectionRows, sectionType, title, totalFn) {
    const sectionCollapsed = Boolean(collapsedSections[sectionType]);
    return (
      <>
        <tbody>
          <tr className="section-header tree-section-parent">
            <td colSpan={fullColSpan}>
              <button
                type="button"
                className="group-toggle-btn section-toggle-btn"
                onClick={() =>
                  setCollapsedSections((prev) => ({ ...prev, [sectionType]: !prev[sectionType] }))
                }
                aria-expanded={!sectionCollapsed}
                aria-label={`${sectionCollapsed ? "Expand" : "Collapse"} ${title}`}
              >
                {sectionCollapsed ? "▸" : "▾"}
              </button>
              {title}
            </td>
          </tr>
        </tbody>
        {!sectionCollapsed && renderDepartmentGroups(sectionRows, sectionType)}
        {!sectionCollapsed && (
          <tbody>
            <tr className="subtotal-row">
              <td colSpan={5}>Total {title}</td>
              {MONTHS.map((m) => (
                <td key={m}>{formatCurrency(totalFn(m))}</td>
              ))}
              <td>{formatCurrency(MONTHS.reduce((s, m) => s + totalFn(m), 0))}</td>
              <td />
            </tr>
          </tbody>
        )}
      </>
    );
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
        {processedRows.length === 0 ? (
          <tbody>
            <tr>
              <td colSpan={fullColSpan} className="table-filter-empty-cell">
                No rows match your filters. Clear or change the filters above.
              </td>
            </tr>
          </tbody>
        ) : (
          <>
            {renderSection(statRows, "Statistics", "Statistics", statsTotal)}
            {renderSection(revenueRows, "Revenue", "Revenue", revenueTotal)}
            {renderSection(expenseRows, "Expense", "Expenses", expenseTotal)}
            <tbody>
              <tr className="nop-row">
                <td colSpan={5}>Net Operating Profit</td>
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
          </>
        )}
      </table>
    </div>
  );
}

function BudgetDataRow({ row, columns, lastUpdated, showAi = true, rowClassName = "" }) {
  return (
    <tr className={`data-row ${lastUpdated === row.id ? "highlight-row" : ""} ${rowClassName}`.trim()}>
      {columns.map((col) => (
        <td key={col.id} className={col.tdClassName ?? ""}>
          {col.id === "ai"
            ? showAi
              ? (col.renderCell ? col.renderCell(row) : null)
              : null
            : null}
          {col.id !== "ai" &&
            col.id !== "treeBlank" &&
            (col.id === "coaCode" && rowClassName
              ? (
                <span className="nested-child-code">
                  {col.renderCell ? col.renderCell(row) : String(col.accessor?.(row) ?? "")}
                </span>
              )
              : col.id === "coaName" && rowClassName
              ? (
                <span className="nested-child-label">
                  {col.renderCell ? col.renderCell(row) : String(col.accessor?.(row) ?? "")}
                </span>
              )
              : col.renderCell
                ? col.renderCell(row)
                : String(col.accessor?.(row) ?? ""))}
        </td>
      ))}
    </tr>
  );
}
