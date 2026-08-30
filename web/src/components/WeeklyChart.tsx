import type { Summary } from "../api";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const shortDate = (iso: string) => {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
};

/**
 * Hand-rolled rather than a charting library: twelve bars need no dependency.
 * Every bar carries its own value so the chart can be read without hovering.
 */
export function WeeklyChart({ series }: { series: Summary["weekly_series"] }) {
  if (series.length === 0) return null;

  const peak = Math.max(...series.map((week) => week.distance_km), 1);

  return (
    <section className="chart" aria-label="Distance run each week for the last 12 weeks">
      <div className="chart-head">
        <h2>Distance per week</h2>
        <small>Last {series.length} weeks, in km</small>
      </div>

      <div className="chart-bars">
        {series.map((week) => (
          <div className="chart-col" key={week.week_start}>
            <span className="chart-value num">{week.distance_km}</span>
            <div
              className={week.distance_km === peak ? "chart-bar chart-bar--peak" : "chart-bar"}
              style={{ height: `${Math.max((week.distance_km / peak) * 100, 3)}%` }}
            />
            <span className="chart-week num">{shortDate(week.week_start)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
