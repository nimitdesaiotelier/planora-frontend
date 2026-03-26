import { MONTHS, QUARTERS } from "../data/budgetData";

function getAffectedMonths(period) {
  if (!period || period === "full_year") return MONTHS;
  if (QUARTERS[period]) return QUARTERS[period];
  if (MONTHS.includes(period)) return [period];
  return MONTHS;
}

export function applyTransformation(row, parsed) {
  const { action, value, type, period } = parsed;
  const affectedMonths = getAffectedMonths(period);
  const newValues = { ...row.values };

  affectedMonths.forEach((month) => {
    const current = newValues[month];

    if (action === "copy" && type === "ly_actual") {
      const av = row.actualsValues ?? {}; // AI path uses server prior-FY budget instead
      newValues[month] = av[month] ?? 0;
    } else if (action === "increase") {
      if (type === "percentage") {
        newValues[month] = Math.round(current * (1 + value / 100));
      } else if (type === "absolute") {
        newValues[month] = current + value;
      }
    } else if (action === "decrease") {
      if (type === "percentage") {
        newValues[month] = Math.round(current * (1 - value / 100));
      } else if (type === "absolute") {
        newValues[month] = Math.max(0, current - value);
      }
    } else if (action === "set") {
      if (type === "absolute") {
        newValues[month] = value;
      }
    }
  });

  return newValues;
}

export function formatCurrency(val) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

/** Currency for Revenue/Expense; plain integer for Statistics */
export function formatLineAmount(row, val) {
  if (row?.type === "Statistics") {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(val);
  }
  return formatCurrency(val);
}

export function rowTotal(values) {
  return Object.values(values).reduce((a, b) => a + b, 0);
}
