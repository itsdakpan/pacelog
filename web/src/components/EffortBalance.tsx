import type { Summary } from "../api";

/**
 * The 80/20 principle: roughly four fifths of running should be easy. Most
 * people run their easy days too hard, and this is the number that shows it.
 */
export function EffortBalance({ split }: { split: Summary["effort_split"] }) {
  if (!split) return null;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Easy vs hard</h2>
        <small>{split.rated} rated activities</small>
      </div>

      <p className="effort-figure num">
        {split.easy_percent}%<span> easy</span>
      </p>

      <div
        className="effort-bar"
        role="img"
        aria-label={`${split.easy_percent} percent of rated activities were easy, against a target of ${split.target_percent} percent`}
      >
        <div className="effort-bar-fill" style={{ width: `${split.easy_percent}%` }} />
        <div className="effort-bar-target" style={{ left: `${split.target_percent}%` }} />
      </div>

      <p className="stat-note">
        {split.easy} easy, {split.hard} hard. Aim for {split.target_percent}% easy — the marker shows
        the target. Effort 1–4 counts as easy.
      </p>
    </section>
  );
}
