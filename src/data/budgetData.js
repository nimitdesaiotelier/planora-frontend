export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const QUARTERS = {
  Q1: ["Jan", "Feb", "Mar"],
  Q2: ["Apr", "May", "Jun"],
  Q3: ["Jul", "Aug", "Sep"],
  Q4: ["Oct", "Nov", "Dec"],
};

/** Allowed line types (matches backend LineItemType) */
export const LINE_TYPES = ["Revenue", "Expense", "Statistics"];

export const initialBudgetData = [
  {
    id: "transient-revenue",
    department: "Rooms",
    type: "Revenue",
    category: "Revenue",
    label: "Transient Revenue",
    values: {
      Jan: 42000, Feb: 38000, Mar: 45000,
      Apr: 51000, May: 55000, Jun: 60000,
      Jul: 63000, Aug: 65000, Sep: 58000,
      Oct: 52000, Nov: 48000, Dec: 44000,
    },
    actualsValues: {
      Jan: 39000, Feb: 35000, Mar: 41000,
      Apr: 46000, May: 50000, Jun: 54000,
      Jul: 57000, Aug: 59000, Sep: 52000,
      Oct: 47000, Nov: 43000, Dec: 40000,
    },
  },
  {
    id: "group-revenue",
    department: "Sales",
    type: "Revenue",
    category: "Revenue",
    label: "Group Revenue",
    values: {
      Jan: 18000, Feb: 16000, Mar: 22000,
      Apr: 25000, May: 28000, Jun: 30000,
      Jul: 27000, Aug: 26000, Sep: 24000,
      Oct: 21000, Nov: 19000, Dec: 17000,
    },
    actualsValues: {
      Jan: 16000, Feb: 14000, Mar: 20000,
      Apr: 22000, May: 25000, Jun: 27000,
      Jul: 24000, Aug: 23000, Sep: 21000,
      Oct: 19000, Nov: 17000, Dec: 15000,
    },
  },
  {
    id: "fb-revenue",
    department: "F&B",
    type: "Revenue",
    category: "Revenue",
    label: "F&B Revenue",
    values: {
      Jan: 12000, Feb: 11000, Mar: 13000,
      Apr: 15000, May: 16000, Jun: 18000,
      Jul: 19000, Aug: 20000, Sep: 17000,
      Oct: 14000, Nov: 13000, Dec: 11000,
    },
    actualsValues: {
      Jan: 11000, Feb: 10000, Mar: 12000,
      Apr: 13000, May: 14000, Jun: 16000,
      Jul: 17000, Aug: 18000, Sep: 15000,
      Oct: 13000, Nov: 12000, Dec: 10000,
    },
  },
  {
    id: "rooms-available",
    department: "Rooms",
    type: "Statistics",
    category: "Statistics",
    label: "Rooms Available",
    values: {
      Jan: 3100, Feb: 3100, Mar: 3100, Apr: 3100, May: 3100, Jun: 3100,
      Jul: 3100, Aug: 3100, Sep: 3100, Oct: 3100, Nov: 3100, Dec: 3100,
    },
    actualsValues: {
      Jan: 3080, Feb: 3080, Mar: 3080, Apr: 3080, May: 3080, Jun: 3080,
      Jul: 3080, Aug: 3080, Sep: 3080, Oct: 3080, Nov: 3080, Dec: 3080,
    },
  },
  {
    id: "occupied-room-nights",
    department: "Rooms",
    type: "Statistics",
    category: "Statistics",
    label: "Occupied Room Nights",
    values: {
      Jan: 2420, Feb: 2190, Mar: 2580, Apr: 2880, May: 3110, Jun: 3350,
      Jul: 3520, Aug: 3600, Sep: 3280, Oct: 2880, Nov: 2650, Dec: 2410,
    },
    actualsValues: {
      Jan: 2280, Feb: 2050, Mar: 2420, Apr: 2700, May: 2920, Jun: 3140,
      Jul: 3300, Aug: 3380, Sep: 3080, Oct: 2700, Nov: 2490, Dec: 2260,
    },
  },
  {
    id: "labor-expense",
    department: "Operations",
    type: "Expense",
    category: "Expense",
    label: "Labor Expense",
    values: {
      Jan: 28000, Feb: 26000, Mar: 30000,
      Apr: 32000, May: 34000, Jun: 36000,
      Jul: 38000, Aug: 39000, Sep: 35000,
      Oct: 31000, Nov: 29000, Dec: 27000,
    },
    actualsValues: {
      Jan: 26000, Feb: 24000, Mar: 28000,
      Apr: 29000, May: 31000, Jun: 33000,
      Jul: 35000, Aug: 36000, Sep: 32000,
      Oct: 28000, Nov: 27000, Dec: 25000,
    },
  },
  {
    id: "utilities-expense",
    department: "Property",
    type: "Expense",
    category: "Expense",
    label: "Utilities Expense",
    values: {
      Jan: 8000, Feb: 7500, Mar: 7000,
      Apr: 6500, May: 6000, Jun: 6500,
      Jul: 7000, Aug: 7500, Sep: 7000,
      Oct: 7500, Nov: 8000, Dec: 8500,
    },
    actualsValues: {
      Jan: 7500, Feb: 7000, Mar: 6500,
      Apr: 6000, May: 5500, Jun: 6000,
      Jul: 6500, Aug: 7000, Sep: 6500,
      Oct: 7000, Nov: 7500, Dec: 8000,
    },
  },
  {
    id: "marketing-expense",
    department: "Sales & Marketing",
    type: "Expense",
    category: "Expense",
    label: "Marketing Expense",
    values: {
      Jan: 5000, Feb: 5000, Mar: 6000,
      Apr: 7000, May: 7000, Jun: 8000,
      Jul: 8000, Aug: 8000, Sep: 7000,
      Oct: 6000, Nov: 5000, Dec: 5000,
    },
    actualsValues: {
      Jan: 4500, Feb: 4500, Mar: 5500,
      Apr: 6500, May: 6500, Jun: 7500,
      Jul: 7500, Aug: 7500, Sep: 6500,
      Oct: 5500, Nov: 4500, Dec: 4500,
    },
  },
];
