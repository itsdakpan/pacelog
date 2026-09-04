import type { Summary } from "../api";
import { Logo } from "./Logo";
import { formatDistance, formatToday } from "../lib/format";
import type { DistanceUnit } from "../lib/format";

type Props = { summary: Summary; unit: DistanceUnit; onUnitChange: (unit: DistanceUnit) => void };

export function Masthead({ summary, unit, onUnitChange }: Props) {
  return (
    <>
      <header>
        <p className="wordmark">
          <Logo />
          <span>PACELOG</span>
        </p>
        <h1>Every run tells a story.</h1>
        <span>Run, track your progress, build the habit and get stronger.</span>
      </header>

      <div className="dashboard-tools">
        <time dateTime={new Date().toISOString().slice(0, 10)}>
          <span>Today</span>
          {formatToday()}
        </time>
        <div className="unit-toggle" aria-label="Units">
          {(["km", "mi"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={unit === option ? "active" : ""}
              aria-pressed={unit === option}
              onClick={() => onUnitChange(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <section className="stats">
        <article>
          <small>This week</small>
          <strong className="num">{formatDistance(summary.weekly_distance_km, unit)}</strong>
          <span className="stat-note">since Monday</span>
        </article>
        <article>
          <small>Total distance</small>
          <strong className="num">{formatDistance(summary.total_distance_km, unit)}</strong>
          <span className="stat-note">every activity logged</span>
        </article>
        <article>
          <small>Activities</small>
          <strong className="num">{summary.activities_count}</strong>
          <span className="stat-note">runs and walks</span>
        </article>
        <article>
          <small>Weeks in a row</small>
          <strong className="num">{summary.current_streak_weeks}</strong>
          <span className="stat-note">with at least one activity</span>
        </article>
      </section>
    </>
  );
}
