import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ApiError, createActivity, fetchFeed, giveKudos } from "./api";
import { formatDistance, formatDuration, formatEntryDate, formatPace } from "./lib/format";
import type { Activity, NewActivity, Summary } from "./api";
import "./App.css";

const EMPTY_SUMMARY: Summary = {
  total_distance_km: 0,
  weekly_distance_km: 0,
  activities_count: 0,
};

/** A date input works in YYYY-MM-DD; this is today's value in that form. */
const todayValue = () => new Date().toISOString().slice(0, 10);

/** Mirrors the model validations so an obvious typo never needs a round trip. */
function validate(form: NewActivity): string | null {
  if (!form.title.trim()) return "Give the run a name.";

  const distance = Number(form.distance_km);
  if (!form.distance_km.trim() || Number.isNaN(distance) || distance <= 0) {
    return "Distance must be greater than 0 km.";
  }

  const minutes = Number(form.duration_minutes);
  if (!form.duration_minutes.trim() || !Number.isInteger(minutes) || minutes <= 0) {
    return "Duration must be a whole number of minutes above 0.";
  }

  if (!form.started_at) return "Pick a date for this activity.";
  if (new Date(form.started_at) > new Date()) return "You can't log a run in the future.";

  return null;
}

const describe = (error: unknown) =>
  error instanceof ApiError ? error.message : "Something went wrong. Try again.";

export default function App() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [title, setTitle] = useState("");
  const [distance, setDistance] = useState("");
  const [minutes, setMinutes] = useState("");
  const [activityType, setActivityType] = useState("run");
  const [date, setDate] = useState(todayValue);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [feedError, setFeedError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingKudos, setPendingKudos] = useState<number[]>([]);

  // Saves and reloads overlap, so an older response must never overwrite the
  // state a newer one already wrote.
  const latestLoad = useRef(0);

  const load = useCallback(async () => {
    const token = ++latestLoad.current;
    try {
      const feed = await fetchFeed();
      if (token !== latestLoad.current) return;
      setActivities(feed.activities);
      setSummary(feed.summary);
      setFeedError("");
    } catch (loadFailure) {
      if (token !== latestLoad.current) return;
      // Previously this failed silently and the feed just looked empty, which
      // made saved runs seem to disappear.
      setFeedError(describe(loadFailure));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return; // guards double submits, which used to create duplicates

    const form: NewActivity = {
      title,
      activity_type: activityType,
      distance_km: distance,
      duration_minutes: minutes,
      // A date input yields YYYY-MM-DD; anchor it to midday local time so the
      // entry cannot slip into an adjacent day when converted to UTC.
      started_at: date ? new Date(`${date}T12:00:00`).toISOString() : "",
      notes,
    };
    const invalid = validate(form);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError("");
    setSaving(true);
    try {
      await createActivity(form);
      setTitle("");
      setDistance("");
      setMinutes("");
      setNotes("");
      setActivityType("run");
      setDate(todayValue());
      await load();
    } catch (saveFailure) {
      setError(describe(saveFailure));
    } finally {
      setSaving(false);
    }
  }

  async function kudos(id: number) {
    if (pendingKudos.includes(id)) return;
    setPendingKudos((ids) => [...ids, id]);
    try {
      const { activity } = await giveKudos(id);
      setActivities((current) =>
        current.map((item) => (item.id === id ? { ...item, kudos_count: activity.kudos_count } : item)),
      );
      setFeedError("");
    } catch (kudosFailure) {
      setFeedError(describe(kudosFailure));
    } finally {
      setPendingKudos((ids) => ids.filter((pending) => pending !== id));
    }
  }

  return (
    <main>
      <header>
        <p>PACELOG</p>
        <h1>Every run tells a story.</h1>
        <span>Track your movement, build your streak, and celebrate the miles.</span>
      </header>

      <section className="stats">
        <article>
          <small>This week</small>
          <strong>{summary.weekly_distance_km} km</strong>
        </article>
        <article>
          <small>All distance</small>
          <strong>{summary.total_distance_km} km</strong>
        </article>
        <article>
          <small>Activities</small>
          <strong>{summary.activities_count}</strong>
        </article>
      </section>

      <section className="grid">
        {/* noValidate: `max` on the date input would otherwise let the browser block
            submission with its own tooltip, so our validation messages never showed.
            Keep `max` for the picker's affordance; own the messaging ourselves. */}
        <form onSubmit={submit} noValidate>
          <h2>Log a run</h2>
          <label>
            Run name
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Morning run" />
          </label>
          <label>
            Type
            <select value={activityType} onChange={(e) => setActivityType(e.target.value)}>
              <option value="run">Run</option>
              <option value="ride">Ride</option>
              <option value="walk">Walk</option>
            </select>
          </label>
          <label>
            Date
            <input type="date" value={date} max={todayValue()} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Distance (km)
            <input
              type="number"
              step="0.1"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="5.0"
            />
          </label>
          <label>
            Duration (minutes)
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="30"
            />
          </label>
          <label>
            Notes
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it feel?" />
          </label>
          {error && <p className="error">{error}</p>}
          <button disabled={saving}>{saving ? "Saving…" : "Save activity"}</button>
        </form>

        <section className="feed">
          <div className="feed-title">
            <h2>Recent activity</h2>
            <small>{activities.length} logged</small>
          </div>
          {feedError && <p className="error">{feedError}</p>}
          {activities.length === 0 && !feedError ? (
            <p className="empty">Your next run starts here.</p>
          ) : (
            activities.map((activity) => (
              <article className="activity" key={activity.id}>
                <div>
                  <small className="entry-date">{formatEntryDate(activity.started_at)}</small>
                  <small>{activity.activity_type}</small>
                  <h3>{activity.title}</h3>
                  {activity.notes && <p className="entry-notes">{activity.notes}</p>}
                  <p className="entry-figures">
                    <span>{formatDistance(activity.distance_km)}</span>
                    <span>{formatDuration(activity.duration_minutes)}</span>
                    <span>{formatPace(activity.pace_per_km)}</span>
                  </p>
                </div>
                <button
                  className="kudos"
                  onClick={() => kudos(activity.id)}
                  disabled={pendingKudos.includes(activity.id)}
                  aria-label={`Give kudos to ${activity.title}, ${activity.kudos_count} so far`}
                >
                  ♥ {activity.kudos_count}
                </button>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}
