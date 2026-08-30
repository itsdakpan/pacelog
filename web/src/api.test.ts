import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, createActivity, fetchFeed, giveKudos } from "./api";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const htmlResponse = (status = 404) =>
  new Response("<!DOCTYPE html><html><body>404</body></html>", {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });

const mockFetch = () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchFeed", () => {
  it("returns the parsed feed", async () => {
    mockFetch().mockResolvedValue(
      jsonResponse({
        activities: [{ id: 1, title: "Morning run" }],
        summary: { total_distance_km: 5, weekly_distance_km: 5, activities_count: 1 },
      }),
    );

    const feed = await fetchFeed();
    expect(feed.activities).toHaveLength(1);
    expect(feed.summary.total_distance_km).toBe(5);
  });

  it("requests a same-origin path so no host or port is baked into the bundle", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(jsonResponse({ activities: [], summary: {} }));

    await fetchFeed();

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/activities");
  });
});

describe("failure classification", () => {
  it("reports an unreachable API as offline, not as a validation problem", async () => {
    mockFetch().mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await createActivity({
      title: "Morning run",
      distance_km: "5",
      duration_minutes: "30",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe("offline");
    expect((error as ApiError).message).toMatch(/reach the API/i);
  });

  it("reports an HTML answer as the wrong server rather than bad input", async () => {
    // This is the portfolio's Next.js 404 page answering on the API port.
    mockFetch().mockResolvedValue(htmlResponse(404));

    const error = await createActivity({
      title: "Morning run",
      distance_km: "5",
      duration_minutes: "30",
    }).catch((caught: unknown) => caught);

    expect((error as ApiError).kind).toBe("wrong-server");
    expect((error as ApiError).message).not.toMatch(/add a title/i);
    expect((error as ApiError).message).toMatch(/another app may have claimed the port/i);
  });

  it("treats a dev-proxy 502 as the API being down, not a port collision", async () => {
    // Vite's proxy answers 502 with an HTML body when nothing is listening on
    // the API port, which is the plain "you forgot to start the API" case.
    mockFetch().mockResolvedValue(htmlResponse(502));

    const error = await fetchFeed().catch((caught: unknown) => caught);

    expect((error as ApiError).kind).toBe("offline");
    expect((error as ApiError).message).toMatch(/reach the API/i);
    expect((error as ApiError).message).not.toMatch(/claimed the port/i);
  });

  it("surfaces the server's own validation messages on a 422", async () => {
    mockFetch().mockResolvedValue(
      jsonResponse({ errors: ["Title can't be blank", "Distance km must be greater than 0"] }, 422),
    );

    const error = await createActivity({
      title: "",
      distance_km: "0",
      duration_minutes: "30",
    }).catch((caught: unknown) => caught);

    expect((error as ApiError).kind).toBe("validation");
    expect((error as ApiError).messages).toContain("Title can't be blank");
    expect((error as ApiError).message).toBe("Title can't be blank");
  });

  it("reports a 500 as a server error, not as bad input", async () => {
    mockFetch().mockResolvedValue(jsonResponse({ error: "boom" }, 500));

    const error = await fetchFeed().catch((caught: unknown) => caught);

    expect((error as ApiError).kind).toBe("http");
    expect((error as ApiError).status).toBe(500);
  });
});

describe("createActivity", () => {
  it("posts a run with a trimmed title and an ISO timestamp", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(jsonResponse({ activity: { id: 1 } }, 201));

    await createActivity({ title: "  Morning run  ", distance_km: "5.0", duration_minutes: "30" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/activities");
    expect(init.method).toBe("POST");

    const sent = JSON.parse(init.body).activity;
    expect(sent.title).toBe("Morning run");
    expect(sent.activity_type).toBe("run");
    expect(sent.distance_km).toBe("5.0");
    expect(sent.duration_minutes).toBe("30");
    expect(() => new Date(sent.started_at).toISOString()).not.toThrow();
  });
});

describe("giveKudos", () => {
  it("posts to the kudos path for the given activity", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(jsonResponse({ activity: { id: 7, kudos_count: 3 } }));

    const { activity } = await giveKudos(7);

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/activities/7/kudos");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    expect(activity.kudos_count).toBe(3);
  });
});
