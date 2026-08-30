/**
 * The API returns machine-readable values — pace as decimal minutes, distance
 * as a Rails decimal string. Every human-facing conversion lives here so the
 * wire format stays stable and the display rules stay testable.
 */

const EM_DASH = "—";

const pad = (value: number) => String(value).padStart(2, "0");
export type DistanceUnit = "km" | "mi";
export const KM_PER_MILE = 1.609344;

export const convertDistance = (km: string | number, unit: DistanceUnit) =>
  unit === "mi" ? Number(km) / KM_PER_MILE : Number(km);

/** 5.96 decimal minutes is 5:58/km. Runners do not read decimal pace. */
export function formatPace(paceMinutes: string | number | null, unit: DistanceUnit = "km"): string {
  if (paceMinutes === null || paceMinutes === "") return EM_DASH;

  const minutes = Number(paceMinutes);
  if (!Number.isFinite(minutes) || minutes <= 0) return EM_DASH;

  // Convert to whole seconds first so 5.999 carries to 6:00 rather than 5:60.
  const totalSeconds = Math.round(minutes * 60 * (unit === "mi" ? KM_PER_MILE : 1));
  return `${Math.floor(totalSeconds / 60)}:${pad(totalSeconds % 60)}/${unit}`;
}

export function formatDuration(minutes: number): string {
  const totalSeconds = Math.round(minutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}:${pad(remainingMinutes)}:${pad(seconds)}`;
  return `${remainingMinutes}:${pad(seconds)}`;
}

export function formatDistance(km: string | number, unit: DistanceUnit = "km"): string {
  return `${convertDistance(km, unit).toFixed(1)} ${unit}`;
}

/** "TUE 25 AUG 2026" — a logbook date, not a sentence. */
export function formatEntryDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
    .replace(/,/g, "")
    .toUpperCase();
}

export function formatToday(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
