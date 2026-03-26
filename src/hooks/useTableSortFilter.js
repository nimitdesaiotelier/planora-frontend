import { useCallback, useMemo, useState } from "react";
import { applySortFilter, nextSortState } from "../utils/tableSortFilter";

/**
 * @param {object[]} rows
 * @param {{ id: string, accessor?: (row: object) => unknown, sortable?: boolean, filterable?: boolean }[]} columns
 */
export function useTableSortFilter(rows, columns) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [filters, setFilters] = useState({});

  const setFilter = useCallback((columnId, value) => {
    setFilters((f) => {
      const next = { ...f, [columnId]: value };
      if (value === "" || value == null) {
        delete next[columnId];
      }
      return next;
    });
  }, []);

  const toggleSort = useCallback(
    (columnId) => {
      const col = columns.find((c) => c.id === columnId);
      if (!col?.sortable) return;
      const next = nextSortState(sortKey, sortDir, columnId);
      setSortKey(next.key);
      setSortDir(next.dir);
    },
    [columns, sortKey, sortDir]
  );

  const clearFilters = useCallback(() => setFilters({}), []);
  const clearSort = useCallback(() => {
    setSortKey(null);
    setSortDir("asc");
  }, []);

  const processedRows = useMemo(
    () => applySortFilter(rows, columns, filters, sortKey, sortDir),
    [rows, columns, filters, sortKey, sortDir]
  );

  return {
    processedRows,
    sortKey,
    sortDir,
    filters,
    setFilter,
    toggleSort,
    clearFilters,
    clearSort,
  };
}
