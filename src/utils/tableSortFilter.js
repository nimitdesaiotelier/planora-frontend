/** Generic client-side filter + sort for table rows. */

export function normalizeFilterValue(row, accessor) {
  if (!accessor) return "";
  const v = accessor(row);
  if (v == null) return "";
  if (typeof v === "object" && v !== null && !(v instanceof Date)) {
    return JSON.stringify(v);
  }
  return String(v);
}

export function rowMatchesFilters(row, columns, filters) {
  for (const col of columns) {
    if (!col.filterable || !col.accessor) continue;
    const raw = filters[col.id];
    if (raw == null || String(raw).trim() === "") continue;
    const q = String(raw).trim().toLowerCase();
    const hay = normalizeFilterValue(row, col.accessor).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function compareForSort(a, b) {
  const na = Number(a);
  const nb = Number(b);
  const aNum = a !== null && a !== undefined && a !== "" && Number.isFinite(na);
  const bNum = b !== null && b !== undefined && b !== "" && Number.isFinite(nb);
  if (aNum && bNum) return na - nb;
  return String(a ?? "").localeCompare(String(b ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * @param {object[]} rows
 * @param {TableColumnDef[]} columns
 * @param {Record<string, string>} filters
 * @param {string|null} sortKey
 * @param {'asc'|'desc'} sortDir
 */
export function applySortFilter(rows, columns, filters, sortKey, sortDir) {
  let out = rows.filter((row) => rowMatchesFilters(row, columns, filters));
  if (!sortKey) return out;
  const col = columns.find((c) => c.id === sortKey && c.sortable && c.accessor);
  if (!col) return out;
  out = [...out].sort((ra, rb) => {
    const va = col.accessor(ra);
    const vb = col.accessor(rb);
    const c = compareForSort(va, vb);
    return sortDir === "desc" ? -c : c;
  });
  return out;
}

/** Cycle: none → asc → desc → none */
export function nextSortState(currentKey, currentDir, columnId) {
  if (currentKey !== columnId) {
    return { key: columnId, dir: "asc" };
  }
  if (currentDir === "asc") {
    return { key: columnId, dir: "desc" };
  }
  return { key: null, dir: "asc" };
}
