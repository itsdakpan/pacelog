import type { Summary } from "../api";
import { convertDistance, formatPace } from "../lib/format";
import type { DistanceUnit } from "../lib/format";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const shortDate = (iso: string) => {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
};

/**
 * Hand-rolled rather than a charting library: twelve bars need no dependency.
 * Every bar carries its own value so the chart can be read without hovering.
 */
type Props = { series: Summary["weekly_series"]; trend: Summary["pace_trend"]; unit: DistanceUnit };

function trendSentence(trend: NonNullable<Summary["pace_trend"]>, unit: DistanceUnit) {
  const current = `Average ${formatPace(trend.current_pace, unit)} over the last ${trend.weeks} weeks`;
  if (trend.delta_seconds === null) return `${current}.`;
  if (trend.delta_seconds === 0) return `${current} — unchanged on the ${trend.weeks} before.`;

  const seconds = Math.abs(trend.delta_seconds);
  const direction = trend.delta_seconds < 0 ? "faster" : "slower";
  const convertedSeconds = unit === "mi" ? Math.round(seconds * 1.609344) : seconds;
  return `${current} — ${convertedSeconds}s/${unit} ${direction} than the ${trend.weeks} before.`;
}

export function WeeklyChart({ series, trend, unit }: Props) {
  if (series.length === 0) return null;

  const peak = Math.max(...series.map((week) => week.distance_km), 1);

  return (
    <section className="chart" aria-label="Distance run each week for the last 12 weeks">
      <div className="chart-head">
        <h2>Distance per week</h2>
        <small>Last {series.length} weeks, in {unit}</small>
      </div>

      <div className="chart-bars">
        {series.map((week) => (
          <div className="chart-col" key={week.week_start}>
            <span className="chart-value num">{convertDistance(week.distance_km, unit).toFixed(1)}</span>
            <div
              className={week.distance_km === peak ? "chart-bar chart-bar--peak" : "chart-bar"}
              style={{ height: `${Math.max((week.distance_km / peak) * 100, 3)}%` }}
            />
            <span className="chart-week num">{shortDate(week.week_start)}</span>
          </div>
        ))}
      </div>

      {trend && <p className="stat-note chart-trend">{trendSentence(trend, unit)}</p>}
    </section>
  );
}
