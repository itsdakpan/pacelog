import type { Activity } from "../api";
import { formatDistance, formatDuration, formatEntryDate, formatPace } from "../lib/format";

type Props = {
  activities: Activity[];
  loading: boolean;
  error: string;
  pendingKudos: number[];
  onKudos: (id: number) => void;
};

export function ActivityLog({ activities, loading, error, pendingKudos, onKudos }: Props) {
  return (
    <section className="log" aria-label="Activity log">
      <div className="log-head">
        <span>Date</span>
        <span>Session</span>
        <span className="r">Dist</span>
        <span className="r">Time</span>
        <span className="r">Pace</span>
        <span className="r">♥</span>
      </div>

      {error && (
        <p className="callout" role="status">
          {error}
        </p>
      )}

      {loading && !error && <Skeleton />}

      {!loading && !error && activities.length === 0 && (
        <p className="empty">Nothing logged yet. Your first entry goes in the form on the left.</p>
      )}

      {activities.map((activity) => (
        <article className="entry" key={activity.id}>
          <span className="num entry-date">{formatEntryDate(activity.started_at)}</span>
          <span className="entry-session">
            <span className="entry-sport">{activity.activity_type}</span>
            <span className="entry-title">{activity.title}</span>
            {activity.notes && <span className="entry-notes">{activity.notes}</span>}
          </span>
          <span className="num entry-figure">{formatDistance(activity.distance_km)}</span>
          <span className="num entry-figure">{formatDuration(activity.duration_minutes)}</span>
          <span className="num entry-pace">{formatPace(activity.pace_per_km)}</span>
          <button
            className="kudos"
            onClick={() => onKudos(activity.id)}
            disabled={pendingKudos.includes(activity.id)}
            aria-label={`Give kudos to ${activity.title}, ${activity.kudos_count} so far`}
          >
            {activity.kudos_count}
          </button>
        </article>
      ))}
    </section>
  );
}

/** Shaped like the rows it replaces, so the page does not jump when data lands. */
function Skeleton() {
  return (
    <div aria-hidden="true">
      {[0, 1, 2, 3, 4].map((row) => (
        <div className="entry entry--skeleton" key={row}>
          <span className="shim" style={{ width: "72%" }} />
          <span className="shim" style={{ width: "46%" }} />
          <span className="shim" style={{ width: "80%" }} />
          <span className="shim" style={{ width: "80%" }} />
          <span className="shim" style={{ width: "90%" }} />
          <span className="shim" style={{ width: "60%" }} />
        </div>
      ))}
    </div>
  );
}
