import type { NewActivity } from "../api";

/** Mirrors the model validations so an obvious typo never needs a round trip. */
export function validate(form: NewActivity): string | null {
  if (!form.title.trim()) return "Give the session a name.";

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
