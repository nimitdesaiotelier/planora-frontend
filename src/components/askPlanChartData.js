import { MONTHS } from "../data/budgetData";

/** Soft pastel palette (readable on dark modal background) */
export const CHART_COLORS = [
  "#a8b8ff",
  "#9fe2bf",
  "#ffd4a3",
  "#ffb3c1",
  "#a8d4f0",
  "#d4c4f9",
  "#ffc8dd",
  "#b5ead7",
];

function sanitizeKey(lineKey, index) {
  const base = String(lineKey || `row${index}`)
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .slice(0, 48);
  return `rk_${index}_${base}`;
}

function numMonth(v) {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function buildAskPlanLineBarSeries(resultRows, showCompare, showActuals) {
  const data = MONTHS.map((month) => {
    const point = { month };
    resultRows.forEach((row, i) => {
      const prefix = sanitizeKey(row.lineKey, i);
      point[`${prefix}_base`] = numMonth(row.baseValues?.[month]);
      if (showCompare) {
        point[`${prefix}_cmp`] = numMonth(row.compareValues?.[month]);
      }
      if (showActuals) {
        point[`${prefix}_act`] = numMonth(row.actualValues?.[month]);
      }
    });
    return point;
  });

  const series = [];
  resultRows.forEach((row, i) => {
    const prefix = sanitizeKey(row.lineKey, i);
    const label = row.coaName || row.label || row.lineKey || `Row ${i + 1}`;
    series.push({
      dataKey: `${prefix}_base`,
      name: `${label} (base)`,
      color: CHART_COLORS[i % CHART_COLORS.length],
    });
    if (showCompare) {
      series.push({
        dataKey: `${prefix}_cmp`,
        name: `${label} (compare)`,
        color: CHART_COLORS[(i + 3) % CHART_COLORS.length],
      });
    }
    if (showActuals) {
      series.push({
        dataKey: `${prefix}_act`,
        name: `${label} (actual)`,
        color: CHART_COLORS[(i + 5) % CHART_COLORS.length],
      });
    }
  });

  const hasNumeric = data.some((p) =>
    Object.keys(p).some((k) => k !== "month" && typeof p[k] === "number" && p[k] !== 0)
  );

  return { data, series, hasNumeric };
}

export function buildAskPlanPieData(resultRows) {
  const pieData = resultRows.map((row, i) => {
    const name = row.coaName || row.label || row.lineKey || `Item ${i + 1}`;
    let value = Number(row.baseTotal);
    if (!Number.isFinite(value)) {
      value = MONTHS.reduce((s, m) => s + numMonth(row.baseValues?.[m]), 0);
    }
    return { name, value };
  });

  const hasNumeric = pieData.some((d) => Number.isFinite(d.value) && d.value !== 0);
  return { pieData, hasNumeric };
}
