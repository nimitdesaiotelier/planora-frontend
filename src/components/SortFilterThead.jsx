/**
 * Two-row thead: titles (+ optional sort) and filter inputs.
 * Omit sort/filter UI for columns with sortable:false and filterable:false (e.g. Actions).
 */
export default function SortFilterThead({ columns, sortKey, sortDir, filters, onSort, onFilterChange }) {
  return (
    <>
      <tr>
        {columns.map((col) => (
          <th key={col.id} className={col.thClassName} scope="col">
            {col.sortable ? (
              <button
                type="button"
                className={`sort-filter-th-btn ${sortKey === col.id ? "is-active" : ""}`}
                onClick={() => onSort(col.id)}
              >
                <span>{col.header}</span>
                <span className="sort-filter-icons" aria-hidden>
                  {sortKey === col.id ? (sortDir === "asc" ? " ▲" : " ▼") : " ⇅"}
                </span>
              </button>
            ) : (
              <span className="sort-filter-th-plain">{col.header}</span>
            )}
          </th>
        ))}
      </tr>
      <tr className="table-filter-row">
        {columns.map((col) => (
          <th key={`f-${col.id}`} className={col.filterThClassName}>
            {col.filterable ? (
              <input
                type="search"
                className="table-filter-input"
                placeholder="Filter…"
                value={filters[col.id] ?? ""}
                onChange={(e) => onFilterChange(col.id, e.target.value)}
                aria-label={`Filter ${col.header}`}
              />
            ) : (
              <span className="table-filter-placeholder" aria-hidden />
            )}
          </th>
        ))}
      </tr>
    </>
  );
}
