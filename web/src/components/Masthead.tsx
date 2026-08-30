import type { Summary } from "../api";

/** The pace band: a runner's wrist strip of figures, and the page's signature. */
export function Masthead({ summary }: { summary: Summary }) {
  const fastest = summary.records.fastest_pace;
  const bestPace = fastest ? paceLabel(fastest.pace_per_km) : "—";

  return (
    <header className="masthead">
      <div>
        <p className="eyebrow">PaceLog — training log</p>
        <h1>
          Twelve weeks,
          <br />
          {summary.activities_count} sessions.
        </h1>
      </div>

      <dl className="band" aria-label="Training summary">
        <Cell label="This wk" value={`${summary.weekly_distance_km}`} />
        <Cell label="Total km" value={`${summary.total_distance_km}`} />
        <Cell label="Best pace" value={bestPace} accent />
        <Cell label="Streak" value={`${summary.current_streak_weeks}`} />
      </dl>
    </header>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={accent ? "band-cell band-cell--accent" : "band-cell"}>
      <dd className="num">{value}</dd>
      <dt>{label}</dt>
    </div>
  );
}

function paceLabel(paceMinutes: number) {
  const total = Math.round(paceMinutes * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
