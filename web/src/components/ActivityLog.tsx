import { useState } from "react";
import type { Activity } from "../api";
import { formatDistance, formatDuration, formatEntryDate, formatPace } from "../lib/format";


const TrashIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

type Props = {
  activities: Activity[];
  loading: boolean;
  error: string;
  deleting: number[];
  onDelete: (id: number) => void;
};

export function ActivityLog({
  activities,
  loading,
  error,
  deleting,
  onDelete,
}: Props) {
  // Deleting is irreversible, so it takes two deliberate clicks rather than a
  // browser confirm dialog.
  const [confirming, setConfirming] = useState<number | null>(null);

  return (
    <section className="feed">
      <div className="feed-title">
        <h2>Recent activity</h2>
        <small>{activities.length} logged</small>
      </div>

      {error && (
        <p className="error" role="status">
          {error}
        </p>
      )}

      {loading && !error && <Skeleton />}

      {!loading && !error && activities.length === 0 && <p className="empty">Your next run starts here.</p>}

      {activities.map((activity) => (
        <article className="activity" key={activity.id}>
          <div>
            <span className="entry-date num">{formatEntryDate(activity.started_at)}</span>
            <small>{activity.activity_type}</small>
            <h3>{activity.title}</h3>
            <p className="entry-figures num">
              <span>{formatDistance(activity.distance_km)}</span>
              <span>{formatDuration(activity.duration_minutes)}</span>
              <span>{formatPace(activity.pace_per_km)}</span>
            </p>
            {activity.notes && <p className="entry-notes">{activity.notes}</p>}
          </div>

          <div className="entry-actions">
            {confirming === activity.id ? (
              <span className="confirm">
                <button
                  className="link danger"
                  onClick={() => {
                    setConfirming(null);
                    onDelete(activity.id);
                  }}
                  disabled={deleting.includes(activity.id)}
                >
                  {deleting.includes(activity.id) ? "Deleting…" : "Delete"}
                </button>
                <button className="link" onClick={() => setConfirming(null)}>
                  Cancel
                </button>
              </span>
            ) : (
              <button
                className="icon-button"
                onClick={() => setConfirming(activity.id)}
                aria-label={`Delete ${activity.title}`}
                title="Delete"
              >
                <TrashIcon />
              </button>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}

/** Shaped like the rows it replaces, so the feed does not jump when data lands. */
function Skeleton() {
  return (
    <div aria-hidden="true">
      {[0, 1, 2, 3].map((row) => (
        <div className="skeleton-row" key={row}>
          <span className="shim" style={{ width: "22%" }} />
          <span className="shim" style={{ width: "52%" }} />
          <span className="shim" style={{ width: "38%" }} />
        </div>
      ))}
    </div>
  );
}
