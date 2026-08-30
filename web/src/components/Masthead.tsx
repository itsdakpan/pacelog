import type { Summary } from "../api";

export function Masthead({ summary }: { summary: Summary }) {
  return (
    <>
      <header>
        <p>PACELOG</p>
        <h1>Every run tells a story.</h1>
        <span>Track your movement, build your streak, and celebrate the miles.</span>
      </header>

      <section className="stats">
        <article>
          <small>This week</small>
          <strong className="num">{summary.weekly_distance_km} km</strong>
        </article>
        <article>
          <small>All distance</small>
          <strong className="num">{summary.total_distance_km} km</strong>
        </article>
        <article>
          <small>Activities</small>
          <strong className="num">{summary.activities_count}</strong>
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
