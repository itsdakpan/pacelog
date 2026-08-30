import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const feed = (activities: unknown[] = [], summary = {}) => ({
  activities,
  summary: { total_distance_km: 0, weekly_distance_km: 0, activities_count: 0, ...summary },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const html = (status = 404) =>
  new Response("<!DOCTYPE html><html></html>", {
    status,
    headers: { "content-type": "text/html" },
  });

const sampleRun = {
  id: 1,
  title: "Morning run",
  activity_type: "run",
  distance_km: "5.0",
  duration_minutes: 30,
  notes: null,
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

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/run name/i), "Morning run");
  await user.type(screen.getByLabelText(/distance/i), "5");
  await user.type(screen.getByLabelText(/duration/i), "30");
}

describe("loading the feed", () => {
  it("renders activities and the summary", async () => {
    fetchMock.mockResolvedValue(
      json(feed([sampleRun], { total_distance_km: 5, weekly_distance_km: 5, activities_count: 1 })),
    );

    render(<App />);

    expect(await screen.findByText("Morning run")).toBeInTheDocument();
    expect(screen.getByText("5.0 km · 30 min · 6.00 min/km")).toBeInTheDocument();
    expect(screen.getByText("1 logged")).toBeInTheDocument();
  });

  it("explains an unreachable API instead of silently showing an empty feed", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    render(<App />);

    expect(await screen.findByText(/can't reach the api/i)).toBeInTheDocument();
    // The misleading "nothing here yet" copy must not stand in for a real failure.
    expect(screen.queryByText(/your next run starts here/i)).not.toBeInTheDocument();
  });

  it("names the port collision when another server answers", async () => {
    fetchMock.mockResolvedValue(html(404));

    render(<App />);

    expect(await screen.findByText(/another app may have claimed the port/i)).toBeInTheDocument();
  });

  it("still shows the empty state when the API genuinely has no activities", async () => {
    fetchMock.mockResolvedValue(json(feed([])));

    render(<App />);

    expect(await screen.findByText(/your next run starts here/i)).toBeInTheDocument();
  });
});

describe("saving a run", () => {
  it("posts the run and refreshes the feed", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(json(feed([])))
      .mockResolvedValueOnce(json({ activity: sampleRun }, 201))
      .mockResolvedValueOnce(
        json(feed([sampleRun], { total_distance_km: 5, weekly_distance_km: 5, activities_count: 1 })),
      );

    render(<App />);
    await screen.findByText(/your next run starts here/i);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /save activity/i }));

    expect(await screen.findByText("Morning run")).toBeInTheDocument();

    const post = fetchMock.mock.calls[1];
    expect(post[0]).toBe("/api/v1/activities");
    expect(JSON.parse(post[1].body).activity.title).toBe("Morning run");
  });

  it("clears the form after a successful save", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(json(feed([])))
      .mockResolvedValueOnce(json({ activity: sampleRun }, 201))
      .mockResolvedValueOnce(json(feed([sampleRun])));

    render(<App />);
    await screen.findByText(/your next run starts here/i);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /save activity/i }));

    await waitFor(() => expect(screen.getByLabelText(/run name/i)).toHaveValue(""));
    expect(screen.getByLabelText(/distance/i)).toHaveValue(null);
    expect(screen.getByLabelText(/duration/i)).toHaveValue(null);
  });

  it("does not POST twice when the button is double clicked", async () => {
    const user = userEvent.setup();
    let releaseSave: (value: Response) => void = () => {};
    const pendingSave = new Promise<Response>((resolve) => {
      releaseSave = resolve;
    });

    fetchMock
      .mockResolvedValueOnce(json(feed([])))
      .mockReturnValueOnce(pendingSave)
      .mockResolvedValue(json(feed([sampleRun])));

    render(<App />);
    await screen.findByText(/your next run starts here/i);

    await fillForm(user);
    const save = screen.getByRole("button", { name: /save activity/i });
    await user.click(save);
    await user.click(save);

    expect(await screen.findByRole("button", { name: /saving/i })).toBeDisabled();

    releaseSave(json({ activity: sampleRun }, 201));
    await waitFor(() => expect(screen.getByRole("button", { name: /save activity/i })).toBeEnabled());

    const posts = fetchMock.mock.calls.filter((call) => call[1]?.method === "POST");
    expect(posts).toHaveLength(1);
  });

  it("reports an unreachable API rather than blaming the user's input", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(json(feed([])))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    render(<App />);
    await screen.findByText(/your next run starts here/i);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /save activity/i }));

    expect(await screen.findByText(/can't reach the api/i)).toBeInTheDocument();
    // The old code showed this for every failure, including a dead API.
    expect(screen.queryByText(/add a title, distance, and duration/i)).not.toBeInTheDocument();
  });

  it("shows the server's validation message on a 422", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(json(feed([])))
      .mockResolvedValueOnce(json({ errors: ["Title can't be blank"] }, 422));

    render(<App />);
    await screen.findByText(/your next run starts here/i);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /save activity/i }));

    expect(await screen.findByText("Title can't be blank")).toBeInTheDocument();
  });

  it("rejects an empty distance before making a request", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(json(feed([])));

    render(<App />);
    await screen.findByText(/your next run starts here/i);

    await user.type(screen.getByLabelText(/run name/i), "Morning run");
    await user.type(screen.getByLabelText(/duration/i), "30");
    await user.click(screen.getByRole("button", { name: /save activity/i }));

    expect(await screen.findByText(/distance must be greater than 0/i)).toBeInTheDocument();
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
    const card = (await screen.findByText("Morning run")).closest("article") as HTMLElement;

    await user.click(within(card).getByRole("button"));

    expect(await screen.findByRole("button", { name: /3/ })).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/activities/1/kudos");
  });

  it("surfaces a failure instead of silently doing nothing", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(json(feed([sampleRun])))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    render(<App />);
    const card = (await screen.findByText("Morning run")).closest("article") as HTMLElement;

    await user.click(within(card).getByRole("button"));

    expect(await screen.findByText(/can't reach the api/i)).toBeInTheDocument();
  });
});
