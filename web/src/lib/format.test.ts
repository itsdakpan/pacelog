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
