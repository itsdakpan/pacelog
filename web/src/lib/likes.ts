/**
 * Which activities this browser has given kudos to. There is no sign-in, so
 * "one kudos per person" is enforced per browser: the server holds the count,
 * this holds whether *you* are one of them.
 *
 * Every access is guarded — private windows and blocked site data make
 * localStorage throw rather than return null.
 */
const KEY = "pacelog.kudos";

export function readLikes(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === "number") : [];
  } catch {
    return [];
  }
}

export function writeLikes(ids: number[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Storage unavailable: the toggle still works for this session, it just
    // will not be remembered next visit.
  }
}
