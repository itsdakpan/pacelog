# PaceLog Phase 1 — Complete the Log Data — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn PaceLog's dead-but-plumbed fields (`started_at`, `notes`, `activity_type`) into working features, format pace and duration the way runners actually read them, and replace the three-row seed with a believable 12-week training history.

**Architecture:** Rails keeps returning raw machine-readable values (`pace_per_km` as a decimal, `started_at` as ISO 8601); all human formatting happens client-side in a new pure-function module `web/src/lib/format.ts`. The form gains type/date/notes inputs and extends the existing `validate()`. Every network call continues to route through the single `request()` helper in `web/src/api.ts` so the established `ApiError` classification keeps working.

**Tech Stack:** Rails 7.2 API (Ruby 3.3.5, Postgres, Minitest), React 19 + TypeScript + Vite 8, Vitest 3 + Testing Library, oxlint, rubocop.

**Spec:** `/Users/dylanakpan/.claude/plans/can-you-give-me-iridescent-snowflake.md`

## Global Constraints

- **The API port is 3001, never 3000.** Port 3000 belongs to the `Dylan_about` portfolio's `next dev`. Start both servers with `bin/dev` from the repo root.
- **All client HTTP goes through `request()` in `web/src/api.ts`.** Do not add a second `fetch` path; it would bypass the `offline` / `wrong-server` / `validation` / `http` error classification.
- **Rails returns raw values; the client formats.** Do not move pace or duration formatting into the serializer.
- **Baselines that must not regress:** 16 Rails runs / 60 assertions, 21 frontend tests, `rubocop` clean, `tsc -b` exit 0, `npm run build` exit 0.
- **Node is 20.17.0**, below Vite 8's requested 20.19+. Builds work but print a warning — expected, not a failure. `jsdom` is pinned to `26.1.0` for this reason; do not upgrade it.
- If `vitest` or `oxlint` fails with "Cannot find module", reinstall the platform binary: `@rolldown/binding-darwin-x64` or `@oxlint/binding-darwin-x64`.
- **Activity types are exactly** `run`, `ride`, `walk` (`Activity::ACTIVITY_TYPES` in `api/app/models/activity.rb`).

---

### Task 1: Put the project under version control, without leaking secrets

The repo has no `.git` at all, and `api/.gitignore` is missing — Rails normally ships one that excludes `config/master.key`. That key file exists. A naive `git add .` would commit the Rails credentials key, 146 MB of `node_modules`, and 15 MB of `api/tmp`. Every later task commits, so this comes first.

**Files:**
- Create: `.gitignore`
- Create: `api/.gitignore`
- Existing (leave alone): `web/.gitignore`

**Interfaces:**
- Consumes: nothing
- Produces: a git repository with a clean initial commit; every later task ends in `git commit`

- [ ] **Step 1: Write the root `.gitignore`**

```
.DS_Store
*.log

# Editor directories
.vscode/*
!.vscode/extensions.json
.idea
```

- [ ] **Step 2: Write `api/.gitignore`** (Rails 7.2 defaults — the `master.key` line is the important one)

```
# Ignore bundler config.
/.bundle

# Ignore all environment files.
/.env*
!/.env.example

# Ignore all logfiles and tempfiles.
/log/*
/tmp/*
!/log/.keep
!/tmp/.keep

# Ignore pidfiles, but keep the directory.
/tmp/pids/*
!/tmp/pids/.keep

# Ignore uploaded files in development and any SQLite databases.
/storage/*
!/storage/.keep
/tmp/storage/*
!/tmp/storage/.keep

# Ignore master key for decrypting credentials and more.
/config/master.key
```

- [ ] **Step 3: Initialise the repository and stage everything**

```bash
cd /Users/dylanakpan/code/pacelog
git init
git add -A
```

- [ ] **Step 4: Verify no secret and no bulk directory is staged**

```bash
git diff --cached --name-only | grep -E 'master\.key|node_modules|api/tmp/|api/log/|web/dist/' && echo "LEAK — fix .gitignore" || echo "clean"
git diff --cached --name-only | wc -l
```

Expected: prints `clean`, and a file count in the low hundreds — **not** thousands. If anything matched, fix the ignore files, run `git rm -r --cached .`, re-add, and re-check before continuing.

- [ ] **Step 5: Commit**

```bash
git commit -m "chore: initialise repository with Rails and Node ignore rules"
```

---

### Task 2: Formatting utilities

Pure functions, no React. This is where the domain fix lives: `pace_per_km` is decimal minutes, so the UI currently renders `5.96 min/km`. No runner reads pace that way — it is `5:58/km`.

**Files:**
- Create: `web/src/lib/format.ts`
- Test: `web/src/lib/format.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `formatPace(paceMinutes: string | number | null): string`
  - `formatDuration(minutes: number): string`
  - `formatDistance(km: string | number): string`
  - `formatEntryDate(iso: string): string`

- [ ] **Step 1: Write the failing test**

Create `web/src/lib/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatDistance, formatDuration, formatEntryDate, formatPace } from "./format";

describe("formatPace", () => {
  it("renders decimal minutes as mm:ss per km", () => {
    expect(formatPace(5.96)).toBe("5:58/km");
    expect(formatPace(6)).toBe("6:00/km");
    expect(formatPace(5.5)).toBe("5:30/km");
  });

  it("accepts the string Rails sends for decimals", () => {
    expect(formatPace("5.57")).toBe("5:34/km");
  });

  it("carries seconds into minutes rather than printing :60", () => {
    // 5.999 * 60 = 359.94s, which rounds to 360 — must read 6:00, never 5:60.
    expect(formatPace(5.999)).toBe("6:00/km");
  });

  it("pads single-digit seconds", () => {
    expect(formatPace(5.05)).toBe("5:03/km");
  });

  it("returns an em dash when pace is unknown", () => {
    expect(formatPace(null)).toBe("—");
  });
});

describe("formatDuration", () => {
  it("renders minutes as mm:ss", () => {
    expect(formatDuration(31)).toBe("31:00");
    expect(formatDuration(9)).toBe("9:00");
  });

  it("renders an hour or more as h:mm:ss", () => {
    expect(formatDuration(65)).toBe("1:05:00");
    expect(formatDuration(120)).toBe("2:00:00");
  });
});

describe("formatDistance", () => {
  it("renders one decimal place with a unit", () => {
    expect(formatDistance("5.0")).toBe("5.0 km");
    expect(formatDistance(12.34)).toBe("12.3 km");
  });
});

describe("formatEntryDate", () => {
  it("renders an uppercase logbook date", () => {
    expect(formatEntryDate("2026-08-25T06:30:00.000Z")).toBe("TUE 25 AUG");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npx vitest run src/lib/format.test.ts`
Expected: FAIL — `Failed to resolve import "./format"`.

- [ ] **Step 3: Write the implementation**

Create `web/src/lib/format.ts`:

```ts
/**
 * The API returns machine-readable values — pace as decimal minutes, distance
 * as a Rails decimal string. Every human-facing conversion lives here so the
 * wire format stays stable and the display rules stay testable.
 */

const EM_DASH = "—";

const pad = (value: number) => String(value).padStart(2, "0");

/** 5.96 decimal minutes is 5:58/km. Runners do not read decimal pace. */
export function formatPace(paceMinutes: string | number | null): string {
  if (paceMinutes === null || paceMinutes === "") return EM_DASH;

  const minutes = Number(paceMinutes);
  if (!Number.isFinite(minutes) || minutes <= 0) return EM_DASH;

  // Convert to whole seconds first so 5.999 carries to 6:00 rather than 5:60.
  const totalSeconds = Math.round(minutes * 60);
  return `${Math.floor(totalSeconds / 60)}:${pad(totalSeconds % 60)}/km`;
}

export function formatDuration(minutes: number): string {
  const totalSeconds = Math.round(minutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}:${pad(remainingMinutes)}:${pad(seconds)}`;
  return `${remainingMinutes}:${pad(seconds)}`;
}

export function formatDistance(km: string | number): string {
  return `${Number(km).toFixed(1)} km`;
}

/** "TUE 25 AUG" — a logbook date, not a sentence. */
export function formatEntryDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })
    .replace(/,/g, "")
    .toUpperCase();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npx vitest run src/lib/format.test.ts`
Expected: PASS, 11 tests.

> If `formatEntryDate` fails on ordering, print the actual value and adjust the expectation to match the `en-GB` output for that date — the assertion should describe real behaviour, not a guess.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/format.ts web/src/lib/format.test.ts
git commit -m "feat(web): add pace, duration, distance and date formatters"
```

---

### Task 3: Pin `started_at` in the API contract

**Correction made during execution:** this task originally claimed `started_at`
was absent from `serialize`. It is not — it is already in the `only:` list at
`api/app/controllers/api/v1/activities_controller.rb:30`, and the design doc had
this right. No production change is needed. The test below is kept as a contract
guard, because Tasks 4 and 6 depend on the field being present in the payload.

**Files:**
- Modify: `api/app/controllers/api/v1/activities_controller.rb` (the `serialize` private method)
- Test: `api/test/controllers/api/v1/activities_controller_test.rb`

**Interfaces:**
- Consumes: nothing
- Produces: every serialized activity gains `started_at` as an ISO 8601 string

- [ ] **Step 1: Write the failing test**

Add to `api/test/controllers/api/v1/activities_controller_test.rb`:

```ruby
  test "index serialises started_at so the client can show a date" do
    get api_v1_activities_url

    morning = JSON.parse(response.body)["activities"].find { |a| a["title"] == "Morning run" }
    assert morning.key?("started_at"), "started_at must be serialised"
    assert_equal activities(:morning_run).started_at.iso8601(3), Time.parse(morning["started_at"]).utc.iso8601(3)
  end
```

- [ ] **Step 2: Run the test**

Run: `cd api && rbenv exec bundle exec rails test test/controllers/api/v1/activities_controller_test.rb`
Expected: PASS immediately — the field is already serialised. This is a
characterisation test, not a red-green cycle.

- [ ] **Step 3: Confirm no production change is required**

Verify `started_at` appears in the `only:` list in `serialize`. Make no edit.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd api && rbenv exec bundle exec rails test && rbenv exec bundle exec rubocop`
Expected: 17 runs, 0 failures; rubocop clean.

- [ ] **Step 5: Commit**

```bash
git add api/app/controllers/api/v1/activities_controller.rb api/test/controllers/api/v1/activities_controller_test.rb
git commit -m "feat(api): serialise started_at on activities"
```

---

### Task 4: Client accepts activity type, notes and a chosen date

`createActivity` currently hardcodes `activity_type: "run"` and `started_at: new Date()`, so the app can display rides and walks but never create one, and cannot log yesterday's run.

**Files:**
- Modify: `web/src/api.ts` (the `Activity` type, the `NewActivity` type, `createActivity`)
- Test: `web/src/api.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `Activity` gains `started_at: string`
  - `NewActivity` becomes `{ title, activity_type, distance_km, duration_minutes, started_at, notes }` — all `string`
  - `createActivity(input: NewActivity)` sends those values through unchanged apart from trimming

- [ ] **Step 1: Write the failing test**

Add to `web/src/api.test.ts`, inside the existing `describe("createActivity", ...)` block:

```ts
  it("sends the chosen type, date and notes rather than hardcoding a run", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(jsonResponse({ activity: { id: 1 } }, 201));

    await createActivity({
      title: "  Canal loop  ",
      activity_type: "ride",
      distance_km: "24.0",
      duration_minutes: "62",
      started_at: "2026-08-24T07:15:00.000Z",
      notes: "  Windy  ",
    });

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body).activity;
    expect(sent.title).toBe("Canal loop");
    expect(sent.activity_type).toBe("ride");
    expect(sent.started_at).toBe("2026-08-24T07:15:00.000Z");
    expect(sent.notes).toBe("Windy");
  });

  it("sends null rather than an empty string when notes are blank", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(jsonResponse({ activity: { id: 1 } }, 201));

    await createActivity({
      title: "Morning run",
      activity_type: "run",
      distance_km: "5",
      duration_minutes: "30",
      started_at: "2026-08-24T07:15:00.000Z",
      notes: "   ",
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).activity.notes).toBeNull();
  });
```

The existing `createActivity` test in this file passes an object without the new keys and will stop compiling. Update it to include `activity_type: "run"`, `started_at: new Date().toISOString()` and `notes: ""`, keeping its original assertions.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npx vitest run src/api.test.ts`
Expected: FAIL — `expected 'run' to be 'ride'`.

- [ ] **Step 3: Update the types and `createActivity`**

In `web/src/api.ts`, add `started_at` to `Activity` (place it after `activity_type`):

```ts
  started_at: string;
```

Replace the `NewActivity` type:

```ts
export type NewActivity = {
  title: string;
  activity_type: string;
  distance_km: string;
  duration_minutes: string;
  /** ISO 8601. Chosen in the form, so past runs can be logged. */
  started_at: string;
  notes: string;
};
```

Replace the body of `createActivity`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/api.test.ts && npx tsc -b`
Expected: api tests PASS. `tsc` will still fail in `App.tsx`, which Task 5 fixes — that is expected at this point.

- [ ] **Step 5: Commit**

```bash
git add web/src/api.ts web/src/api.test.ts
git commit -m "feat(web): send activity type, date and notes when creating"
```

---

### Task 5: Form gains type, date and notes inputs

**Files:**
- Modify: `web/src/App.tsx` (`validate`, the `submit` handler, form state, the form markup)
- Test: `web/src/App.test.tsx`

**Interfaces:**
- Consumes: `NewActivity`, `createActivity` (Task 4)
- Produces: the form emits a complete `NewActivity`; `validate` additionally rejects a missing or future date

- [ ] **Step 1: Write the failing test**

Add a new `describe` block to `web/src/App.test.tsx`. Note the existing `fillForm` helper only fills three fields; leave it alone and fill explicitly here.

```ts
describe("logging a past ride", () => {
  it("submits the chosen type, date and notes", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(json(feed([])))
      .mockResolvedValueOnce(json({ activity: sampleRun }, 201))
      .mockResolvedValueOnce(json(feed([sampleRun])));

    render(<App />);
    await screen.findByText(/your next run starts here/i);

    await user.type(screen.getByLabelText(/name/i), "Canal loop");
    await user.selectOptions(screen.getByLabelText(/type/i), "ride");
    await user.clear(screen.getByLabelText(/date/i));
    await user.type(screen.getByLabelText(/date/i), "2026-08-24");
    await user.type(screen.getByLabelText(/distance/i), "24");
    await user.type(screen.getByLabelText(/duration/i), "62");
    await user.type(screen.getByLabelText(/notes/i), "Windy");
    await user.click(screen.getByRole("button", { name: /save activity/i }));

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
    const sent = JSON.parse(fetchMock.mock.calls[1][1].body).activity;
    expect(sent.activity_type).toBe("ride");
    expect(sent.notes).toBe("Windy");
    expect(new Date(sent.started_at).getFullYear()).toBe(2026);
  });

  it("defaults the date to today so the common case needs no input", async () => {
    fetchMock.mockResolvedValue(json(feed([])));
    render(<App />);

    const today = new Date().toISOString().slice(0, 10);
    expect(await screen.findByLabelText(/date/i)).toHaveValue(today);
  });

  it("rejects a future date before making a request", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(json(feed([])));

    render(<App />);
    await screen.findByText(/your next run starts here/i);

    await user.type(screen.getByLabelText(/name/i), "Tomorrow run");
    await user.clear(screen.getByLabelText(/date/i));
    await user.type(screen.getByLabelText(/date/i), "2099-01-01");
    await user.type(screen.getByLabelText(/distance/i), "5");
    await user.type(screen.getByLabelText(/duration/i), "30");
    await user.click(screen.getByRole("button", { name: /save activity/i }));

    expect(await screen.findByText(/can't log a run in the future/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === "POST")).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npx vitest run src/App.test.tsx`
Expected: FAIL — unable to find a label matching `/type/i`.

- [ ] **Step 3: Implement the form changes**

In `web/src/App.tsx`:

Add a helper above `validate`:

```ts
const todayValue = () => new Date().toISOString().slice(0, 10);
```

Extend `validate` — keep the three existing checks unchanged and add, before `return null`:

```ts
  if (!form.started_at) return "Pick a date for this activity.";
  if (new Date(form.started_at) > new Date()) return "You can't log a run in the future.";
```

Add state alongside the existing fields:

```ts
  const [activityType, setActivityType] = useState("run");
  const [date, setDate] = useState(todayValue);
  const [notes, setNotes] = useState("");
```

In `submit`, replace the `form` construction and the post-save reset:

```ts
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
```

and, after a successful `createActivity`:

```ts
      setTitle("");
      setDistance("");
      setMinutes("");
      setNotes("");
      setActivityType("run");
      setDate(todayValue());
```

Add the three inputs to the form markup, after the existing "Run name" label:

```tsx
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
```

and, after the "Duration (minutes)" label:

```tsx
          <label>
            Notes
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it feel?" />
          </label>
```

Add `select` to the `button, input` font rule in `web/src/index.css` so the dropdown inherits the page font:

```css
button,input,select{font:inherit}
```

- [ ] **Step 4: Run the full frontend suite**

Run: `cd web && npx vitest run && npx tsc -b && npm run lint`
Expected: all tests PASS, `tsc` exit 0, lint exit 0.

> The existing "Run name" label still matches `/name/i`. If any older test now matches two labels, tighten that test's query to `/run name/i`.

- [ ] **Step 5: Commit**

```bash
git add web/src/App.tsx web/src/App.test.tsx web/src/index.css
git commit -m "feat(web): log activity type, date and notes from the form"
```

---

### Task 6: Log entries show the date, notes and runner-readable numbers

**Files:**
- Modify: `web/src/App.tsx` (the activity render block)
- Test: `web/src/App.test.tsx`

**Interfaces:**
- Consumes: `formatDistance`, `formatDuration`, `formatEntryDate`, `formatPace` (Task 2); `Activity.started_at` (Tasks 3–4)
- Produces: the rendered log line

- [ ] **Step 1: Write the failing test**

In `web/src/App.test.tsx`, add `started_at` and `notes` to the shared `sampleRun` fixture:

```ts
  started_at: "2026-08-25T06:30:00.000Z",
```

and set `notes: "Easy effort"` in place of `notes: null`.

Then add:

```ts
describe("the log line", () => {
  it("shows the date, notes and runner-readable numbers", async () => {
    fetchMock.mockResolvedValue(json(feed([sampleRun])));

    render(<App />);

    expect(await screen.findByText("TUE 25 AUG")).toBeInTheDocument();
    expect(screen.getByText("Easy effort")).toBeInTheDocument();
    expect(screen.getByText("5.0 km")).toBeInTheDocument();
    expect(screen.getByText("30:00")).toBeInTheDocument();
    // 6.0 decimal minutes reads as 6:00/km, never "6.00 min/km".
    expect(screen.getByText("6:00/km")).toBeInTheDocument();
    expect(screen.queryByText(/min\/km/)).not.toBeInTheDocument();
  });

  it("omits the notes line when an activity has none", async () => {
    fetchMock.mockResolvedValue(json(feed([{ ...sampleRun, notes: null }])));

    render(<App />);
    await screen.findByText("Morning run");

    expect(screen.queryByText("Easy effort")).not.toBeInTheDocument();
  });
});
```

The existing test asserting `"5.0 km · 30 min · 6.00 min/km"` is now wrong by design. Replace that single assertion with `expect(screen.getByText("5.0 km")).toBeInTheDocument();`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npx vitest run src/App.test.tsx`
Expected: FAIL — unable to find text `TUE 25 AUG`.

- [ ] **Step 3: Implement the render change**

Add the import to `web/src/App.tsx`:

```ts
import { formatDistance, formatDuration, formatEntryDate, formatPace } from "./lib/format";
```

Replace the activity render block:

```tsx
            activities.map((activity) => (
              <article className="activity" key={activity.id}>
                <div>
                  <small className="entry-date">{formatEntryDate(activity.started_at)}</small>
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
                  aria-label={`Give kudos to ${activity.title}`}
                >
                  ♥ {activity.kudos_count}
                </button>
              </article>
            ))
```

Add to `web/src/App.css` (Phase 2 replaces this wholesale; this is enough to keep it legible now):

```css
.entry-date{display:block;color:#a1a69c;font-size:.7rem;letter-spacing:.12em}
.entry-notes{font-style:italic}
.entry-figures{display:flex;gap:16px;font-variant-numeric:tabular-nums}
```

> The kudos test that queries `getByRole("button", { name: /3/ })` still matches, because the accessible name now includes both the label and the count.

- [ ] **Step 4: Run the full frontend suite**

Run: `cd web && npx vitest run && npx tsc -b && npm run lint && npm run build`
Expected: all PASS, all exit 0.

- [ ] **Step 5: Commit**

```bash
git add web/src/App.tsx web/src/App.test.tsx web/src/App.css
git commit -m "feat(web): show entry date, notes and mm:ss pace in the log"
```

---

### Task 7: Believable 12-week seed history

Three rows cannot support the chart, streak or records that Phase 3 builds, and a demo that opens nearly empty undercuts the whole portfolio purpose. The generator is deterministic (`Random.new`) so the nightly reset in Phase 4 reproduces the same history, while dates stay relative to `Time.current` so the log always looks current.

**Files:**
- Modify: `api/db/seeds.rb`

**Interfaces:**
- Consumes: `Activity` and `Activity::ACTIVITY_TYPES`
- Produces: ~50 activities spanning 12 weeks; relied on by Phase 3's chart and records

This task has no unit test: `seeds.rb` begins with `Activity.delete_all`, so running it inside the suite would destroy fixture data for other tests. It is verified by running it and inspecting the result, in Step 3.

- [ ] **Step 1: Replace the seed body**

In `api/db/seeds.rb`, keep the leading comment block and replace everything from `Activity.delete_all` onward:

```ruby
# Demo activities make the local dashboard useful immediately after setup, and
# back the weekly chart, streak and personal records. Deterministic on purpose:
# the production demo re-seeds nightly and should look the same each morning.
Activity.delete_all

rng = Random.new(20_260_830)

# Three build weeks then a down week, repeated, trending up. Index 11 is the
# current week. Kilometres.
weekly_volume = [ 18, 21, 24, 16, 26, 29, 32, 20, 34, 37, 28, 40 ]

easy_titles  = [ "Morning shakeout", "Riverside easy", "Canal loop", "Recovery jog", "Sunrise loop" ]
tempo_titles = [ "Park tempo", "Threshold repeats", "Progression run", "Track session" ]
long_titles  = [ "Long run", "Sunday long", "Trail long run", "Coast path long" ]
note_pool    = [ "Felt strong", "Legs heavy", "Cold and clear", "Easy effort", "Negative split", nil, nil ]

jitter = ->(value, spread) { (value * (1 + rng.rand(-spread..spread))).round(1) }

weekly_volume.each_with_index do |volume, week_index|
  week_start = Time.current.beginning_of_week - (11 - week_index).weeks

  long_km  = jitter.call(volume * 0.38, 0.08)
  tempo_km = jitter.call(volume * 0.22, 0.08)
  easy_km  = ((volume - long_km - tempo_km) / 2.0).round(1)

  sessions = [
    { day: 1, km: easy_km,  pace: 6.05, title: easy_titles.sample(random: rng),  type: "run" },
    { day: 3, km: tempo_km, pace: 5.05, title: tempo_titles.sample(random: rng), type: "run" },
    { day: 5, km: easy_km,  pace: 6.15, title: easy_titles.sample(random: rng),  type: "run" },
    { day: 6, km: long_km,  pace: 6.30, title: long_titles.sample(random: rng),  type: "run" }
  ]

  # Cross-training keeps the type badges from being uniformly "run".
  case week_index % 4
  when 1 then sessions << { day: 2, km: jitter.call(24, 0.15), pace: 2.6, title: "Recovery spin", type: "ride" }
  when 2 then sessions << { day: 0, km: jitter.call(4, 0.2), pace: 12.5, title: "Evening walk", type: "walk" }
  end

  sessions.each do |session|
    started_at = week_start + session[:day].days + rng.rand(6..8).hours + rng.rand(0..59).minutes
    next if started_at > Time.current # the current week is only partly run

    Activity.create!(
      title: session[:title],
      activity_type: session[:type],
      started_at: started_at,
      distance_km: session[:km],
      duration_minutes: (session[:km] * session[:pace]).round,
      notes: note_pool.sample(random: rng),
      kudos_count: rng.rand(0..12)
    )
  end
end

puts "Seeded #{Activity.count} activities across #{weekly_volume.size} weeks."
```

- [ ] **Step 2: Run the seed**

Run: `cd api && rbenv exec bundle exec rails db:seed`
Expected: prints a count between roughly 45 and 58.

- [ ] **Step 3: Verify the history is believable, not synthetic**

```bash
cd api && rbenv exec bundle exec rails runner '
  puts "count: #{Activity.count}"
  puts "types: #{Activity.group(:activity_type).count}"
  puts "span weeks: #{((Time.current - Activity.minimum(:started_at)) / 1.week).round}"
  puts "future rows: #{Activity.where("started_at > ?", Time.current).count}"
  puts "distinct distances: #{Activity.distinct.count(:distance_km)}"
  Activity.order(:started_at).group_by { |a| a.started_at.beginning_of_week.to_date }
          .each { |week, rows| puts "#{week}  #{rows.sum(&:distance_km).to_f.round(1)} km  (#{rows.size})" }
'
```

Expected: all three types present; span ≈ 12 weeks; **0 future rows**; distinct distances well above 10 (uniform values would mean the jitter is not working); weekly totals that rise and fall rather than climbing monotonically.

- [ ] **Step 4: Confirm nothing else regressed**

Run: `cd api && rbenv exec bundle exec rails test && rbenv exec bundle exec rubocop`
Expected: 17 runs, 0 failures; rubocop clean. Fixtures are independent of seeds, so tests are unaffected.

- [ ] **Step 5: Commit**

```bash
git add api/db/seeds.rb
git commit -m "feat(api): seed a believable 12-week training history"
```

---

## Phase-level verification

Run all of this before considering Phase 1 done:

```bash
cd /Users/dylanakpan/code/pacelog
(cd api && rbenv exec bundle exec rails test)      # expect 17 runs, 0 failures
(cd api && rbenv exec bundle exec rubocop)         # expect no offenses
(cd web && npx vitest run)                         # expect ~32 tests passing
(cd web && npx tsc -b && npm run lint && npm run build)
```

Then exercise it for real:

- [ ] Run `bin/dev` and open `http://127.0.0.1:5173/`.
- [ ] The feed shows ~50 entries, each with a date like `TUE 25 AUG`, pace as `5:58/km` (never `5.96 min/km`), duration as `31:00`, and notes where present.
- [ ] Log a **ride**, dated **three days ago**, with notes. It appears in the feed with the `ride` badge, the correct past date, and the notes line.
- [ ] Try to save with the date set to tomorrow — the form refuses without a network request. (The `max` attribute blocks it in the picker; typing the date directly exercises `validate`.)
- [ ] Stop the API (`Ctrl-C`) and reload — the feed still reports *"Can't reach the API. Start it with bin/dev…"*, not a validation message. Phase 1 must not regress the error classification.

## Notes for the executor

- `web/src/App.tsx` grows in this phase and is deliberately **not** decomposed here — that is Phase 2's job, together with the editorial redesign. Resist splitting it now; the component boundaries depend on design decisions not yet made.
- Do not restyle beyond the three small CSS rules in Task 6. Phase 2 replaces `App.css` entirely.
