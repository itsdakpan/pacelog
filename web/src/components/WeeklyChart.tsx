import type { Summary } from "../api";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const shortDate = (iso: string) => {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
};

/**
 * Hand-rolled rather than a charting library: twelve bars need no dependency,
 * and this way the chart inherits the page's colours instead of fighting a
 * library's defaults.
 */
export function WeeklyChart({ series }: { series: Summary["weekly_series"] }) {
  if (series.length === 0) return null;

  const peak = Math.max(...series.map((week) => week.distance_km), 1);

  return (
    <section className="chart" aria-label="Weekly distance over the last 12 weeks">
      <div className="chart-head">
        <h2>Weekly volume</h2>
        <small>Last {series.length} weeks</small>
      </div>
      <div className="chart-bars">
        {series.map((week) => (
          <div
            key={week.week_start}
            className={week.distance_km === peak ? "chart-bar chart-bar--peak" : "chart-bar"}
            style={{ height: `${Math.max((week.distance_km / peak) * 100, 3)}%` }}
            title={`Week of ${shortDate(week.week_start)} · ${week.distance_km} km`}
          />
        ))}
      </div>
      <div className="chart-axis">
        <span>{shortDate(series[0].week_start)}</span>
        <span>{shortDate(series[series.length - 1].week_start)}</span>
      </div>
    </section>
  );
}
