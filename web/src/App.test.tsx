import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const summary = (over: Record<string, unknown> = {}) => ({
  total_distance_km: 0,
  weekly_distance_km: 0,
  activities_count: 0,
  current_streak_weeks: 0,
  records: { longest_run: null, fastest_pace: null, biggest_week: null },
  weekly_series: [],
  ...over,
});

const feed = (activities: unknown[] = [], over: Record<string, unknown> = {}) => ({
  activities,
  summary: summary({ activities_count: activities.length, ...over }),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const html = (status = 404) =>
  new Response("<!DOCTYPE html><html></html>", { status, headers: { "content-type": "text/html" } });

const sampleRun = {
  id: 1,
  title: "Morning run",
  activity_type: "run",
  started_at: "2026-08-25T06:30:00.000Z",
  distance_km: "5.0",
  duration_minutes: 30,
  notes: "Easy effort",
  kudos_count: 2,
  pace_per_km: "6.0",
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/run name/i), "Morning run");
  await user.type(screen.getByLabelText(/distance/i), "5");
  await user.type(screen.getByLabelText(/duration/i), "30");
}

const saveButton = () => screen.getByRole("button", { name: /save activity/i });

describe("loading the feed", () => {
  it("renders activities and the summary figures", async () => {
    fetchMock.mockResolvedValue(
      json(
        feed([sampleRun], {
          total_distance_km: 5,
          weekly_distance_km: 5,
          current_streak_weeks: 3,
        }),
      ),
    );

    render(<App />);

    expect(await screen.findByText("Morning run")).toBeInTheDocument();
    expect(screen.getByText("5.0 km")).toBeInTheDocument();
    expect(screen.getByText("3 wks")).toBeInTheDocument();
  });

  it("explains an unreachable API instead of silently showing an empty feed", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    render(<App />);

    expect(await screen.findByText(/can't reach the api/i)).toBeInTheDocument();
    expect(screen.queryByText(/your next run starts here/i)).not.toBeInTheDocument();
  });

  it("names the port collision when another server answers", async () => {
    fetchMock.mockResolvedValue(html(404));

    render(<App />);

    expect(await screen.findByText(/another app may have claimed the port/i)).toBeInTheDocument();
  });

  it("shows the empty state when the API genuinely has no activities", async () => {
    fetchMock.mockResolvedValue(json(feed([])));

    render(<App />);

    expect(await screen.findByText(/your next run starts here/i)).toBeInTheDocument();
  });
});

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

describe("the dashboard", () => {
  it("draws one bar per week and marks the peak", async () => {
    fetchMock.mockResolvedValue(
      json(
        feed([sampleRun], {
          weekly_series: [
            { week_start: "2026-08-10", distance_km: 20 },
            { week_start: "2026-08-17", distance_km: 60 },
            { week_start: "2026-08-24", distance_km: 40 },
          ],
        }),
      ),
    );

    render(<App />);
    await screen.findByText("Morning run");

    const chart = screen.getByLabelText(/weekly distance/i);
    expect(chart.querySelectorAll(".chart-bar")).toHaveLength(3);
    expect(chart.querySelectorAll(".chart-bar--peak")).toHaveLength(1);
  });

  it("shows personal records when the API supplies them", async () => {
    fetchMock.mockResolvedValue(
      json(
        feed([sampleRun], {
          records: {
            longest_run: { title: "Coast path long", distance_km: 10.9, started_at: sampleRun.started_at },
            fastest_pace: { title: "Park tempo", pace_per_km: 5.0, started_at: sampleRun.started_at },
            biggest_week: { week_start: "2026-08-10", distance_km: 62.8 },
          },
        }),
      ),
    );

    render(<App />);

    expect(await screen.findByText(/longest run/i)).toBeInTheDocument();
    expect(screen.getByText("10.9 km")).toBeInTheDocument();
    expect(screen.getByText("5:00/km")).toBeInTheDocument();
    expect(screen.getByText("62.8 km")).toBeInTheDocument();
  });

  it("omits the records block entirely when there are none", async () => {
    fetchMock.mockResolvedValue(json(feed([])));

    render(<App />);
    await screen.findByText(/your next run starts here/i);

    expect(screen.queryByText(/longest run/i)).not.toBeInTheDocument();
  });
});

describe("saving a run", () => {
  it("posts the run and refreshes the feed", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(json(feed([])))
      .mockResolvedValueOnce(json({ activity: sampleRun }, 201))
      .mockResolvedValueOnce(json(feed([sampleRun])));

    render(<App />);
    await screen.findByText(/your next run starts here/i);

    await fillRequiredFields(user);
    await user.click(saveButton());

    expect(await screen.findByText("Morning run")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/activities");
  });

  it("clears the form after a successful save", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(json(feed([])))
      .mockResolvedValueOnce(json({ activity: sampleRun }, 201))
      .mockResolvedValueOnce(json(feed([sampleRun])));

    render(<App />);
    await screen.findByText(/your next run starts here/i);

    await fillRequiredFields(user);
    await user.click(saveButton());

    await waitFor(() => expect(screen.getByLabelText(/run name/i)).toHaveValue(""));
    expect(screen.getByLabelText(/distance/i)).toHaveValue(null);
  });

  it("does not POST twice when the button is double clicked", async () => {
    const user = userEvent.setup();
    let release: (value: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      release = resolve;
    });

    fetchMock
      .mockResolvedValueOnce(json(feed([])))
      .mockReturnValueOnce(pending)
      .mockResolvedValue(json(feed([sampleRun])));

    render(<App />);
    await screen.findByText(/your next run starts here/i);

    await fillRequiredFields(user);
    const button = saveButton();
    await user.click(button);
    await user.click(button);

    expect(await screen.findByRole("button", { name: /saving/i })).toBeDisabled();

    release(json({ activity: sampleRun }, 201));
    await waitFor(() => expect(saveButton()).toBeEnabled());

    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === "POST")).toHaveLength(1);
  });

  it("reports an unreachable API rather than blaming the user's input", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(json(feed([]))).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    render(<App />);
    await screen.findByText(/your next run starts here/i);

    await fillRequiredFields(user);
    await user.click(saveButton());

    expect(await screen.findByText(/can't reach the api/i)).toBeInTheDocument();
    expect(screen.queryByText(/add a title, distance, and duration/i)).not.toBeInTheDocument();
  });

  it("shows the server's validation message on a 422", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(json(feed([])))
      .mockResolvedValueOnce(json({ errors: ["Title can't be blank"] }, 422));

    render(<App />);
    await screen.findByText(/your next run starts here/i);

    await fillRequiredFields(user);
    await user.click(saveButton());

    expect(await screen.findByText("Title can't be blank")).toBeInTheDocument();
  });

  it("rejects an empty distance before making a request", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(json(feed([])));

    render(<App />);
    await screen.findByText(/your next run starts here/i);

    await user.type(screen.getByLabelText(/run name/i), "Morning run");
    await user.type(screen.getByLabelText(/duration/i), "30");
    await user.click(saveButton());

    expect(await screen.findByText(/distance must be greater than 0/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === "POST")).toHaveLength(0);
  });
});

describe("logging a past ride", () => {
  it("submits the chosen type, date and notes", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(json(feed([])))
      .mockResolvedValueOnce(json({ activity: sampleRun }, 201))
      .mockResolvedValueOnce(json(feed([sampleRun])));

    render(<App />);
    await screen.findByText(/your next run starts here/i);

    await user.type(screen.getByLabelText(/run name/i), "Canal loop");
    await user.selectOptions(screen.getByLabelText(/type/i), "ride");
    await user.clear(screen.getByLabelText(/date/i));
    await user.type(screen.getByLabelText(/date/i), "2026-08-24");
    await user.type(screen.getByLabelText(/distance/i), "24");
    await user.type(screen.getByLabelText(/duration/i), "62");
    await user.type(screen.getByLabelText(/notes/i), "Windy");
    await user.click(saveButton());

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

    await user.type(screen.getByLabelText(/run name/i), "Tomorrow run");
    await user.clear(screen.getByLabelText(/date/i));
    await user.type(screen.getByLabelText(/date/i), "2099-01-01");
    await user.type(screen.getByLabelText(/distance/i), "5");
    await user.type(screen.getByLabelText(/duration/i), "30");
    await user.click(saveButton());

    expect(await screen.findByText(/can't log a run in the future/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === "POST")).toHaveLength(0);
  });
});

describe("kudos", () => {
  it("updates the count from the server response", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(json(feed([sampleRun])))
      .mockResolvedValueOnce(json({ activity: { ...sampleRun, kudos_count: 3 } }));

    render(<App />);
    const entry = (await screen.findByText("Morning run")).closest("article") as HTMLElement;

    await user.click(within(entry).getByRole("button"));

    expect(await screen.findByRole("button", { name: /3 so far/i })).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/activities/1/kudos");
  });

  it("surfaces a failure instead of silently doing nothing", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(json(feed([sampleRun])))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    render(<App />);
    const entry = (await screen.findByText("Morning run")).closest("article") as HTMLElement;

    await user.click(within(entry).getByRole("button"));

    expect(await screen.findByText(/can't reach the api/i)).toBeInTheDocument();
  });
});
