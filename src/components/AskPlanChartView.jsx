import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildAskPlanLineBarSeries, buildAskPlanPieData, CHART_COLORS } from "./askPlanChartData";

export default function AskPlanChartView({ chartType, resultRows, showCompare, showActuals }) {
  const axisColor = "#94a3b8";
  const gridColor = "#2a3148";
  const tooltipStyle = {
    background: "#161b27",
    border: "1px solid #2a3148",
    borderRadius: 8,
    color: "#e2e8f0",
  };

  if (chartType === "pie") {
    const { pieData, hasNumeric } = buildAskPlanPieData(resultRows);
    if (!hasNumeric) return null;

    return (
      <div className="ask-plan-chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="70%"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            >
              {pieData.map((_, i) => (
                <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const { data, series, hasNumeric } = buildAskPlanLineBarSeries(resultRows, showCompare, showActuals);
  if (!hasNumeric) return null;

  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
      <XAxis dataKey="month" tick={{ fill: axisColor }} />
      <YAxis tick={{ fill: axisColor }} />
      <Tooltip contentStyle={tooltipStyle} />
      <Legend />
    </>
  );

  if (chartType === "line") {
    return (
      <div className="ask-plan-chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 20, left: 4, bottom: 8 }}>
            {common}
            {series.map((s) => (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={s.color}
                dot={false}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="ask-plan-chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 20, left: 4, bottom: 8 }}>
          {common}
          {series.map((s) => (
            <Bar key={s.dataKey} dataKey={s.dataKey} name={s.name} fill={s.color} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
