export type Activity = {
  id: number;
  title: string;
  activity_type: string;
  /** ISO 8601, as serialised by Rails. */
  started_at: string;
  // Rails serialises decimals as strings, so these arrive as strings even
  // though they are numbers conceptually.
  distance_km: string | number;
  duration_minutes: number;
  notes: string | null;
  pace_per_km: string | number | null;
};

export type Record_ = { title: string; started_at: string } | null;

export type Summary = {
  total_distance_km: number;
  weekly_distance_km: number;
  activities_count: number;
  current_streak_weeks: number;
  records: {
    longest_run: (Record_ & { distance_km: number }) | null;
    fastest_pace: (Record_ & { pace_per_km: number }) | null;
  };
  weekly_series: { week_start: string; distance_km: number }[];
  pace_trend: { current_pace: number; previous_pace: number | null; delta_seconds: number | null; weeks: number } | null;
  race_predictions: {
    basis: { title: string; distance_km: number; started_at: string };
    predictions: { label: string; distance_km: number; seconds: number }[];
  } | null;
};

export const EMPTY_SUMMARY: Summary = {
  total_distance_km: 0,
  weekly_distance_km: 0,
  activities_count: 0,
  current_streak_weeks: 0,
  records: { longest_run: null, fastest_pace: null },
  weekly_series: [],
  pace_trend: null,
  race_predictions: null,
};

export type Feed = { activities: Activity[]; summary: Summary };

export type NewActivity = {
  title: string;
  activity_type: string;
  distance_km: string;
  duration_minutes: string;
  /** ISO 8601. Chosen in the form, so past activities can be logged. */
  started_at: string;
  notes: string;
};

/**
 * Why the failure kinds matter: the previous version reported every failure as
 * "Add a title, distance, and duration", so an unreachable API — or the
 * portfolio's Next.js server answering on the same port — looked to the user
 * like their own typo.
 */
export type ApiErrorKind =
  | "offline" // the request never reached a server
  | "wrong-server" // something answered, but it is not this API
  | "validation" // the API rejected the record (422)
  | "http"; // any other non-OK response

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly messages: string[];

  constructor(kind: ApiErrorKind, message: string, status?: number, messages: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.messages = messages;
  }
}

const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim();

// Keep same-origin requests in development, while allowing the static build
// to talk to a separately hosted API. A trailing slash would otherwise create
// double slashes when request paths are appended.
export const API_BASE = (configuredApiBase || "/api/v1").replace(/\/$/, "");

const OFFLINE_MESSAGE =
  "Can't reach the API. Start it with bin/dev (it listens on port 3001), then try again.";

const wrongServerMessage = (status: number) =>
  `Port 3001 answered with a ${status}, but not as the PaceLog API. Another app may have claimed the port — restart with bin/dev.`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch {
    // fetch only rejects when the request never completed: DNS, refused
    // connection, dead proxy target.
    throw new ApiError("offline", OFFLINE_MESSAGE);
  }

  // A dev-proxy 502/504 means the proxy itself could not reach the API, which
  // is the "API is not running" case rather than a wrong server on the port.
  if (response.status === 502 || response.status === 503 || response.status === 504) {
    throw new ApiError("offline", OFFLINE_MESSAGE, response.status);
  }

  // 204 carries no body, so there is nothing to parse and no content-type.
  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    // A 404 HTML page here means some other server is on the API port.
    throw new ApiError("wrong-server", wrongServerMessage(response.status), response.status);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError("wrong-server", wrongServerMessage(response.status), response.status);
  }

  if (response.status === 422) {
    const errors = (body as { errors?: unknown }).errors;
    const messages = Array.isArray(errors) ? errors.map(String) : [];
    throw new ApiError(
      "validation",
      messages[0] ?? "That activity was rejected. Check the fields and try again.",
      422,
      messages,
    );
  }

  if (!response.ok) {
    throw new ApiError("http", `The API returned an error (${response.status}).`, response.status);
  }

  return body as T;
}

export function fetchFeed(): Promise<Feed> {
  return request<Feed>("/activities");
}

export function createActivity(input: NewActivity): Promise<{ activity: Activity }> {
  const notes = input.notes.trim();

  return request<{ activity: Activity }>("/activities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      activity: {
        title: input.title.trim(),
        activity_type: input.activity_type,
        distance_km: input.distance_km,
        duration_minutes: input.duration_minutes,
        started_at: input.started_at,
        notes: notes === "" ? null : notes,
      },
    }),
  });
}

export function deleteActivity(id: number): Promise<void> {
  return request<void>(`/activities/${id}`, { method: "DELETE" });
}
