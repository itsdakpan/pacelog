import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ApiError, createActivity, fetchFeed, giveKudos } from "./api";
import type { Activity, NewActivity, Summary } from "./api";
import "./App.css";

const EMPTY_SUMMARY: Summary = {
  total_distance_km: 0,
  weekly_distance_km: 0,
  activities_count: 0,
};

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

    const form: NewActivity = { title, distance_km: distance, duration_minutes: minutes };
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
        <form onSubmit={submit}>
          <h2>Log a run</h2>
          <label>
            Run name
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Morning run" />
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
                  <small>{activity.activity_type}</small>
                  <h3>{activity.title}</h3>
                  <p>
                    {Number(activity.distance_km).toFixed(1)} km · {activity.duration_minutes} min ·{" "}
                    {activity.pace_per_km === null ? "—" : Number(activity.pace_per_km).toFixed(2)} min/km
                  </p>
                </div>
                <button
                  className="kudos"
                  onClick={() => kudos(activity.id)}
                  disabled={pendingKudos.includes(activity.id)}
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
