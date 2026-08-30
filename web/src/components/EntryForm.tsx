import { useState } from "react";
import type { FormEvent } from "react";
import type { NewActivity } from "../api";
import { validate } from "../lib/validate";

const todayValue = () => new Date().toISOString().slice(0, 10);

type Props = { saving: boolean; onSave: (form: NewActivity) => Promise<string | null> };

export function EntryForm({ saving, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [activityType, setActivityType] = useState("run");
  const [date, setDate] = useState(todayValue);
  const [distance, setDistance] = useState("");
  const [minutes, setMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;

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
    const failure = await onSave(form);
    if (failure) {
      setError(failure);
      return;
    }

    setTitle("");
    setDistance("");
    setMinutes("");
    setNotes("");
    setActivityType("run");
    setDate(todayValue());
  }

  return (
    // noValidate: `max` on the date input would otherwise let the browser block
    // submission with its own tooltip, so our messages never showed. Keep `max`
    // for the picker's affordance; own the messaging ourselves.
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
        <input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="30" />
      </label>
      <label>
        Notes
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it feel?" />
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <button disabled={saving}>{saving ? "Saving…" : "Save activity"}</button>
    </form>
  );
}
